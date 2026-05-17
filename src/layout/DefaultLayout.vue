<script setup lang="ts">
import { RouterView } from 'vue-router';
import AppHeader from './components/default/AppHeader.vue';
import AppFooter from './components/default/AppFooter.vue';
</script>
<template>
  <AppHeader />

  <RouterView />

  <AppFooter />
</template>
