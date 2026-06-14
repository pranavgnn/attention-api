import { create } from "zustand";
import { StorageSchema } from "../shared/types";
import { getStorage } from "../shared/storage";

interface AppState {
  data: StorageSchema | null;
  fetchData: () => Promise<void>;
}

export const useStore = create<AppState>((set) => ({
  data: null,
  fetchData: async () => {
    const storage = await getStorage();
    set({ data: storage });
  },
}));