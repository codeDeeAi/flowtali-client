<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useNotification } from '@/composables/notification'
import { SharedLinksService, type ISharedLink } from '@/services/shared-links.service'
import { InvoiceSharedLinksService, type IInvoiceSharedLink } from '@/services/invoice.service'
import { ReceiptSharedLinksService, type IReceiptSharedLink } from '@/services/receipt.service'

const props = defineProps<{
  resourceType: 'invoice' | 'letterhead' | 'receipt'
  resourceId: string
  resourceName?: string
  orgId: string
}>()

const emit = defineEmits<{ close: [] }>()

const { notify } = useNotification()

const links       = ref<ISharedLink[] | IInvoiceSharedLink[] | IReceiptSharedLink[]>([])
const loadingLinks = ref(false)
const showCreate  = ref(false)
const isCreating  = ref(false)

const form = ref({
  label: '',
  visibility: 'public' as 'public' | 'private',
  accessCode: '',
  validityDays: 7 as number | null,
})

const validityOptions: { label: string; value: number | null }[] = [
  { label: '1 day',    value: 1 },
  { label: '3 days',   value: 3 },
  { label: '7 days',   value: 7 },
  { label: '14 days',  value: 14 },
  { label: '30 days',  value: 30 },
  { label: 'No expiry', value: null },
]

async function loadLinks() {
  if (!props.orgId) return
  loadingLinks.value = true
  try {
    const res = props.resourceType === 'invoice'
      ? await InvoiceSharedLinksService.list(props.orgId, props.resourceId)
      : props.resourceType === 'receipt'
        ? await ReceiptSharedLinksService.list(props.orgId, props.resourceId)
        : await SharedLinksService.list(props.orgId, props.resourceId)
    links.value = res.data.data as any
    showCreate.value = links.value.length === 0
  } catch {
    notify('Failed to load shared links', 'error')
  } finally {
    loadingLinks.value = false
  }
}

onMounted(loadLinks)

async function handleCreate() {
  if (!props.orgId) return
  isCreating.value = true
  try {
    const payload = {
      label:        form.value.label || undefined,
      visibility:   form.value.visibility,
      access_code:  form.value.accessCode || undefined,
      validity_days: form.value.validityDays ?? undefined,
    }
    const res = props.resourceType === 'invoice'
      ? await InvoiceSharedLinksService.create(props.orgId, props.resourceId, payload)
      : props.resourceType === 'receipt'
        ? await ReceiptSharedLinksService.create(props.orgId, props.resourceId, payload)
        : await SharedLinksService.create(props.orgId, props.resourceId, payload)
    const newLink = res.data.data
    ;(links.value as any[]).unshift(newLink)
    copyToClipboard(newLink)
    notify('Link created and copied to clipboard', 'success')
    form.value = { label: '', visibility: 'public', accessCode: '', validityDays: 7 }
    showCreate.value = false
  } catch {
    notify('Failed to create link', 'error')
  } finally {
    isCreating.value = false
  }
}

// ── helpers ───────────────────────────────────────────────────────────────────
function linkUrl(token: string): string {
  const base = window.location.origin
  const path = props.resourceType === 'invoice' ? 'i' : props.resourceType === 'receipt' ? 'r' : 'l'
  return `${base}/share/${path}/${token}`
}

function copyToClipboard(link: ISharedLink) {
  navigator.clipboard.writeText(linkUrl(link.token)).catch(() => {})
  notify('Link copied to clipboard', 'success')
}

function copyCode(code: string) {
  navigator.clipboard.writeText(code).catch(() => {})
  notify('Access code copied', 'success')
}

async function revokeLink(id: string) {
  if (!props.orgId) return
  try {
    props.resourceType === 'invoice'
      ? await InvoiceSharedLinksService.revoke(props.orgId, props.resourceId, id)
      : props.resourceType === 'receipt'
        ? await ReceiptSharedLinksService.revoke(props.orgId, props.resourceId, id)
        : await SharedLinksService.revoke(props.orgId, props.resourceId, id)
    const link = links.value.find(l => l.id === id)
    if (link) link.is_active = false
    notify('Link revoked', 'success')
  } catch {
    notify('Failed to revoke link', 'error')
  }
}

async function deleteLink(id: string) {
  if (!props.orgId) return
  try {
    props.resourceType === 'invoice'
      ? await InvoiceSharedLinksService.delete(props.orgId, props.resourceId, id)
      : props.resourceType === 'receipt'
        ? await ReceiptSharedLinksService.delete(props.orgId, props.resourceId, id)
        : await SharedLinksService.delete(props.orgId, props.resourceId, id)
    links.value = (links.value as any[]).filter((l: any) => l.id !== id)
    notify('Link deleted', 'success')
  } catch {
    notify('Failed to delete link', 'error')
  }
}

