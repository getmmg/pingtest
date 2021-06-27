import { createContext, useContext } from "react";
import ApiStore from "./apiStore";

interface Store {
  apiStore: ApiStore;
}

export const store: Store = {
  apiStore: new ApiStore(),
};

export const StoreContext = createContext(store);

export function useStore() {
  return useContext(StoreContext);
}
