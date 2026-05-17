import { defineStore } from 'pinia';
import type { TLoaders } from '@/types/global-loaders';

interface State {
  loaders: Record<TLoaders, boolean>;
}

export const useGlobalLoaderStore = defineStore('global-loader', {
  state: (): State => ({
    loaders: {} as Record<TLoaders, boolean>
  }),
  getters: {
    getLoaders: (state) => state.loaders,
    isAnyLoaderActive: (state) => {
      for (const key in state.loaders) {
        if (Object.prototype.hasOwnProperty.call(state.loaders, key)) {
          const loadingState = state.loaders[key as TLoaders];

          if (loadingState == true) return true;
        }
      }

      return false;
    }
  },
  actions: {
    setLoader(key: TLoaders, value: boolean) {
      this.loaders[key] = value;
    }
  },
});
