<template>
  <div class="flex gap-2">
    <span v-for="index in props.ballCount" :key="index" class="size-1.5 rounded-full animate-bounce" :style="{
      backgroundColor: props.color,
      animationDelay: getDelay(index)
    }"></span>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  color: {
    type: String,
    required: false,
    default: '#0EC191'
  },
  ballCount: {
    type: Number,
    required: false,
    default: 3
  },
  random: {
    type: Boolean,
    required: false,
    default: false
  }
});

const getDelay = (index: number) => {
  if (props.random) {
    return `${Math.random() * 0.5}s`;
  }

  return `${(index - 1) * 0.15}s`;
};
</script>
