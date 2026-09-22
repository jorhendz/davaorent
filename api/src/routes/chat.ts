import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { buildSystemPrompt, ASSISTANT_NAME } from "../lib/knowledge";
import { CHAT_TOOLS, runChatTool } from "../lib/chat-tools";
import { AuthRequest, optionalAuth } from "../middleware/auth";
import { faqAnswer } from "../lib/faq-fallback";

const router = Router();

const MODEL = "claude-opus-5";
const MAX_TOOL_ROUNDS = 4;
const MAX_HISTORY = 20; // turns kept from the client (cost + latency guard)
const MAX_CHARS = 2000; // per message

const hasApiKey = () => !!process.env.ANTHROPIC_API_KEY;
let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(MAX_CHARS),
      })
    )
    .min(1)
    .max(60),
});

router.get("/health", (_req, res) => {
  res.json({ ok: true, assistant: ASSISTANT_NAME, mode: hasApiKey() ? "ai" : "faq" });
});

router.post("/", optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const { messages: raw } = chatSchema.parse(req.body);
    const history = raw.slice(-MAX_HISTORY);
    // A conversation must start with a user turn.
    while (history.length && history[0].role === "assistant") history.shift();
    if (!history.length) return res.status(400).json({ error: "No user message provided" });

    const lastUser = [...history].reverse().find((m) => m.role === "user")?.content ?? "";

    // No API key configured → keyword FAQ, so the widget still helps.
    if (!hasApiKey()) {
      return res.json({ reply: faqAnswer(lastUser), mode: "faq" });
    }

    const messages: Anthropic.MessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));
    const userId = req.user?.id;
    const usedTools: string[] = [];

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const response = await getClient().messages.create({
        model: MODEL,
        max_tokens: 1200,
        // Support chat is a routine, latency-sensitive workload — low effort keeps
        // replies fast and cheap without changing models.
        output_config: { effort: "low" },
        system: [
          { type: "text", text: buildSystemPrompt(), cache_control: { type: "ephemeral" } },
          {
            type: "text",
            text: userId
              ? `The user is signed in (role: ${req.user?.role}). You may call get_my_activity for their own data.`
              : "The user is NOT signed in, so get_my_activity returns nothing — ask them to log in at /login first.",
          },
        ],
        messages,
        tools: CHAT_TOOLS,
      });

      if (response.stop_reason === "refusal") {
        return res.json({
          reply:
            "Sorry, I can't help with that one. If it's about your DavaoRent account, email hello@davaorent.com and a person will help.",
          mode: "ai",
        });
      }

      if (response.stop_reason !== "tool_use" || round === MAX_TOOL_ROUNDS) {
        const reply = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();
        return res.json({
          reply: reply || "Sorry, I didn't catch that — could you rephrase?",
          mode: "ai",
          usedTools,
        });
      }

      // Run every requested tool, then return all results in one user message.
      const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      const results: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolUses.map(async (tu) => {
          usedTools.push(tu.name);
          try {
            const out = await runChatTool(tu.name, tu.input, userId);
            return { type: "tool_result" as const, tool_use_id: tu.id, content: JSON.stringify(out) };
          } catch (err) {
            console.error(`chat tool ${tu.name} failed:`, err);
            return {
              type: "tool_result" as const,
              tool_use_id: tu.id,
              content: "Lookup failed. Tell the user you couldn't reach the listings right now.",
              is_error: true,
            };
          }
        })
      );

      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: results });
    }

    res.json({ reply: "Sorry, that took too long. Could you try asking a simpler question?", mode: "ai" });
  } catch (e) {
    if (e instanceof Anthropic.APIError) {
      console.error("chat API error:", e.status, e.message);
      // Never leave the user stranded — fall back to a keyword answer.
      const last = Array.isArray(req.body?.messages)
        ? [...req.body.messages].reverse().find((m: any) => m?.role === "user")?.content ?? ""
        : "";
      return res.json({ reply: faqAnswer(String(last)), mode: "faq", degraded: true });
    }
    next(e);
  }
});

export default router;
