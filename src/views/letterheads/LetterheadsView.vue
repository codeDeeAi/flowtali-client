<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import Pagination from '@/components/ui/Pagination.vue'
import ShareLinkModal from '@/components/modals/ShareLinkModal.vue'
import { useAuthStore } from '@/stores/auth'
import { LetterheadService, type ILetterhead, type ILetterheadStats } from '@/services/letterhead.service'
import { useNotification } from '@/composables/notification'

const router    = useRouter()
const authStore = useAuthStore()
const { notify } = useNotification()
const orgId     = computed(() => authStore.getCurrentOrganization?.id ?? '')

type ViewMode = 'grid' | 'list'
const viewMode    = ref<ViewMode>('grid')
const search      = ref('')
const currentPage = ref(1)
const perPage     = ref(15)
const total       = ref(0)
const loading     = ref(false)

const letterheads = ref<ILetterhead[]>([])
const stats       = ref<ILetterheadStats | null>(null)

const showDeleteConfirm = ref(false)
const deleteTarget      = ref<ILetterhead | null>(null)
const isDeleting        = ref(false)

async function fetchLetterheads() {
  if (!orgId.value) return
  loading.value = true
  try {
    const res = await LetterheadService.list(orgId.value, {
      search: search.value || undefined,
      page: currentPage.value,
      per_page: perPage.value,
    })
    letterheads.value = res.data.data.data ?? []
    total.value = (res.data.data as any).total ?? letterheads.value.length
  } catch {
    notify('Failed to load letterheads', 'error')
  } finally {
    loading.value = false
  }
}

async function fetchStats() {
  if (!orgId.value) return
  try {
    const res = await LetterheadService.stats(orgId.value)
    stats.value = res.data.data
  } catch {
    // non-critical
  }
}

onMounted(() => { fetchLetterheads(); fetchStats() })

const onSearch = () => { currentPage.value = 1; fetchLetterheads() }
const onPageChange = () => fetchLetterheads()

const templateBadgeClass: Record<string, string> = {
  classic:   'bg-amber/10 text-amber border-amber/20',
  modern:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  bold:      'bg-red-500/10 text-red-400 border-red-500/20',
  minimal:   'bg-green-500/10 text-green-400 border-green-500/20',
  legal:     'bg-purple-500/10 text-purple-400 border-purple-500/20',
  executive: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
}

const templateLabel: Record<string, string> = {
  classic: 'Classic', modern: 'Modern', bold: 'Bold',
  minimal: 'Minimal', legal: 'Legal', executive: 'Executive',
}

const confirmDelete = (lh: ILetterhead) => { deleteTarget.value = lh; showDeleteConfirm.value = true }
const doDelete = async () => {
  if (!deleteTarget.value || !orgId.value) return
  isDeleting.value = true
  try {
    await LetterheadService.delete(orgId.value, deleteTarget.value.id)
    notify('Letterhead deleted', 'success')
    showDeleteConfirm.value = false
    deleteTarget.value = null
    fetchLetterheads()
  } catch {
    notify('Failed to delete letterhead', 'error')
  } finally {
    isDeleting.value = false
  }
}

const shareTarget    = ref<ILetterhead | null>(null)
const showShareModal = ref(false)

const openShare = (lh: ILetterhead) => { shareTarget.value = lh; showShareModal.value = true }

function lastUsedLabel(lh: ILetterhead): string {
  if (!lh.last_used_at) return 'Never used'
  const d = new Date(lh.last_used_at)
  const diff = Date.now() - d.getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return '1 day ago'
  if (days < 7)  return `${days} days ago`
  if (days < 14) return '1 week ago'
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return `${Math.floor(days / 30)} months ago`
}
</script>

