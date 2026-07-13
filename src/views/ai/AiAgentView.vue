<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '@/stores/auth'
import { usePermissions } from '@/composables/usePermissions'
import { AiService } from '@/services/ai.service'
import { renderMarkdown } from '@/services/utils/markdown'
import AiConfirmActionModal from './AiConfirmActionModal.vue'
import AiChatSidebar from './AiChatSidebar.vue'
import type { IAiChatListItem, IAiChatMessage, IAiPendingAction, IAiReference, IAiReferenceLink } from '@/types/ai.types'

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
const composer = ref<HTMLTextAreaElement | null>(null)
const errored = ref(false)              // last exchange failed → offer retry
const copiedIndex = ref<number | null>(null)

// Actions the agent prepared this turn, awaiting the user's confirmation.
const pendingActions = ref<IAiPendingAction[]>([])
const actionBusy = ref(false)
const currentAction = computed(() => pendingActions.value[0] ?? null)

// Chat history (per user, saved server-side, auto-pruned after 14 days).
const chats = ref<IAiChatListItem[]>([])
const currentChatId = ref<string | null>(null)
const sidebarOpen = ref(false)          // mobile drawer
const retentionDays = ref(14)
const chatsCursor = ref<string | null>(null)   // next-page cursor (null = no more)
const loadingMoreChats = ref(false)

const suggestions = computed(() => (tm('ai.agent.suggestions') as unknown[]) ?? [])
const canSend = computed(() => input.value.trim().length > 0 && !sending.value)

// Categorized example prompts shown in the "More examples" modal.
const showExamples = ref(false)
const suggestionGroups = computed(() =>
  (tm('ai.agent.suggestionGroups') as { label: unknown; items: unknown[] }[]).map((g) => ({
    label: rt(g.label as string),
    items: (g.items as string[]).map((it) => rt(it)),
  })),
)
function pickSuggestion(text: string) {
  showExamples.value = false
  send(text)
}

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
  await deliver()
}

// Send the current conversation and append the reply. On a recoverable failure
// the trailing user message is left in place and `errored` flips so the user can
// retry the exact same exchange.
async function deliver() {
  errored.value = false
  sending.value = true
  await scrollToBottom()

  try {
    const outgoing = messages.value.map((m) => ({ role: m.role, content: m.content }))
    const { data } = await AiService.chat(orgId.value, outgoing, locale.value)
    modelLabel.value = data.data.model
    messages.value.push({
      role: 'assistant',
      content: data.data.reply,
      links: resolveLinks(data.data.references),
    })
    // Surface any prepared actions for confirmation.
    if (data.data.pending_actions?.length) {
      pendingActions.value = [...data.data.pending_actions]
    }
    void persist()
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
      errored.value = true     // transient failure → show retry
    }
  } finally {
    sending.value = false
    await scrollToBottom()
  }
}

// Retry the failed exchange (the trailing user message is still in place).
function retry() {
  if (sending.value) return
  deliver()
}

// Run the front-of-queue action after the user confirms it in the modal.
async function confirmAction() {
  const action = currentAction.value
  if (!action || actionBusy.value) return
  actionBusy.value = true
  try {
    const { data } = await AiService.executeAction(orgId.value, action.name, action.args)
    const result = data.data.result
    let content = result.error ?? result.message ?? t('ai.confirm.done')
    if (result.url) content += `\n\n[${t('ai.confirm.openLink')}](${result.url})`
    else if (result.link) content += `\n\n[${t('ai.confirm.view')}](${result.link})`
    messages.value.push({ role: 'assistant', content })
  } catch {
    messages.value.push({ role: 'assistant', content: t('ai.confirm.failed') })
  } finally {
    actionBusy.value = false
    pendingActions.value.shift()   // advance to the next queued action (usually none)
    void persist()
    await scrollToBottom()
  }
}

