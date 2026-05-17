<script setup lang="ts">
import type { Component } from 'vue';
import { useRoute } from 'vue-router'
import { shallowRef, watch } from 'vue';
import AppLayout from '@/layout/AppLayout.vue';
import { layouts, type TLayout } from './types/layout';
import DefaultLayout from '@/layout/DefaultLayout.vue';
import PublicLayout from '@/layout/PublicLayout.vue';
import { useGlobalLoaderStore } from '@/stores/global-loaders';
import BasicPageLoader from '@/components/loaders/BasicPageLoader.vue';

const route = useRoute();
const loaders = useGlobalLoaderStore();

const currentLayout = shallowRef<Component>(DefaultLayout);

watch(
  () => route.meta.layout,
  (layoutMeta) => {

    const layoutKey = (layoutMeta || layouts.Default) as TLayout;

    switch (layoutKey) {
      case layouts.App:
        currentLayout.value = AppLayout;
        break;
      case layouts.Public:
        currentLayout.value = PublicLayout;
        break;
      default:
        currentLayout.value = DefaultLayout;
    }
  },
  { immediate: true }
);
</script>

<template>
  <BasicPageLoader v-if="loaders.isAnyLoaderActive" />

  <component :is="currentLayout">
  </component>
</template>

<style scoped></style>
