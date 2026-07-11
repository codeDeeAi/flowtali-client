<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { useNotification } from '@/composables/notification'
import { AiService } from '@/services/ai.service'
import type { AiProviderId, IAiCredential, IAiProvider } from '@/types/ai.types'

const props = defineProps<{ orgId: string; orgName: string }>()

const { t, tm, rt } = useI18n()
const { notify } = useNotification()

const providers = ref<IAiProvider[]>([])
const credential = ref<IAiCredential | null>(null)

const loading = ref(true)
const saving = ref(false)
const loadError = ref(false)     // provider catalog failed to load
const showForm = ref(false)      // when a credential exists, the form is hidden until "Replace"
const showGuide = ref(true)

// form state
const provider = ref<AiProviderId>('claude')
const model = ref<string>('')
const apiKey = ref<string>('')

const providerMeta = computed(() => providers.value.find((p) => p.id === provider.value))
const models = computed(() => providerMeta.value?.models ?? [])
const guideSteps = computed(() => (tm(`ai.guides.${provider.value}.steps`) as unknown[]) ?? [])

const isConnected = computed(() => !!credential.value?.is_active)

function onProviderChange() {
  model.value = providerMeta.value?.default_model ?? ''
  showGuide.value = true
}

async function load() {
  if (!props.orgId) return
  loading.value = true
  loadError.value = false

  // 1) Provider catalog — static config, must succeed for the form to render.
  //    Fetched independently so a credential-read failure never blanks the tiles.
  try {
    const { data: pRes } = await AiService.providers(props.orgId)
    providers.value = pRes.data.providers ?? []
  } catch {
    providers.value = []
  }

  if (!providers.value.length) {
    loadError.value = true
    loading.value = false
    return
  }

  // 2) Existing credential — tolerate failure (e.g. no settings.read); treat as
  //    "not connected" so the user can still see the connect form.
  try {
    const { data: cRes } = await AiService.getCredential(props.orgId)
    credential.value = cRes.data.credential
  } catch {
    credential.value = null
  }

  if (credential.value) {
    provider.value = credential.value.provider
    model.value = credential.value.model ?? providerMeta.value?.default_model ?? ''
    showForm.value = false
  } else {
    provider.value = 'claude'
    model.value = providerMeta.value?.default_model ?? 'claude-opus-4-8'
    showForm.value = true
  }

  loading.value = false
}

async function save() {
  if (!apiKey.value.trim()) {
    notify(t('ai.settings.keyRequired'), 'error')
    return
  }
  saving.value = true
  try {
    const { data } = await AiService.saveCredential(props.orgId, {
      provider: provider.value,
      api_key: apiKey.value.trim(),
      model: model.value || null,
    })
    credential.value = data.data.credential
    apiKey.value = ''
    showForm.value = false
    notify(t('ai.settings.connected'), 'success')
  } catch (e: unknown) {
    const err = e as { response?: { status?: number; data?: { message?: string } } }
    // 422 = provider rejected the key (from server-side validation)
    notify(err.response?.data?.message ?? t('ai.settings.saveError'), 'error')
  } finally {
    saving.value = false
  }
}

async function disconnect() {
  if (!confirm(t('ai.settings.disconnectConfirm'))) return
  try {
    await AiService.deleteCredential(props.orgId)
    credential.value = null
    apiKey.value = ''
    showForm.value = true
    notify(t('ai.settings.disconnected'), 'success')
  } catch {
    notify(t('ai.settings.saveError'), 'error')
  }
}

function providerIcon(id: AiProviderId): string {
  return { claude: 'simple-icons:anthropic', openai: 'simple-icons:openai', gemini: 'simple-icons:googlegemini' }[id]
}

onMounted(load)
</script>