<template>
  <div class="p-4 md:p-6 space-y-5 min-h-full">

    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="page-title">Letterheads</h1>
        <p class="page-subtitle">{{ total }} branded template{{ total !== 1 ? 's' : '' }}</p>
      </div>
      <button
        @click="router.push({ name: 'letterheads.create' })"
        class="flex items-center gap-2 bg-amber hover:bg-amber-light text-charcoal-900 font-semibold text-xs px-3 py-2 rounded-lg transition-colors self-start sm:self-auto"
      >
        <Icon icon="lucide:plus" class="w-3.5 h-3.5" /> New Letterhead
      </button>
    </div>

    <!-- Stats row -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4">
        <p class="text-[10px] uppercase tracking-wider text-cream-faint mb-1">Total Templates</p>
        <p class="text-2xl font-bold text-cream">{{ stats?.total ?? total }}</p>
      </div>
      <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4">
        <p class="text-[10px] uppercase tracking-wider text-cream-faint mb-1">Total Uses</p>
        <p class="text-2xl font-bold text-cream">{{ stats?.total_uses ?? '—' }}</p>
      </div>
      <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4">
        <p class="text-[10px] uppercase tracking-wider text-cream-faint mb-1">Most Used</p>
        <p class="text-sm font-semibold text-cream truncate">{{ stats?.most_used?.name ?? '—' }}</p>
        <p v-if="stats?.most_used" class="text-[10px] text-cream-faint mt-0.5">{{ stats.most_used.uses }} uses</p>
      </div>
      <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4">
        <p class="text-[10px] uppercase tracking-wider text-cream-faint mb-1">Confidential</p>
        <p class="text-2xl font-bold text-cream">{{ stats?.confidential ?? '—' }}</p>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <Icon icon="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cream-faint pointer-events-none" />
        <input
          v-model="search"
          @input="onSearch"
          placeholder="Search letterheads…"
          class="app-inp pl-9 text-sm w-full"
        />
      </div>
      <!-- View toggle -->
      <div class="flex items-center gap-1 bg-charcoal-800 border border-charcoal-700 rounded-lg p-1 shrink-0">
        <button
          @click="viewMode = 'grid'"
          :class="['p-1.5 rounded transition-colors', viewMode === 'grid' ? 'bg-charcoal-600 text-cream' : 'text-cream-faint hover:text-cream']"
        ><Icon icon="lucide:layout-grid" class="w-4 h-4" /></button>
        <button
          @click="viewMode = 'list'"
          :class="['p-1.5 rounded transition-colors', viewMode === 'list' ? 'bg-charcoal-600 text-cream' : 'text-cream-faint hover:text-cream']"
        ><Icon icon="lucide:list" class="w-4 h-4" /></button>
      </div>
    </div>

    <!-- Empty -->
    <div v-if="!loading && letterheads.length === 0" class="flex flex-col items-center justify-center py-24 text-center">
      <Icon icon="lucide:file-text" class="w-10 h-10 text-cream-faint mb-3" />
      <p class="text-cream-muted font-medium">No letterheads found</p>
      <p class="text-cream-faint text-xs mt-1">Try a different search or create a new one</p>
    </div>

    <!-- ── GRID VIEW ── -->
    <div v-else-if="viewMode === 'grid'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="lh in letterheads" :key="lh.id"
        class="bg-charcoal-800 border border-charcoal-700 rounded-xl overflow-hidden hover:border-charcoal-500 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 cursor-pointer group"
        @click="router.push({ name: 'letterheads.edit', params: { id: lh.id } })"
      >
        <!-- Thumbnail preview -->
        <div class="h-48 flex items-center justify-center border-b border-charcoal-700 p-4 bg-charcoal-900/50">
          <div class="bg-white w-full h-full rounded-md overflow-hidden shadow-xl relative" style="font-family: 'DM Sans', sans-serif; color: #1a1a1a;">
            <!-- Top bar -->
            <div class="h-1 w-full" :style="{ backgroundColor: lh.accent_color }"></div>
            <div class="p-3 h-full flex flex-col">
              <div class="flex justify-between items-start mb-1.5">
                <div>
                  <div class="text-[7px] font-bold" :style="{ color: lh.accent_color }">{{ lh.company || lh.name }}</div>
                  <div v-if="lh.tagline" class="text-[5px] text-gray-400">{{ lh.tagline }}</div>
                </div>
                <div class="text-right">
                  <div v-if="lh.email" class="text-[5px] text-gray-400">{{ lh.email }}</div>
                  <div v-if="lh.website" class="text-[5px] text-gray-400">{{ lh.website }}</div>
                </div>
              </div>
              <div class="h-px bg-gray-200 mb-1.5"></div>
              <div class="text-[5.5px] text-gray-500 leading-relaxed flex-1">
                <div class="mb-1">Re: {{ lh.name }}</div>
                Dear Client,<br/>
                We are pleased to present our proposal for your upcoming project…<br/><br/>
                Please find attached the details of our engagement…
              </div>
              <div class="h-px bg-gray-200 mt-1 mb-1"></div>
              <div class="flex justify-between items-center">
                <div class="text-[4.5px] text-gray-300">{{ lh.company || lh.name }} · Confidential</div>
                <div class="text-[4.5px] text-gray-300">Page 1 of 1</div>
              </div>
            </div>
            <!-- Watermark -->
            <div v-if="lh.watermark" class="absolute inset-0 flex items-center justify-center pointer-events-none" style="transform: rotate(-25deg)">
              <span class="text-[10px] font-black opacity-[0.06] text-gray-800 tracking-widest">{{ lh.watermark }}</span>
            </div>
          </div>
        </div>

        <!-- Card body -->
        <div class="p-4">
          <div class="flex items-start justify-between mb-1">
            <span class="text-sm font-semibold text-cream group-hover:text-amber transition-colors">{{ lh.name }}</span>
            <span :class="['text-[9px] px-1.5 py-0.5 rounded border font-medium ml-2 shrink-0', templateBadgeClass[lh.theme] ?? 'bg-charcoal-700 text-cream-faint border-charcoal-600']">
              {{ templateLabel[lh.theme] ?? lh.theme }}
            </span>
          </div>
          <p class="text-xs text-cream-faint mb-3">{{ lh.uses }} uses · Last used {{ lastUsedLabel(lh) }}</p>
          <div class="flex items-center gap-2" @click.stop>
            <button
              @click="router.push({ name: 'letterheads.view', params: { id: lh.id } })"
              class="flex-1 text-xs py-1.5 bg-charcoal-700 hover:bg-charcoal-600 text-cream-muted hover:text-cream rounded-md transition-colors"
            >View</button>
            <button
              @click="router.push({ name: 'letterheads.edit', params: { id: lh.id } })"
              class="w-7 h-7 flex items-center justify-center rounded-md bg-charcoal-700 hover:bg-charcoal-600 text-cream-faint hover:text-cream transition-colors"
              title="Edit"
            ><Icon icon="lucide:pencil" class="w-3.5 h-3.5" /></button>
            <button
              @click="openShare(lh)"
              class="relative w-7 h-7 flex items-center justify-center rounded-md bg-charcoal-700 hover:bg-charcoal-600 text-cream-faint hover:text-cream transition-colors"
              title="Share"
            >
              <Icon icon="lucide:share-2" class="w-3.5 h-3.5" />
            </button>
            <button
              @click="confirmDelete(lh)"
              class="w-7 h-7 flex items-center justify-center rounded-md bg-charcoal-700 hover:bg-red-500/20 text-cream-faint hover:text-red-400 transition-colors"
              title="Delete"
            ><Icon icon="lucide:trash-2" class="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>

      <!-- Create new card -->
      <div
        @click="router.push({ name: 'letterheads.create' })"
        class="bg-charcoal-800 border border-dashed border-charcoal-600 hover:border-amber/40 rounded-xl flex flex-col items-center justify-center gap-3 p-6 min-h-[300px] cursor-pointer transition-colors group"
      >
        <div class="w-10 h-10 rounded-xl bg-amber/10 border border-amber/20 flex items-center justify-center group-hover:bg-amber/15 transition-colors">
          <Icon icon="lucide:plus" class="w-5 h-5 text-amber" />
        </div>
        <div class="text-center">
          <div class="text-sm font-medium text-cream-muted group-hover:text-cream transition-colors">New Letterhead</div>
          <div class="text-xs text-cream-faint mt-0.5">Start from a template</div>
        </div>
      </div>
    </div>

    <!-- ── LIST VIEW ── -->
    <div v-else class="bg-charcoal-800 border border-charcoal-700 rounded-xl overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-charcoal-700 bg-charcoal-900/40">
            <th class="text-left py-3 px-4 text-[10px] uppercase tracking-wider text-cream-faint font-medium">Name</th>
            <th class="text-left py-3 px-4 text-[10px] uppercase tracking-wider text-cream-faint font-medium hidden sm:table-cell">Theme</th>
            <th class="text-left py-3 px-4 text-[10px] uppercase tracking-wider text-cream-faint font-medium hidden md:table-cell">Watermark</th>
            <th class="text-left py-3 px-4 text-[10px] uppercase tracking-wider text-cream-faint font-medium hidden lg:table-cell">Uses</th>
            <th class="text-left py-3 px-4 text-[10px] uppercase tracking-wider text-cream-faint font-medium hidden md:table-cell">Last Used</th>
            <th class="py-3 px-4"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="lh in letterheads" :key="lh.id"
            class="border-b border-charcoal-700/50 last:border-0 hover:bg-charcoal-700/30 cursor-pointer transition-colors"
            @click="router.push({ name: 'letterheads.view', params: { id: lh.id } })"
          >
            <td class="py-3 px-4">
              <div class="flex items-center gap-3">
                <!-- Mini preview -->
                <div class="w-8 h-10 bg-white rounded shadow-sm overflow-hidden shrink-0 relative">
                  <div class="h-0.5 w-full" :style="{ backgroundColor: lh.accent_color }"></div>
                  <div class="p-1 space-y-0.5">
                    <div class="h-px rounded" :style="{ backgroundColor: lh.accent_color, width: '60%' }"></div>
                    <div class="h-px bg-gray-200 w-full rounded"></div>
                    <div class="h-px bg-gray-100 w-5/6 rounded"></div>
                    <div class="h-px bg-gray-100 w-4/6 rounded"></div>
                  </div>
                  <div v-if="lh.watermark" class="absolute inset-0 flex items-center justify-center" style="transform: rotate(-25deg)">
                    <span class="text-[4px] font-black text-gray-800 opacity-10 tracking-widest">{{ lh.watermark }}</span>
                  </div>
                </div>
                <div>
                  <div class="font-medium text-cream text-sm">{{ lh.name }}</div>
                  <div class="text-xs text-cream-faint">{{ lh.company }}</div>
                </div>
              </div>
            </td>
            <td class="py-3 px-4 hidden sm:table-cell">
              <span :class="['text-[9px] px-1.5 py-0.5 rounded border font-medium', templateBadgeClass[lh.theme] ?? 'bg-charcoal-700 text-cream-faint border-charcoal-600']">
                {{ templateLabel[lh.theme] ?? lh.theme }}
              </span>
            </td>
            <td class="py-3 px-4 hidden md:table-cell">
              <span v-if="lh.watermark" class="text-xs text-cream-faint font-mono">{{ lh.watermark }}</span>
              <span v-else class="text-xs text-charcoal-600">—</span>
            </td>
            <td class="py-3 px-4 hidden lg:table-cell text-xs text-cream-muted">{{ lh.uses }}</td>
            <td class="py-3 px-4 hidden md:table-cell text-xs text-cream-faint">{{ lastUsedLabel(lh) }}</td>
            <td class="py-3 px-4" @click.stop>
              <div class="flex items-center justify-end gap-1">
                <button
                  @click="router.push({ name: 'letterheads.edit', params: { id: lh.id } })"
                  class="p-1.5 rounded hover:bg-charcoal-600 text-cream-faint hover:text-cream transition-colors"
                  title="Edit"
                ><Icon icon="lucide:pencil" class="w-3.5 h-3.5" /></button>
                <button
                  @click="openShare(lh)"
                  class="relative p-1.5 rounded hover:bg-charcoal-600 text-cream-faint hover:text-cream transition-colors"
                  title="Share"
                >
                  <Icon icon="lucide:share-2" class="w-3.5 h-3.5" />
                </button>
                <button
                  @click="confirmDelete(lh)"
                  class="p-1.5 rounded hover:bg-red-500/20 text-cream-faint hover:text-red-400 transition-colors"
                  title="Delete"
                ><Icon icon="lucide:trash-2" class="w-3.5 h-3.5" /></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <Pagination
      v-if="total > perPage"
      v-model="currentPage"
      :total="total"
      :per-page="perPage"
      @update:model-value="onPageChange"
    />

    <!-- Share modal -->
    <ShareLinkModal
      v-if="showShareModal && shareTarget"
      resource-type="letterhead"
      :resource-id="shareTarget.id"
      :resource-name="shareTarget.name"
      :org-id="orgId"
      @close="showShareModal = false; shareTarget = null"
    />

    <!-- Delete modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <Icon icon="lucide:trash-2" class="w-4 h-4 text-red-400" />
              </div>
              <div>
                <p class="font-semibold text-cream text-sm">Delete Letterhead</p>
                <p class="text-xs text-cream-faint">This action cannot be undone</p>
              </div>
            </div>
            <p class="text-sm text-cream-muted mb-5">
              Are you sure you want to delete <span class="font-semibold text-cream">{{ deleteTarget?.name }}</span>?
            </p>
            <div class="flex justify-end gap-2">
              <button @click="showDeleteConfirm = false" class="px-4 py-2 text-xs font-medium text-cream-faint hover:text-cream bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 rounded-lg transition-colors">Cancel</button>
              <button @click="doDelete" :disabled="isDeleting" class="px-4 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-60">
                <Icon v-if="isDeleting" icon="lucide:loader-2" class="w-3 h-3 animate-spin inline mr-1" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
