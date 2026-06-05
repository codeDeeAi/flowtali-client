<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useFeedbackStore } from '@/stores/feedback'
import { FeedbackService } from '@/services/feedback.service'

const feedbackStore = useFeedbackStore()
const authStore     = useAuthStore()
const route         = useRoute()

type FeedbackType = 'general' | 'bug' | 'feature' | 'other'

const types: { id: FeedbackType; label: string; icon: string; desc: string }[] = [
  { id: 'general', label: 'General',         icon: 'lucide:message-circle', desc: 'Share a thought or comment' },
  { id: 'bug',     label: 'Bug Report',      icon: 'lucide:bug',            desc: 'Something isn\'t working' },
  { id: 'feature', label: 'Feature Request', icon: 'lucide:lightbulb',      desc: 'Suggest an improvement' },
  { id: 'other',   label: 'Other',           icon: 'lucide:more-horizontal', desc: 'Anything else' },
]

const selectedType = ref<FeedbackType>('general')
const message      = ref('')
const rating       = ref<number | null>(null)
const submitting   = ref(false)
const submitted    = ref(false)
const error        = ref<string | null>(null)

const canSubmit = computed(() => message.value.trim().length >= 5 && !submitting.value)

function selectRating(n: number) {
  rating.value = rating.value === n ? null : n
}

async function submit() {
  if (!canSubmit.value) return
  submitting.value = true
  error.value = null
  try {
    await FeedbackService.submit({
      type:            selectedType.value,
      message:         message.value.trim(),
      rating:          rating.value,
      page_url:        window.location.href,
      organization_id: authStore.getCurrentOrganization?.id ?? null,
      metadata: {
        user_agent:  navigator.userAgent,
        screen:      `${window.screen.width}x${window.screen.height}`,
        route_name:  route.name as string ?? '',
      },
    })
    submitted.value = true
  } catch {
    error.value = 'Something went wrong. Please try again.'
  } finally {
    submitting.value = false
  }
}

function reset() {
  selectedType.value = 'general'
  message.value      = ''
  rating.value       = null
  submitted.value    = false
  error.value        = null
}

function close() {
  feedbackStore.close()
  setTimeout(reset, 300)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="feedback-fade">
      <div
        v-if="feedbackStore.isOpen"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-6"
        @click.self="close"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm sm:hidden" @click="close" />

        <!-- Panel -->
        <div class="relative w-full sm:w-[400px] bg-charcoal-800 border border-charcoal-600 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden feedback-panel">

          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-charcoal-700">
            <div>
              <h3 class="text-cream text-sm font-semibold">Share feedback</h3>
              <p class="text-cream-faint text-xs mt-0.5">We read every submission</p>
            </div>
            <button @click="close" class="text-cream-faint hover:text-cream transition-colors p-1 rounded-lg hover:bg-charcoal-700">
              <Icon icon="lucide:x" class="w-4 h-4" />
            </button>
          </div>

          <!-- Success state -->
          <div v-if="submitted" class="flex flex-col items-center justify-center py-12 px-6 text-center gap-4">
            <div class="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <Icon icon="lucide:check" class="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p class="text-cream font-medium text-sm">Thanks for the feedback!</p>
              <p class="text-cream-faint text-xs mt-1">It helps us make Flowtali better.</p>
            </div>
            <button
              @click="close"
              class="mt-2 text-xs text-amber hover:underline"
            >
              Close
            </button>
          </div>

          <!-- Form -->
          <div v-else class="p-5 flex flex-col gap-5">

            <!-- Type selector -->
            <div>
              <p class="text-xs font-medium text-cream-faint uppercase tracking-wider mb-2.5">Type</p>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="t in types" :key="t.id"
                  @click="selectedType = t.id"
                  class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all"
                  :class="selectedType === t.id
                    ? 'bg-amber/10 border-amber/40 text-cream'
                    : 'border-charcoal-600 text-cream-muted hover:border-charcoal-500 hover:text-cream bg-charcoal-900/40'"
                >
                  <Icon :icon="t.icon" class="w-3.5 h-3.5 shrink-0" :class="selectedType === t.id ? 'text-amber' : ''" />
                  <div>
                    <div class="text-xs font-medium leading-none">{{ t.label }}</div>
                    <div class="text-[10px] text-cream-faint mt-0.5 leading-none">{{ t.desc }}</div>
                  </div>
                </button>
              </div>
            </div>

            <!-- Rating -->
            <div>
              <p class="text-xs font-medium text-cream-faint uppercase tracking-wider mb-2.5">
                Overall rating <span class="normal-case text-cream-faint/60">(optional)</span>
              </p>
              <div class="flex items-center gap-2">
                <button
                  v-for="n in 5" :key="n"
                  @click="selectRating(n)"
                  class="text-xl transition-transform hover:scale-110 leading-none"
                  :class="rating !== null && n <= rating ? 'text-amber' : 'text-charcoal-500 hover:text-amber/60'"
                >
                  ★
                </button>
                <span v-if="rating" class="text-xs text-cream-faint ml-1">{{ ['','Awful','Poor','Okay','Good','Great!'][rating] }}</span>
              </div>
            </div>

            <!-- Message -->
            <div>
              <p class="text-xs font-medium text-cream-faint uppercase tracking-wider mb-2">Message</p>
              <textarea
                v-model="message"
                rows="4"
                maxlength="2000"
                placeholder="Tell us what's on your mind…"
                class="app-inp text-sm resize-none w-full"
              />
              <div class="flex justify-between mt-1">
                <span v-if="error" class="text-xs text-red-400">{{ error }}</span>
                <span class="text-[10px] text-cream-faint/50 ml-auto">{{ message.length }}/2000</span>
              </div>
            </div>

            <!-- Submit -->
            <button
              @click="submit"
              :disabled="!canSubmit"
              class="w-full bg-amber hover:bg-amber-light text-charcoal-900 font-semibold text-sm py-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg v-if="submitting" class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>
              {{ submitting ? 'Sending…' : 'Send feedback' }}
            </button>

          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.feedback-panel {
  max-height: 90vh;
  overflow-y: auto;
}

.feedback-fade-enter-active,
.feedback-fade-leave-active {
  transition: opacity 0.2s ease;
}
.feedback-fade-enter-active .feedback-panel,
.feedback-fade-leave-active .feedback-panel {
  transition: transform 0.25s ease, opacity 0.2s ease;
}
.feedback-fade-enter-from,
.feedback-fade-leave-to {
  opacity: 0;
}
.feedback-fade-enter-from .feedback-panel,
.feedback-fade-leave-to .feedback-panel {
  transform: translateY(24px);
  opacity: 0;
}
</style>