<template>
  <div>
    <!-- Section header -->
    <div class="flex items-center gap-2 mb-1">
      <Icon icon="lucide:sparkles" class="w-4 h-4 text-green-700" />
      <h2 class="text-sm font-semibold text-gray-1000">
        {{ t('ai.settings.title') }}
        <span class="font-normal text-gray-700">{{ t('ai.settings.titleTag') }}</span>
      </h2>
    </div>
    <p class="text-[12px] text-gray-800 mb-4">{{ t('ai.settings.subtitle') }}</p>

    <!-- Loading skeleton -->
    <div v-if="loading" class="bg-gray-200 border border-gray-400 rounded-2xl p-5 space-y-3">
      <div class="h-10 rounded-xl bg-gray-300/60 animate-pulse"></div>
      <div class="grid grid-cols-3 gap-2">
        <div class="h-16 rounded-xl bg-gray-300/60 animate-pulse"></div>
        <div class="h-16 rounded-xl bg-gray-300/60 animate-pulse"></div>
        <div class="h-16 rounded-xl bg-gray-300/60 animate-pulse"></div>
      </div>
      <div class="h-9 rounded-md bg-gray-300/60 animate-pulse"></div>
    </div>

    <!-- Failed to load provider catalog -->
    <div v-else-if="loadError" class="bg-gray-200 border border-gray-400 rounded-2xl p-6 text-center">
      <Icon icon="lucide:wifi-off" class="w-6 h-6 text-gray-700 mx-auto mb-2" />
      <p class="text-[13px] text-gray-1000 font-medium">{{ t('ai.settings.loadError') }}</p>
      <p class="text-[11.5px] text-gray-700 mt-1">{{ t('ai.settings.loadErrorHint') }}</p>
      <button type="button" class="btn-ghost inline-flex items-center justify-center gap-1.5 text-[12px] px-4 py-1.5 mt-4" @click="load">
        <Icon icon="lucide:refresh-cw" class="w-3.5 h-3.5" />
        {{ t('ai.settings.retry') }}
      </button>
    </div>

    <div v-else class="bg-gray-200 border border-gray-400 rounded-2xl p-5">
      <!-- Encryption reassurance — always visible -->
      <div class="flex items-start gap-2.5 rounded-xl bg-green-700/5 border border-green-700/20 p-3 mb-5">
        <Icon icon="lucide:shield-check" class="w-4 h-4 text-green-700 mt-0.5 flex-shrink-0" />
        <p class="text-[11.5px] leading-relaxed text-gray-900">
          {{ t('ai.settings.encryptionNote', { org: orgName }) }}
        </p>
      </div>

      <!-- Connected state -->
      <div v-if="isConnected && !showForm" class="space-y-4">
        <div class="flex items-center justify-between gap-3 rounded-xl bg-gray-100 border border-gray-400 p-3.5">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-lg bg-gray-300 flex items-center justify-center flex-shrink-0">
              <Icon :icon="providerIcon(credential!.provider)" class="w-4 h-4 text-gray-1000" />
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-[13px] font-medium text-gray-1000">{{ providerMeta?.label }}</span>
                <span class="inline-flex items-center gap-1 text-[10px] text-green-800 bg-green-700/10 px-1.5 py-0.5 rounded-full">
                  <span class="w-1.5 h-1.5 rounded-full bg-green-700"></span>{{ t('ai.settings.active') }}
                </span>
              </div>
              <div class="text-[11px] text-gray-700 mt-0.5 truncate">
                {{ credential!.model || providerMeta?.default_model }} · {{ t('ai.settings.key') }} ••••{{ credential!.key_last_four }}
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <button type="button" class="btn-ghost text-[12px] px-3 py-1.5" @click="showForm = true">
              {{ t('ai.settings.replace') }}
            </button>
            <button type="button" class="btn-error text-[12px] px-3 py-1.5" @click="disconnect">
              {{ t('ai.settings.disconnect') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Connect / replace form -->
      <div v-else class="space-y-4">
        <!-- Provider picker -->
        <div>
          <label class="app-label mb-1.5">{{ t('ai.settings.provider') }}</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="p in providers"
              :key="p.id"
              type="button"
              class="flex flex-col items-center gap-1.5 rounded-xl border p-3 transition"
              :class="provider === p.id
                ? 'border-green-700 bg-green-700/5'
                : 'border-gray-400 bg-gray-100 hover:border-gray-500'"
              @click="provider = p.id; onProviderChange()"
            >
              <Icon :icon="providerIcon(p.id)" class="w-5 h-5" :class="provider === p.id ? 'text-green-700' : 'text-gray-900'" />
              <span class="text-[11px] font-medium" :class="provider === p.id ? 'text-gray-1000' : 'text-gray-800'">{{ p.label }}</span>
            </button>
          </div>
        </div>

        <!-- Model picker -->
        <div>
          <label class="app-label mb-1.5">{{ t('ai.settings.model') }}</label>
          <select v-model="model" class="app-select text-sm">
            <option v-for="m in models" :key="m.id" :value="m.id">{{ m.label }}</option>
          </select>
        </div>

        <!-- API key -->
        <div>
          <label class="app-label mb-1.5">{{ t('ai.settings.apiKey') }}</label>
          <input
            v-model="apiKey"
            type="password"
            autocomplete="off"
            spellcheck="false"
            class="app-inp text-sm font-mono"
            :placeholder="providerMeta?.key_prefix ? `${providerMeta.key_prefix}…` : t('ai.settings.apiKeyPlaceholder')"
          />
          <p class="text-[10.5px] text-gray-700 mt-1.5">{{ t('ai.settings.validateNote') }}</p>
        </div>

        <!-- How to generate a key -->
        <div class="rounded-xl border border-gray-400 bg-gray-100 overflow-hidden">
          <button
            type="button"
            class="w-full flex items-center justify-between px-3.5 py-2.5 text-left"
            @click="showGuide = !showGuide"
          >
            <span class="flex items-center gap-2 text-[12px] font-medium text-gray-1000">
              <Icon icon="lucide:key-round" class="w-3.5 h-3.5 text-green-700" />
              {{ t('ai.settings.guideTitle', { provider: providerMeta?.label }) }}
            </span>
            <Icon :icon="showGuide ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="w-4 h-4 text-gray-700" />
          </button>
          <div v-if="showGuide" class="px-3.5 pb-3.5">
            <ol class="space-y-2">
              <li v-for="(step, i) in guideSteps" :key="i" class="flex gap-2.5 text-[11.5px] text-gray-900 leading-relaxed">
                <span class="flex-shrink-0 w-4 h-4 rounded-full bg-gray-300 text-gray-1000 text-[9px] font-semibold flex items-center justify-center mt-0.5">{{ i + 1 }}</span>
                <span>{{ rt(step as string) }}</span>
              </li>
            </ol>
            <a
              :href="providerMeta?.console_url"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 mt-3 text-[12px] text-green-700 hover:underline"
            >
              <Icon icon="lucide:external-link" class="w-3.5 h-3.5" />
              {{ t('ai.settings.openConsole', { provider: providerMeta?.label }) }}
            </a>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2 pt-1">
          <button type="button" class="btn-primary inline-flex items-center justify-center gap-1.5 text-[13px] px-4 py-2" :disabled="saving" @click="save">
            <Icon v-if="saving" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
            <Icon v-else icon="lucide:check" class="w-3.5 h-3.5" />
            {{ saving ? t('ai.settings.validating') : t('ai.settings.saveKey') }}
          </button>
          <button
            v-if="isConnected"
            type="button"
            class="btn-ghost text-[13px] px-4 py-2"
            @click="showForm = false; apiKey = ''"
          >
            {{ t('ai.settings.cancel') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
