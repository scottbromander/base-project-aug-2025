import { create } from "zustand";

export type Item = { id: number; name: string };

type State = {
  items: Item[];
  loading: boolean;
  error: string | null;
  fetchItems: () => Promise<void>;
  addItem: (name: string) => Promise<void>;
};

const API = (import.meta.env.VITE_API_URL as string) || "http://localhost:8000";

export const useItemsStore = create<State>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchItems: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API}/api/items`);
      if (!res.ok) throw new Error(`GET /api/items failed: ${res.status}`);
      const data = (await res.json()) as Item[];
      set({ items: data });
    } catch (e: any) {
      set({ error: e.message ?? "Failed to fetch items" });
    } finally {
      set({ loading: false });
    }
  },

  addItem: async (name: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API}/api/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(`POST /api/items failed: ${res.status}`);
      const created = (await res.json()) as Item;
      // optimistic update
      set({ items: [...get().items, created] });
    } catch (e: any) {
      set({ error: e.message ?? "Failed to add item" });
    } finally {
      set({ loading: false });
    }
  },
}));
