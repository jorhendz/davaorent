"use client";

import { createContext, useContext } from "react";

export type AdminStats = {
  users: number;
  renters: number;
  owners: number;
  listings: number;
  published: number;
  pendingReview: number;
  verified: number;
  inquiries: number;
  viewings: number;
  applications: number;
  confirmedRentals: number;
  openReports: number;
  byCategory: { category: string; count: number }[];
  byStatus: { status: string; count: number }[];
  byDistrict: { district: string; count: number }[];
  weekly: { label: string; listings: number; users: number }[];
  recentListings: { id: string; title: string; status: string; price: number; priceUnit?: string; createdAt: string; owner: { name: string } }[];
  recentUsers: { id: string; name: string; email: string; role: string; createdAt: string }[];
};

export const AdminContext = createContext<{ stats: AdminStats | null; refreshStats: () => void }>({
  stats: null,
  refreshStats: () => {},
});

export const useAdmin = () => useContext(AdminContext);