function isExpired(link: ISharedLink): boolean {
  if (!link.expires_at) return false
  return new Date(link.expires_at) < new Date()
}

function statusLabel(link: ISharedLink): { text: string; cls: string } {
  if (!link.is_active) return { text: 'Revoked', cls: 'text-red-400 bg-red-500/10 border-red-500/20' }
  if (isExpired(link))  return { text: 'Expired', cls: 'text-gray-400 bg-gray-400 border-gray-500' }
  return { text: 'Active', cls: 'text-green-400 bg-green-500/10 border-green-500/20' }
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function expiryLabel(link: ISharedLink): string {
  if (!link.expires_at) return 'Never expires'
  if (isExpired(link)) return `Expired ${fmtDate(link.expires_at)}`
  return `Expires ${fmtDate(link.expires_at)}`
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" @click.self="emit('close')">
        <div class="bg-gray-200 border border-gray-400 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">

          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-gray-400 shrink-0">
            <div class="flex items-center gap-2.5">
              <div class="w-7 h-7 rounded-lg bg-green-700/10 border border-green-700/20 flex items-center justify-center">
                <Icon icon="lucide:share-2" class="w-3.5 h-3.5 text-green-700" />
              </div>
              <div>
                <h3 class="text-sm font-semibold text-gray-1000">Share Link</h3>
                <p class="text-[11px] text-gray-700">{{ resourceName }}</p>
              </div>
            </div>
            <button @click="emit('close')" class="p-1.5 rounded-lg hover:bg-gray-400 text-gray-700 hover:text-gray-1000 transition-colors">
              <Icon icon="lucide:x" class="w-4 h-4" />
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto p-5 space-y-4">

            <!-- Create new link -->
            <div v-if="showCreate" class="bg-gray-100/60 border border-gray-400 rounded-xl p-4 space-y-3">
              <p class="text-xs font-semibold text-gray-900 uppercase tracking-wider">New Link</p>

              <!-- Label -->
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">Label (optional)</label>
                <input v-model="form.label" class="app-inp text-sm w-full" placeholder="e.g. Client review" />
              </div>

              <!-- Visibility -->
              <div class="space-y-1.5">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">Access</label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    @click="form.visibility = 'public'"
                    :class="['flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors text-left', form.visibility === 'public' ? 'border-green-700 bg-green-700/10 text-green-700' : 'border-gray-500 bg-gray-400/40 text-gray-700 hover:text-gray-1000']"
                  >
                    <Icon icon="lucide:globe" class="w-3.5 h-3.5 shrink-0" />
                    <div>
                      <div>Public</div>
                      <div class="text-[10px] opacity-70 font-normal">Anyone with link</div>
                    </div>
                  </button>
                  <button
                    @click="form.visibility = 'private'"
                    :class="['flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors text-left', form.visibility === 'private' ? 'border-green-700 bg-green-700/10 text-green-700' : 'border-gray-500 bg-gray-400/40 text-gray-700 hover:text-gray-1000']"
                  >
                    <Icon icon="lucide:lock" class="w-3.5 h-3.5 shrink-0" />
                    <div>
                      <div>Private</div>
                      <div class="text-[10px] opacity-70 font-normal">Requires access code</div>
                    </div>
                  </button>
                </div>
              </div>

              <!-- Access code -->
              <div v-if="form.visibility === 'private'" class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">Access Code <span class="normal-case opacity-60">(leave blank to auto-generate)</span></label>
                <input v-model="form.accessCode" class="app-inp text-sm font-mono w-full" placeholder="Auto-generated" maxlength="20" />
              </div>

              <!-- Validity -->
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">Validity Period</label>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="opt in validityOptions" :key="String(opt.value)"
                    @click="form.validityDays = opt.value"
                    :class="['px-2.5 py-1 rounded-md border text-xs font-medium transition-colors', form.validityDays === opt.value ? 'border-green-700 bg-green-700/10 text-green-700' : 'border-gray-500 bg-gray-400/40 text-gray-700 hover:text-gray-1000']"
                  >{{ opt.label }}</button>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex gap-2 pt-1">
                <button @click="handleCreate" :disabled="isCreating" class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-green-700 hover:bg-green-700/90 text-bg-100 rounded-lg transition-colors disabled:opacity-60">
                  <Icon v-if="isCreating" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
                  <Icon v-else icon="lucide:link" class="w-3.5 h-3.5" /> Generate Link
                </button>
                <button v-if="links.length > 0" @click="showCreate = false" class="px-3 py-2 text-xs text-gray-700 hover:text-gray-1000 bg-gray-400 hover:bg-gray-500 border border-gray-500 rounded-lg transition-colors">
                  Cancel
                </button>
              </div>
            </div>

            <!-- Add link button -->
            <button
              v-else
              @click="showCreate = true"
              class="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium border border-dashed border-gray-500 hover:border-green-700/40 text-gray-700 hover:text-gray-1000 rounded-xl transition-colors"
            >
              <Icon icon="lucide:plus" class="w-3.5 h-3.5" /> Create New Link
            </button>

            <!-- Existing links -->
            <div v-if="links.length > 0" class="space-y-2">
              <p class="text-[10px] uppercase tracking-wider text-gray-700 px-0.5">{{ links.length }} Link{{ links.length !== 1 ? 's' : '' }}</p>

              <div v-for="link in links" :key="link.id" class="bg-gray-100/40 border border-gray-400 rounded-xl p-3.5 space-y-3">

                <!-- Top row -->
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-xs font-semibold text-gray-1000 truncate">{{ link.label || 'Shared Link' }}</span>
                      <span :class="['text-[9px] px-1.5 py-0.5 rounded border font-medium', statusLabel(link).cls]">
                        {{ statusLabel(link).text }}
                      </span>
                      <span class="text-[9px] px-1.5 py-0.5 rounded border font-medium text-gray-700 border-gray-500 bg-gray-400">
                        {{ link.visibility === 'private' ? 'Private' : 'Public' }}
                      </span>
                    </div>
                    <p class="text-[10px] text-gray-700 mt-0.5">{{ expiryLabel(link) }} · Created {{ fmtDate(link.created_at) }}</p>
                  </div>
                </div>

                <!-- URL row -->
                <div class="flex items-center gap-2">
                  <div class="flex-1 min-w-0 bg-gray-200 border border-gray-400 rounded-lg px-2.5 py-1.5">
                    <p class="text-[10px] font-mono text-gray-700 truncate">{{ linkUrl(link.token) }}</p>
                  </div>
                  <button
                    @click="copyToClipboard(link)"
                    :disabled="!link.is_active || isExpired(link)"
                    class="shrink-0 p-1.5 rounded-lg bg-gray-400 hover:bg-gray-500 border border-gray-500 text-gray-700 hover:text-gray-1000 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Copy link"
                  ><Icon icon="lucide:copy" class="w-3.5 h-3.5" /></button>
                </div>

                <!-- Access code (private) -->
                <div v-if="link.visibility === 'private' && link.access_code" class="flex items-center gap-2">
                  <div class="flex-1 bg-green-700/5 border border-green-700/20 rounded-lg px-2.5 py-1.5 flex items-center gap-2">
                    <Icon icon="lucide:key-round" class="w-3 h-3 text-green-700 shrink-0" />
                    <span class="text-xs font-mono text-green-700 tracking-widest">{{ link.access_code }}</span>
                  </div>
                  <button @click="copyCode(link.access_code!)" class="shrink-0 p-1.5 rounded-lg bg-gray-400 hover:bg-gray-500 border border-gray-500 text-gray-700 hover:text-gray-1000 transition-colors" title="Copy code">
                    <Icon icon="lucide:copy" class="w-3.5 h-3.5" />
                  </button>
                </div>

                <!-- Stats -->
                <div class="flex items-center gap-4 text-[10px] text-gray-700 border-t border-gray-400/60 pt-2.5 mt-0.5">
                  <span class="flex items-center gap-1"><Icon icon="lucide:eye" class="w-3 h-3" /> {{ link.views }} views</span>
                  <span class="flex items-center gap-1"><Icon icon="lucide:users" class="w-3 h-3" /> {{ link.unique_views }} unique</span>
                  <span class="flex items-center gap-1 ml-auto"><Icon icon="lucide:clock" class="w-3 h-3" /> {{ fmtDateTime(link.last_viewed_at) }}</span>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-1.5 border-t border-gray-400/60 pt-2.5">
                  <button
                    v-if="link.is_active && !isExpired(link)"
                    @click="revokeLink(link.id)"
                    class="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-orange-400 hover:text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 rounded-md transition-colors"
                  ><Icon icon="lucide:ban" class="w-3 h-3" /> Revoke</button>
                  <button
                    @click="deleteLink(link.id)"
                    class="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-md transition-colors"
                  ><Icon icon="lucide:trash-2" class="w-3 h-3" /> Delete</button>
                </div>

              </div>
            </div>

            <!-- Empty state -->
            <div v-else-if="!showCreate" class="flex flex-col items-center justify-center py-8 text-center">
              <div class="w-10 h-10 rounded-xl bg-gray-400 border border-gray-500 flex items-center justify-center mb-3">
                <Icon icon="lucide:link" class="w-5 h-5 text-gray-700" />
              </div>
              <p class="text-sm text-gray-900 font-medium">No shared links yet</p>
              <p class="text-xs text-gray-700 mt-1">Generate a link to share this {{ resourceType }}</p>
            </div>

          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
