<script setup lang="ts">

type AlertType = 'info' | 'danger' | 'success' | 'warning' | 'dark';

const props = defineProps({
  type: {
    type: String as () => AlertType,
    required: false,
    default: 'success'
  }
});
</script>
<template>
  <div :class="{
    'bg-blue-50 text-blue-800': props.type === 'info',
    'bg-red-50 text-red-800': props.type === 'danger',
    'bg-green-50 text-green-800': props.type === 'success',
    'bg-yellow-50 text-yellow-800': props.type === 'warning',
    'bg-gray-100 text-gray-800': props.type === 'dark'
  }" class="p-3 text-sm rounded-xl" role="alert" v-bind="$attrs">
    <slot />
  </div>
</template>