// Dismiss all prepared actions without running them.
function cancelActions() {
  if (actionBusy.value) return
  pendingActions.value = []
  messages.value.push({ role: 'assistant', content: t('ai.confirm.cancelled') })
  void persist()
}

// ── Chat history ──────────────────────────────────────────────────────────
// Load the first page of chats (resets any loaded pages).
async function loadChats() {
  try {
    const { data } = await AiService.listChats(orgId.value)
    chats.value = data.data.chats
    chatsCursor.value = data.data.next_cursor
    retentionDays.value = data.data.retention_days
  } catch {
    // Non-fatal — the chat still works without history.
  }
}

// Append the next page of older chats.
async function loadMoreChats() {
  if (!chatsCursor.value || loadingMoreChats.value) return
  loadingMoreChats.value = true
  try {
    const { data } = await AiService.listChats(orgId.value, chatsCursor.value)
    chats.value = [...chats.value, ...data.data.chats]
    chatsCursor.value = data.data.next_cursor
  } catch {
    /* ignore — user can retry */
  } finally {
    loadingMoreChats.value = false
  }
}

// Save the current conversation (create on first save, update thereafter).
async function persist() {
  if (!messages.value.some((m) => m.role === 'user')) return
  try {
    const payload = {
      chat_id: currentChatId.value,
      messages: messages.value.map((m) => ({ role: m.role, content: m.content, links: m.links })),
    }
    const { data } = await AiService.saveChat(orgId.value, payload)
    currentChatId.value = data.data.chat.id
    await loadChats()
  } catch {
    // Best-effort persistence — never block the chat on a save failure.
  }
}

// Open a saved chat into the conversation.
async function openChat(id: string) {
  if (id === currentChatId.value) { sidebarOpen.value = false; return }
  try {
    const { data } = await AiService.getChat(orgId.value, id)
    messages.value = data.data.chat.messages ?? []
    currentChatId.value = data.data.chat.id
    pendingActions.value = []
    errored.value = false
    sidebarOpen.value = false
    await scrollToBottom()
  } catch {
    /* not found → ignore */
  }
}

async function removeChat(id: string) {
  try {
    await AiService.deleteChat(orgId.value, id)
    chats.value = chats.value.filter((c) => c.id !== id)
    if (id === currentChatId.value) newChat()
  } catch {
    /* ignore */
  }
}

// Copy an assistant reply's raw text to the clipboard.
async function copyMessage(i: number) {
  const msg = messages.value[i]
  if (!msg) return
  try {
    await navigator.clipboard.writeText(msg.content)
    copiedIndex.value = i
    setTimeout(() => { if (copiedIndex.value === i) copiedIndex.value = null }, 1500)
  } catch {
    // Clipboard unavailable (insecure context / denied) — silently no-op.
  }
}

// Load a user message back into the composer and drop it + everything after,
// so editing then sending replays the conversation from that point.
async function editMessage(i: number) {
  const msg = messages.value[i]
  if (sending.value || !msg) return
  input.value = msg.content
  messages.value = messages.value.slice(0, i)
  errored.value = false
  await nextTick()
  composer.value?.focus()
}

// Resend a user message unchanged: drop it + everything after, then send again.
function resendMessage(i: number) {
  const msg = messages.value[i]
  if (sending.value || !msg) return
  messages.value = messages.value.slice(0, i)
  send(msg.content)
}

// Map API references (e.g. an invoice number → id) to in-app route hrefs.
const routeNameForType: Record<string, string> = { invoice: 'invoices.edit' }
function resolveLinks(refs?: IAiReference[]): IAiReferenceLink[] {
  if (!refs?.length) return []
  return refs.flatMap((r) => {
    const name = routeNameForType[r.type]
    if (!name) return []
    return [{ label: r.label, href: router.resolve({ name, params: { id: r.id } }).href }]
  })
}

