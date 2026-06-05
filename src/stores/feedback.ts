import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useFeedbackStore = defineStore('feedback', () => {
  const isOpen = ref(false)

  function open()  { isOpen.value = true  }
  function close() { isOpen.value = false }

  return { isOpen, open, close }
})
