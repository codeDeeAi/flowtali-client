<script setup lang="ts">
import { ref } from 'vue'
import { Dialog, DialogPanel, DialogTitle, DialogDescription } from '@headlessui/vue'

defineProps({
  title: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
  titleClass: {
    type: String,
    default: 'font-bold text-lg mb-2',
  },
  descriptionClass: {
    type: String,
    default: 'text-sm text-gray-500 mb-4',
  },
  panelClass: {
    type: String,
    default: 'w-full max-w-md rounded-lg bg-white p-6 shadow-xl',
  },
})

const isOpen = ref<boolean>(false)

const setIsOpen = (value: boolean) => {
  isOpen.value = value
}

const toggleIsOpen = () => {
  isOpen.value = !isOpen.value
}

defineExpose({ setIsOpen, toggleIsOpen })
</script>
<template>
  <Dialog :open="isOpen" @close="setIsOpen(false)" class="relative z-50" v-bind="$attrs">
    <div class="fixed inset-0 bg-black/30" aria-hidden="true" />

    <div class="fixed inset-0 flex w-screen items-center justify-center p-4 overflow-auto">
      <DialogPanel :class="panelClass">
        <slot name="title">
          <DialogTitle v-if="title" :class="titleClass">
            {{ title }}
          </DialogTitle>
        </slot>

        <slot name="description">
          <DialogDescription v-if="description" :class="descriptionClass">
            {{ description }}
          </DialogDescription>
        </slot>

        <div class="mt-2">
          <slot />
        </div>

        <div v-if="$slots.footer" class="mt-6 flex justify-end gap-3">
          <slot name="footer" :close="() => setIsOpen(false)" />
        </div>
      </DialogPanel>
    </div>
  </Dialog>
</template>
