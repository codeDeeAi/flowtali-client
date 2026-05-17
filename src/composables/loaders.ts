import { ref, computed } from 'vue'

export function useLoaders() {
  const allLoaders = ref<Record<string, boolean>>({});

  const initLoaders = (loaders: Record<string, boolean>) => {
    allLoaders.value = loaders;
  };

  const setLoader = (key: string, value: boolean = false) => {
    allLoaders.value[key] = value;
  };

  const getLoader = (key: string): boolean => {
    return computed(() => allLoaders.value[key] || false).value;
  };

  return {
    allLoaders,
    initLoaders,
    setLoader,
    getLoader
  }
}
