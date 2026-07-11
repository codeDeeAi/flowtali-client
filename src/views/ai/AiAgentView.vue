<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '@/stores/auth'
import { usePermissions } from '@/composables/usePermissions'
import { AiService } from '@/services/ai.service'
import type { IAiChatMessage } from '@/types/ai.types'

const { t, tm, rt, locale } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const { can } = usePermissions()

const orgId = computed(() => authStore.currentOrganization?.id ?? '')
const canSetup = computed(() => can('settings.update'))

type ViewState = 'checking' | 'setup' | 'ready'
const state = ref<ViewState>('checking')

const messages = ref<IAiChatMessage[]>([])
const input = ref('')
const sending = ref(false)
const modelLabel = ref('')
const scroller = ref<HTMLElement | null>(null)

const suggestions = computed(() => (tm('ai.agent.suggestions') as unknown[]) ?? [])
const canSend = computed(() => input.value.trim().length > 0 && !sending.value)

async function scrollToBottom() {
  await nextTick()
  scroller.value?.scrollTo({ top: scroller.value.scrollHeight, behavior: 'smooth' })
}

async function checkStatus() {
  state.value = 'checking'
  try {
    const { data } = await AiService.status(orgId.value)
    if (data.data.configured) {
      modelLabel.value = data.data.model ?? ''
      state.value = 'ready'
    } else {
      state.value = 'setup'
    }
  } catch {
    // If status can't be read, fail open to the chat — a failed send will still
    // surface the not-configured state.
    state.value = 'ready'
  }
}

async function send(text?: string) {
  const content = (text ?? input.value).trim()
  if (!content || sending.value) return

  messages.value.push({ role: 'user', content })
  input.value = ''
  sending.value = true
  await scrollToBottom()

  try {
    const { data } = await AiService.chat(orgId.value, messages.value, locale.value)
    modelLabel.value = data.data.model
    messages.value.push({ role: 'assistant', content: data.data.reply })
  } catch (e: unknown) {
    const err = e as { response?: { status?: number; data?: { data?: { not_configured?: boolean; invalid_model?: boolean }; message?: string } } }
    const body = err.response?.data
    if (err.response?.status === 409 && body?.data?.not_configured) {
      messages.value = []      // clear the conversation and drop to the setup screen
      state.value = 'setup'
    } else if (body?.data?.invalid_model && body.message) {
      // Provider rejected the selected model — show the actionable message.
      messages.value.push({ role: 'assistant', content: body.message })
    } else {
      messages.value.push({ role: 'assistant', content: t('ai.agent.error') })
    }
  } finally {
    sending.value = false
    await scrollToBottom()
  }
}

function onEnter(e: KeyboardEvent) {
  if (e.shiftKey) return
  e.preventDefault()
  send()
}

function newChat() {
  messages.value = []
}

function goToSetup() {
  router.push({ name: 'settings', query: { tab: 'ai' } })
}

onMounted(checkStatus)
</script>