// Linkified references render as <a data-internal>; navigate them via the router
// so it stays an in-app SPA transition instead of a full page reload.
function onLinkClick(e: MouseEvent) {
  const anchor = (e.target as HTMLElement).closest('a[data-internal]') as HTMLAnchorElement | null
  if (!anchor) return
  e.preventDefault()
  const href = anchor.getAttribute('href')
  if (href) router.push(href)
}

function onEnter(e: KeyboardEvent) {
  if (e.shiftKey) return
  e.preventDefault()
  send()
}

function newChat() {
  messages.value = []
  errored.value = false
  pendingActions.value = []
  currentChatId.value = null
  sidebarOpen.value = false
}

function goToSetup() {
  router.push({ name: 'settings', query: { tab: 'ai' } })
}

onMounted(async () => {
  await checkStatus()
  if (state.value === 'ready') await loadChats()
})
</script>

<template>
  <div class="flex h-[calc(100vh-4rem)] w-full">
    <!-- Chat history rail (desktop) -->
    <AiChatSidebar
      v-if="state === 'ready'"
      class="hidden md:flex w-64 border-r border-gray-300 shrink-0"
      :chats="chats"
      :current-id="currentChatId"
      :retention-days="retentionDays"
      :has-more="!!chatsCursor"
      :loading-more="loadingMoreChats"
      @new="newChat"
      @open="openChat"
      @remove="removeChat"
      @load-more="loadMoreChats"
    />

    <!-- Chat history drawer (mobile) -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="sidebarOpen" class="fixed inset-0 z-40 md:hidden">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="sidebarOpen = false"></div>
          <div class="absolute left-0 top-0 h-full w-72 max-w-[80vw]">
            <AiChatSidebar
              :chats="chats"
              :current-id="currentChatId"
              :retention-days="retentionDays"
              :has-more="!!chatsCursor"
              :loading-more="loadingMoreChats"
              :show-close="true"
              @new="newChat"
              @open="openChat"
              @remove="removeChat"
              @load-more="loadMoreChats"
              @close="sidebarOpen = false"
            />
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Main column -->
    <div class="flex flex-col flex-1 min-w-0">
      <div class="flex flex-col h-full max-w-3xl mx-auto w-full">
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
      <div v-if="state === 'ready'" class="flex items-center gap-1">
        <button type="button" class="btn-ghost md:hidden inline-flex items-center justify-center px-2.5 py-1.5" :title="t('ai.history.title')" @click="sidebarOpen = true">
          <Icon icon="lucide:panel-left" class="w-4 h-4" />
        </button>
        <button type="button" class="btn-ghost inline-flex items-center justify-center gap-1.5 text-[12px] px-3 py-1.5" @click="showExamples = true">
          <Icon icon="lucide:lightbulb" class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">{{ t('ai.agent.moreExamples') }}</span>
        </button>
        <button v-if="messages.length" type="button" class="btn-ghost inline-flex items-center justify-center gap-1.5 text-[12px] px-3 py-1.5" @click="newChat">
          <Icon icon="lucide:plus" class="w-3.5 h-3.5" />
          {{ t('ai.agent.newChat') }}
        </button>
      </div>
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

          <button
            type="button"
            class="mt-4 inline-flex items-center gap-1.5 text-[12px] text-gray-700 hover:text-gray-1000 transition"
            @click="showExamples = true"
          >
            <Icon icon="lucide:lightbulb" class="w-3.5 h-3.5" /> {{ t('ai.agent.moreExamples') }}
          </button>
        </div>

        <!-- Conversation -->
        <div v-else class="space-y-5">
          <div v-for="(m, i) in messages" :key="i" class="group flex gap-3" :class="m.role === 'user' ? 'flex-row-reverse' : ''">
            <div
              class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              :class="m.role === 'user' ? 'bg-gray-300' : 'bg-green-700/10 border border-green-700/20'"
            >
              <Icon :icon="m.role === 'user' ? 'lucide:user' : 'lucide:sparkles'" class="w-3.5 h-3.5" :class="m.role === 'user' ? 'text-gray-1000' : 'text-green-700'" />
            </div>

            <div class="flex flex-col gap-1 max-w-[80%] min-w-0" :class="m.role === 'user' ? 'items-end' : 'items-start'">
              <!-- Assistant replies are Markdown → sanitized HTML; user text stays literal. -->
              <div
                v-if="m.role === 'assistant'"
                class="ai-md rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed max-w-full bg-gray-200 border border-gray-400 text-gray-1000"
                v-html="renderMarkdown(m.content, m.links)"
                @click="onLinkClick"
              ></div>
              <div
                v-else
                class="rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap max-w-full bg-gray-300 text-gray-1000"
              >{{ m.content }}</div>

              <!-- Per-message actions (hover-revealed) -->
              <div
                class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
                :class="m.role === 'user' ? 'flex-row-reverse' : ''"
              >
                <!-- Assistant: copy result -->
                <button
                  v-if="m.role === 'assistant'"
                  type="button"
                  class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] text-gray-700 hover:text-gray-1000 hover:bg-gray-300 transition"
                  @click="copyMessage(i)"
                >
                  <Icon :icon="copiedIndex === i ? 'lucide:check' : 'lucide:copy'" class="w-3.5 h-3.5" :class="copiedIndex === i ? 'text-green-700' : ''" />
                  {{ copiedIndex === i ? t('ai.agent.copied') : t('ai.agent.copy') }}
                </button>

                <!-- User: edit + resend -->
                <template v-else>
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] text-gray-700 hover:text-gray-1000 hover:bg-gray-300 transition disabled:opacity-40"
                    :disabled="sending"
                    @click="editMessage(i)"
                  >
                    <Icon icon="lucide:pencil" class="w-3.5 h-3.5" /> {{ t('ai.agent.edit') }}
                  </button>
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] text-gray-700 hover:text-gray-1000 hover:bg-gray-300 transition disabled:opacity-40"
                    :disabled="sending"
                    @click="resendMessage(i)"
                  >
                    <Icon icon="lucide:refresh-cw" class="w-3.5 h-3.5" /> {{ t('ai.agent.resend') }}
                  </button>
                </template>
              </div>
            </div>
          </div>

          <!-- Send failed → retry -->
          <div v-if="errored" class="flex gap-3">
            <div class="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
              <Icon icon="lucide:alert-triangle" class="w-3.5 h-3.5 text-red-400" />
            </div>
            <div class="flex items-center gap-3 rounded-2xl px-3.5 py-2.5 bg-red-500/5 border border-red-500/20">
              <span class="text-[12.5px] text-gray-1000">{{ t('ai.agent.error') }}</span>
              <button
                type="button"
                class="inline-flex items-center gap-1 text-[12px] font-medium text-green-700 hover:text-green-600 transition"
                @click="retry"
              >
                <Icon icon="lucide:rotate-cw" class="w-3.5 h-3.5" /> {{ t('ai.agent.retry') }}
              </button>
            </div>
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
            ref="composer"
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
    </div>

    <!-- Example prompts modal -->
    <Teleport to="body">
      <div
        v-if="showExamples"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="showExamples = false"
      >
        <div class="absolute inset-0 bg-gray-100/70" @click="showExamples = false"></div>
        <div class="relative w-full max-w-lg max-h-[80vh] flex flex-col rounded-2xl bg-gray-200 border border-gray-400 shadow-xl">
          <div class="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-400">
            <div>
              <h3 class="text-sm font-semibold text-gray-1000">{{ t('ai.agent.examplesTitle') }}</h3>
              <p class="text-[11.5px] text-gray-700 mt-0.5">{{ t('ai.agent.examplesSubtitle') }}</p>
            </div>
            <button type="button" class="text-gray-700 hover:text-gray-1000 transition shrink-0" @click="showExamples = false">
              <Icon icon="lucide:x" class="w-4 h-4" />
            </button>
          </div>

          <div class="overflow-y-auto px-5 py-4 space-y-4">
            <div v-for="(g, gi) in suggestionGroups" :key="gi">
              <p class="text-[10px] uppercase tracking-wider text-gray-700 mb-1.5">{{ g.label }}</p>
              <div class="space-y-1.5">
                <button
                  v-for="(item, ii) in g.items"
                  :key="ii"
                  type="button"
                  class="w-full text-left rounded-lg border border-gray-400 bg-gray-100 hover:border-green-700/40 hover:bg-gray-200 px-3 py-2 text-[12.5px] text-gray-900 transition"
                  @click="pickSuggestion(item)"
                >
                  {{ item }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Confirm a prepared action before it runs -->
    <AiConfirmActionModal
      :action="currentAction"
      :busy="actionBusy"
      :queue-index="0"
      :queue-total="pendingActions.length"
      @confirm="confirmAction"
      @cancel="cancelActions"
    />
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

/* Markdown-rendered assistant replies. `:deep()` reaches the v-html content,
   which doesn't carry scoped attributes. Tuned to the app's dark tokens. */
.ai-md :deep(> :first-child) { margin-top: 0; }
.ai-md :deep(> :last-child) { margin-bottom: 0; }
.ai-md :deep(p) { margin: 0.5em 0; }
.ai-md :deep(h1),
.ai-md :deep(h2),
.ai-md :deep(h3),
.ai-md :deep(h4) { font-weight: 600; line-height: 1.3; margin: 0.9em 0 0.4em; }
.ai-md :deep(h1) { font-size: 1.15em; }
.ai-md :deep(h2) { font-size: 1.08em; }
.ai-md :deep(h3) { font-size: 1em; }
.ai-md :deep(h4) { font-size: 0.95em; }
.ai-md :deep(ul),
.ai-md :deep(ol) { margin: 0.5em 0; padding-left: 1.25em; }
.ai-md :deep(ul) { list-style: disc; }
.ai-md :deep(ol) { list-style: decimal; }
.ai-md :deep(li) { margin: 0.2em 0; }
.ai-md :deep(li > ul),
.ai-md :deep(li > ol) { margin: 0.2em 0; }
.ai-md :deep(strong) { font-weight: 600; }
.ai-md :deep(em) { font-style: italic; }
.ai-md :deep(a) {
  color: var(--color-green-700);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.ai-md :deep(a:hover) { color: var(--color-green-600); }
.ai-md :deep(code) {
  font-family: var(--font-mono, ui-monospace, "SFMono-Regular", monospace);
  font-size: 0.88em;
  background: var(--color-gray-400);
  padding: 0.1em 0.35em;
  border-radius: 4px;
}
.ai-md :deep(pre) {
  background: var(--color-gray-100);
  border: 1px solid var(--color-gray-400);
  border-radius: 8px;
  padding: 0.75em;
  overflow-x: auto;
  margin: 0.6em 0;
}
.ai-md :deep(pre code) { background: transparent; padding: 0; font-size: 0.85em; }
.ai-md :deep(hr) { border: 0; border-top: 1px solid var(--color-gray-400); margin: 0.9em 0; }
.ai-md :deep(blockquote) {
  border-left: 2px solid var(--color-gray-500);
  padding-left: 0.75em;
  margin: 0.6em 0;
  color: var(--color-gray-700);
}
.ai-md :deep(table) {
  border-collapse: collapse;
  margin: 0.6em 0;
  font-size: 0.92em;
  display: block;
  overflow-x: auto;
}
.ai-md :deep(th),
.ai-md :deep(td) { border: 1px solid var(--color-gray-400); padding: 0.3em 0.6em; text-align: left; }
.ai-md :deep(th) { font-weight: 600; background: var(--color-gray-300); }
</style>
