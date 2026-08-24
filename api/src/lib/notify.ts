import { prisma } from "./prisma";

// Fire-and-forget in-app notification. Never lets a notification failure
// break the request that triggered it.
export async function notify(
  userId: string,
  type: string,
  title: string,
  body: string,
  link?: string
): Promise<void> {
  try {
    await prisma.notification.create({ data: { userId, type, title, body, link } });
  } catch (e) {
    console.error("notify failed:", e);
  }
}
