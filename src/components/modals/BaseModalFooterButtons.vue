<script setup lang="ts">
import BouncingButtonLoader from '@/components/loaders/BouncingButtonLoader.vue'

const props = defineProps({
  isLoading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['confirm', 'close'])
</script>
<template>
  <div class="flex justify-end gap-2 mx-2 align-middle">
    <button type="button"
      class="py-2 px-5 text-orange-500 rounded-lg hover:text-orange-500 hover:border hover:border-orange-500 flex items-center justify-center gap-2 my-auto disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
      :disabled="isLoading" @click="emit('close')">
      Close
    </button>
    <button type="button"
      class="!py-2 !px-5 bg-orange-500 text-white rounded-lg hover:text-orange-500 hover:bg-white border hover:border-orange-500 flex items-center justify-center gap-2 my-auto disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
      :disabled="props.isLoading" @click="emit('confirm')">
      <span v-if="!props.isLoading">Confirm</span>
      <BouncingButtonLoader :random="false" color="#fff" v-else />
    </button>
  </div>
</template>