<template>
  <div class="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto w-full">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-300">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-green-700/10 border border-green-700/20 flex items-center justify-center">
          <Icon icon="lucide:sparkles" class="w-4 h-4 text-green-700" />
        </div>
        <div>
          <h1 class="text-sm font-semibold text-gray-1000 leading-tight">{{ t('ai.agent.title') }}</h1>
          <p class="text-[11px] text-gray-700 leading-tight">
            {{ state === 'ready' && modelLabel ? t('ai.agent.poweredBy', { model: modelLabel }) : t('ai.agent.subtitle') }}
          </p>
        </div>
      </div>
      <button v-if="state === 'ready' && messages.length" type="button" class="btn-ghost inline-flex items-center justify-center gap-1.5 text-[12px] px-3 py-1.5" @click="newChat">
        <Icon icon="lucide:plus" class="w-3.5 h-3.5" />
        {{ t('ai.agent.newChat') }}
      </button>
    </div>

    <!-- Checking status -->
    <div v-if="state === 'checking'" class="flex-1 flex items-center justify-center">
      <div class="flex items-center gap-2 text-[13px] text-gray-700">
        <Icon icon="lucide:loader-2" class="w-4 h-4 animate-spin" />
        {{ t('ai.agent.checking') }}
      </div>
    </div>

    <!-- Not set up -->
    <div v-else-if="state === 'setup'" class="flex-1 flex flex-col items-center justify-center text-center px-6">
      <div class="w-14 h-14 rounded-2xl bg-green-700/10 border border-green-700/20 flex items-center justify-center mb-5">
        <Icon icon="lucide:key-round" class="w-7 h-7 text-green-700" />
      </div>
      <h2 class="text-lg font-semibold text-gray-1000">{{ t('ai.agent.setupTitle') }}</h2>
      <p class="text-[13px] text-gray-700 mt-2 max-w-md leading-relaxed">{{ t('ai.agent.setupBody') }}</p>

      <button v-if="canSetup" type="button" class="btn-primary inline-flex items-center justify-center gap-1.5 text-[13px] px-5 py-2.5 mt-6" @click="goToSetup">
        <Icon icon="lucide:sparkles" class="w-4 h-4" />
        {{ t('ai.agent.setupCta') }}
      </button>
      <p v-else class="text-[12px] text-gray-700 mt-6 max-w-sm">{{ t('ai.agent.setupAdminNote') }}</p>

      <!-- Provider marks, subtle -->
      <div class="flex items-center gap-4 mt-8 opacity-60">
        <Icon icon="simple-icons:anthropic" class="w-5 h-5 text-gray-700" />
        <Icon icon="simple-icons:openai" class="w-5 h-5 text-gray-700" />
        <Icon icon="simple-icons:googlegemini" class="w-5 h-5 text-gray-700" />
      </div>
    </div>

    <!-- Ready: chat -->
    <template v-else>
      <div ref="scroller" class="flex-1 overflow-y-auto px-4 py-6">
        <!-- Empty state -->
        <div v-if="!messages.length" class="h-full flex flex-col items-center justify-center text-center">
          <div class="w-12 h-12 rounded-2xl bg-green-700/10 border border-green-700/20 flex items-center justify-center mb-4">
            <Icon icon="lucide:sparkles" class="w-6 h-6 text-green-700" />
          </div>
          <h2 class="text-base font-semibold text-gray-1000">{{ t('ai.agent.emptyTitle') }}</h2>
          <p class="text-[12.5px] text-gray-700 mt-1 max-w-md">{{ t('ai.agent.emptyBody') }}</p>

          <div class="grid sm:grid-cols-2 gap-2 mt-6 w-full max-w-lg">
            <button
              v-for="(s, i) in suggestions"
              :key="i"
              type="button"
              class="text-left rounded-xl border border-gray-400 bg-gray-100 hover:border-gray-500 p-3 text-[12px] text-gray-900 transition"
              @click="send(rt(s as string))"
            >
              {{ rt(s as string) }}
            </button>
          </div>
        </div>

        <!-- Conversation -->
        <div v-else class="space-y-5">
          <div v-for="(m, i) in messages" :key="i" class="flex gap-3" :class="m.role === 'user' ? 'flex-row-reverse' : ''">
            <div
              class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              :class="m.role === 'user' ? 'bg-gray-300' : 'bg-green-700/10 border border-green-700/20'"
            >
              <Icon :icon="m.role === 'user' ? 'lucide:user' : 'lucide:sparkles'" class="w-3.5 h-3.5" :class="m.role === 'user' ? 'text-gray-1000' : 'text-green-700'" />
            </div>
            <div
              class="rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap max-w-[80%]"
              :class="m.role === 'user' ? 'bg-gray-300 text-gray-1000' : 'bg-gray-200 border border-gray-400 text-gray-1000'"
            >{{ m.content }}</div>
          </div>

          <!-- Typing indicator -->
          <div v-if="sending" class="flex gap-3">
            <div class="w-7 h-7 rounded-lg bg-green-700/10 border border-green-700/20 flex items-center justify-center flex-shrink-0">
              <Icon icon="lucide:sparkles" class="w-3.5 h-3.5 text-green-700" />
            </div>
            <div class="rounded-2xl px-3.5 py-3 bg-gray-200 border border-gray-400 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-gray-700 animate-bounce" style="animation-delay:0ms"></span>
              <span class="w-1.5 h-1.5 rounded-full bg-gray-700 animate-bounce" style="animation-delay:150ms"></span>
              <span class="w-1.5 h-1.5 rounded-full bg-gray-700 animate-bounce" style="animation-delay:300ms"></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Composer -->
      <div class="px-4 py-3 border-t border-gray-300">
        <div class="flex items-end gap-2 rounded-2xl border border-gray-400 bg-gray-100 px-3 py-2 focus-within:border-green-700 transition">
          <textarea
            v-model="input"
            rows="1"
            :placeholder="t('ai.agent.inputPlaceholder')"
            class="composer-input flex-1 bg-transparent resize-none outline-none text-[13px] text-gray-1000 placeholder:text-gray-700 max-h-40 py-1"
            @keydown.enter="onEnter"
          />
          <button
            type="button"
            class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition"
            :class="canSend ? 'bg-green-700 text-black hover:bg-green-800' : 'bg-gray-300 text-gray-700 cursor-not-allowed'"
            :disabled="!canSend"
            @click="send()"
          >
            <Icon icon="lucide:arrow-up" class="w-4 h-4" />
          </button>
        </div>
        <p class="text-[10px] text-gray-700 mt-1.5 text-center">{{ t('ai.agent.disclaimer') }}</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* The global `:focus-visible` rule in main.css is unlayered, so it beats
   Tailwind's layered focus utilities. Suppress the textarea's own box-shadow
   ring here — the wrapper's `focus-within` border is the intended affordance. */
.composer-input:focus,
.composer-input:focus-visible {
  box-shadow: none !important;
  outline: none !important;
}
</style>
