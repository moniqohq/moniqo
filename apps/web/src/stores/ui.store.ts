"use client";

import { create } from "zustand";

interface UIStore {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  activeBudgetId: string;
  toggleSidebar: () => void;
  setMobileSidebar: (open: boolean) => void;
  setActiveBudget: (id: string) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  activeBudgetId: "b1",

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  setMobileSidebar: (open) => set({ mobileSidebarOpen: open }),

  setActiveBudget: (id) => set({ activeBudgetId: id }),
}));
