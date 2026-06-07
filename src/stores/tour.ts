import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useTourStore = defineStore(
  'tour-store',
  () => {
    const seenWelcomeByUsers = ref<string[]>([])
    const isTourActive = ref(false)
    const currentStep = ref(0)

    function hasSeenWelcome(userEmail: string): boolean {
      return seenWelcomeByUsers.value.includes(userEmail)
    }

    function markWelcomeSeen(userEmail: string) {
      if (!seenWelcomeByUsers.value.includes(userEmail)) {
        seenWelcomeByUsers.value.push(userEmail)
      }
    }

    function startTour() {
      isTourActive.value = true
      currentStep.value = 0
    }

    function endTour() {
      isTourActive.value = false
      currentStep.value = 0
    }

    function nextStep(totalSteps: number) {
      if (currentStep.value < totalSteps - 1) {
        currentStep.value++
      } else {
        endTour()
      }
    }

    function prevStep() {
      if (currentStep.value > 0) currentStep.value--
    }

    return {
      seenWelcomeByUsers,
      isTourActive,
      currentStep,
      hasSeenWelcome,
      markWelcomeSeen,
      startTour,
      endTour,
      nextStep,
      prevStep,
    }
  },
  { persist: true },
)
