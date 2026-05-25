<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Icon } from '@iconify/vue';
import { useAuthStore } from '@/stores/auth';
import { usePermissions } from '@/composables/usePermissions';
import { ProjectService } from '@/services/project.service';
import { InvoiceService } from '@/services/invoice.service';
import { ReceiptService } from '@/services/receipt.service';
import { LetterheadService } from '@/services/letterhead.service';
import { ClientService } from '@/services/client.service';
import type { IClient } from '@/types/client.types';
import { useNotification } from '@/composables/notification';
import type {
  IProject, IProjectFile, IProjectActivity, IProjectDocSummary,
} from '@/services/project.service';

const router    = useRouter();
const route     = useRoute();
const authStore = useAuthStore();
const { can }   = usePermissions();
const { notify } = useNotification();

const orgId    = computed(() => authStore.getCurrentOrganization?.id ?? '');
const projectId = route.params.id as string;

type Tab = 'overview' | 'client' | 'invoices' | 'receipts' | 'letterheads' | 'files' | 'activity';
const activeTab = ref<Tab>('overview');

const project    = ref<IProject | null>(null);
const invoices   = ref<IProjectDocSummary[]>([]);
const receipts   = ref<IProjectDocSummary[]>([]);
const letterheads = ref<IProjectDocSummary[]>([]);
const files      = ref<IProjectFile[]>([]);
const activities = ref<IProjectActivity[]>([]);
const activityPage = ref(1);
const activityLastPage = ref(1);

const loading  = ref(true);
const notFound = ref(false);

const showDeleteConfirm = ref(false);
const isDeleting = ref(false);

// Attach modals
const showAttachInvoice     = ref(false);
const showAttachReceipt     = ref(false);
const showAttachLetterhead  = ref(false);
const attachSearch          = ref('');
const attachResults         = ref<any[]>([]);
const attachLoading         = ref(false);
const isAttaching           = ref(false);

// File add
const showAddFile    = ref(false);
const fileForm       = ref({ name: '', type: 'url' as 'upload' | 'url', url: '', file_size: '', mime_type: '' });
const isSavingFile   = ref(false);

// Note
const noteText   = ref('');
const isSavingNote = ref(false);

// Client
const showAssignClient  = ref(false);
const clientSearch      = ref('');
const clientResults     = ref<IClient[]>([]);
const clientSearching   = ref(false);
const isAssigningClient = ref(false);

onMounted(async () => {
  await loadProject();
  loadDocuments();
  loadFiles();
  loadActivities();
});

async function loadProject() {
  loading.value = true;
  try {
    const res = await ProjectService.get(orgId.value, projectId);
    project.value = res.data.data;
  } catch (err: any) {
    if (err?.response?.status === 404) notFound.value = true;
    else { notify('Failed to load project.', 'error'); router.push({ name: 'projects' }); }
  } finally {
    loading.value = false;
  }
}

async function loadDocuments() {
  const [inv, rec, lh] = await Promise.allSettled([
    ProjectService.listInvoices(orgId.value, projectId),
    ProjectService.listReceipts(orgId.value, projectId),
    ProjectService.listLetterheads(orgId.value, projectId),
  ]);
  if (inv.status === 'fulfilled') invoices.value = inv.value.data.data;
  if (rec.status === 'fulfilled') receipts.value = rec.value.data.data;
  if (lh.status === 'fulfilled')  letterheads.value = lh.value.data.data;
}

async function loadFiles() {
  try {
    const res = await ProjectService.listFiles(orgId.value, projectId);
    files.value = res.data.data;
  } catch { /* non-critical */ }
}

async function loadActivities() {
  try {
    const res = await ProjectService.listActivities(orgId.value, projectId, { per_page: 50 });
    const paged = res.data.data as any;
    activities.value = paged.data ?? paged;
    activityLastPage.value = paged.last_page ?? 1;
  } catch { /* non-critical */ }
}

// ── Delete project ──────────────────────────────────────────
async function handleDelete() {
  isDeleting.value = true;
  try {
    await ProjectService.delete(orgId.value, projectId);
    notify('Project deleted.', 'success');
    router.push({ name: 'projects' });
  } catch {
    notify('Failed to delete project.', 'error');
  } finally {
    isDeleting.value = false;
    showDeleteConfirm.value = false;
  }
}

// ── Attach / detach documents ───────────────────────────────
async function openAttach(type: 'invoice' | 'receipt' | 'letterhead') {
  attachSearch.value = '';
  attachResults.value = [];
  if (type === 'invoice')    showAttachInvoice.value = true;
  if (type === 'receipt')    showAttachReceipt.value = true;
  if (type === 'letterhead') showAttachLetterhead.value = true;
  await searchAttach(type);
}

async function searchAttach(type: 'invoice' | 'receipt' | 'letterhead') {
  attachLoading.value = true;
  try {
    if (type === 'invoice') {
      const res = await InvoiceService.list(orgId.value, { search: attachSearch.value || undefined, per_page: 20 });
      attachResults.value = (res.data.data as any).data ?? [];
    } else if (type === 'receipt') {
      const res = await ReceiptService.list(orgId.value, { search: attachSearch.value || undefined, per_page: 20 });
      attachResults.value = (res.data.data as any).data ?? [];
    } else {
      const res = await LetterheadService.list(orgId.value, { search: attachSearch.value || undefined, per_page: 20 });
      attachResults.value = (res.data.data as any).data ?? [];
    }
  } catch { /* non-critical */ }
  finally { attachLoading.value = false; }
}

async function doAttach(type: 'invoice' | 'receipt' | 'letterhead', id: string) {
  isAttaching.value = true;
  try {
    if (type === 'invoice')    await ProjectService.attachInvoice(orgId.value, projectId, id);
    if (type === 'receipt')    await ProjectService.attachReceipt(orgId.value, projectId, id);
    if (type === 'letterhead') await ProjectService.attachLetterhead(orgId.value, projectId, id);
    await Promise.all([loadDocuments(), loadProject()]);
    showAttachInvoice.value = false;
    showAttachReceipt.value = false;
    showAttachLetterhead.value = false;
    notify('Linked successfully.', 'success');
  } catch (err: any) {
    notify(err?.response?.data?.message ?? 'Failed to link.', 'error');
  } finally {
    isAttaching.value = false;
  }
}

async function doDetach(type: 'invoice' | 'receipt' | 'letterhead', id: string) {
  try {
    if (type === 'invoice')    await ProjectService.detachInvoice(orgId.value, projectId, id);
    if (type === 'receipt')    await ProjectService.detachReceipt(orgId.value, projectId, id);
    if (type === 'letterhead') await ProjectService.detachLetterhead(orgId.value, projectId, id);
    await Promise.all([loadDocuments(), loadProject()]);
    notify('Removed.', 'success');
  } catch {
    notify('Failed to remove.', 'error');
  }
}

// ── Files ───────────────────────────────────────────────────
async function handleAddFile() {
  if (!fileForm.value.name.trim() || !fileForm.value.url.trim()) {
    notify('Name and URL are required.', 'error');
    return;
  }
  isSavingFile.value = true;
  try {
    await ProjectService.addFile(orgId.value, projectId, {
      name: fileForm.value.name.trim(),
      type: fileForm.value.type,
      url: fileForm.value.url.trim(),
      file_size: fileForm.value.file_size ? parseInt(fileForm.value.file_size) : undefined,
      mime_type: fileForm.value.mime_type || undefined,
    });
    await loadFiles();
    showAddFile.value = false;
    fileForm.value = { name: '', type: 'url', url: '', file_size: '', mime_type: '' };
    notify('File added.', 'success');
  } catch {
    notify('Failed to add file.', 'error');
  } finally {
    isSavingFile.value = false;
  }
}

async function handleDeleteFile(fileId: string) {
  try {
    await ProjectService.deleteFile(orgId.value, projectId, fileId);
    files.value = files.value.filter(f => f.id !== fileId);
    notify('File removed.', 'success');
  } catch {
    notify('Failed to remove file.', 'error');
  }
}

// ── Notes ───────────────────────────────────────────────────
async function handleAddNote() {
  if (!noteText.value.trim()) return;
  isSavingNote.value = true;
  try {
    await ProjectService.addNote(orgId.value, projectId, noteText.value.trim());
    noteText.value = '';
    await loadActivities();
    notify('Note added.', 'success');
  } catch {
    notify('Failed to add note.', 'error');
  } finally {
    isSavingNote.value = false;
  }
}

// ── Client ───────────────────────────────────────────────────
async function openAssignClient() {
  clientSearch.value = '';
  clientResults.value = [];
  showAssignClient.value = true;
  await searchClients();
}

async function searchClients() {
  clientSearching.value = true;
  try {
    const res = await ClientService.list(orgId.value, {
      search: clientSearch.value || undefined,
      per_page: 20,
    });
    clientResults.value = res.data.data.data;
  } catch { /* non-critical */ }
  finally { clientSearching.value = false; }
}

async function assignClient(clientId: string | null) {
  isAssigningClient.value = true;
  try {
    const res = await ProjectService.update(orgId.value, projectId, { client_id: clientId });
    project.value = res.data.data;
    showAssignClient.value = false;
    notify(clientId ? 'Client assigned.' : 'Client removed.', 'success');
  } catch {
    notify('Failed to update client.', 'error');
  } finally {
    isAssigningClient.value = false;
  }
}

// ── Helpers ─────────────────────────────────────────────────
const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    draft:     'bg-charcoal-600 text-cream-muted border-charcoal-500',
    active:    'bg-green-500/10 text-green-400 border-green-500/20',
    on_hold:   'bg-amber/10 text-amber border-amber/20',
    completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return 'text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ' + (map[status] ?? map.draft);
};

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    draft: 'Draft', active: 'Active', on_hold: 'On Hold',
    completed: 'Completed', cancelled: 'Cancelled',
  };
  return map[status] ?? status;
};

const activityIcon = (type: string) => {
  const map: Record<string, string> = {
    project_created: 'lucide:folder-plus',
    status_changed:  'lucide:refresh-cw',
    invoice_linked:  'lucide:file-text',
    invoice_unlinked: 'lucide:file-x',
    receipt_linked:  'lucide:receipt',
    receipt_unlinked: 'lucide:receipt',
    letterhead_linked: 'lucide:file',
    letterhead_unlinked: 'lucide:file',
    note:            'lucide:message-square',
  };
  return map[type] ?? 'lucide:activity';
};

function formatDate(dt: string) {
  return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(dt: string) {
  return new Date(dt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

const paidPercent = computed(() => project.value?.financials?.paid_percent ?? 0);
</script>

<template>
  <div class="p-4 md:p-6 space-y-5 min-h-full">

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <Icon icon="lucide:loader-2" class="w-6 h-6 text-cream-faint animate-spin" />
    </div>

    <!-- Not found -->
    <div v-else-if="notFound" class="flex flex-col items-center justify-center py-20 text-center">
      <Icon icon="lucide:folder-x" class="w-10 h-10 text-cream-faint mb-4" />
      <p class="text-cream-faint text-sm">Project not found</p>
      <button @click="router.push({ name: 'projects' })" class="mt-3 text-xs text-amber hover:underline">Back to projects</button>
    </div>

    <template v-else-if="project">

      <!-- Page header -->
      <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div class="flex items-start gap-3">
          <button @click="router.push({ name: 'projects' })" class="mt-0.5 p-1.5 rounded-md hover:bg-charcoal-700 text-cream-faint hover:text-cream transition-colors shrink-0">
            <Icon icon="lucide:arrow-left" class="w-4 h-4" />
          </button>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="page-title">{{ project.title }}</h1>
              <span :class="statusBadge(project.status)">{{ statusLabel(project.status) }}</span>
              <span v-if="project.status_tracking === 'auto'" class="text-[10px] text-amber border border-amber/30 bg-amber/8 px-1.5 py-0.5 rounded-full font-semibold">Auto</span>
            </div>
            <p class="page-subtitle">{{ project.number }}{{ project.client ? ` · ${project.client.name}` : '' }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0 flex-wrap">
          <!-- Create document shortcuts -->
          <div class="flex items-center gap-1.5" v-if="can('invoices.create') || can('receipts.create') || can('letterheads.create')">
            <button
              v-if="can('invoices.create')"
              @click="router.push({ name: 'invoices.create', query: { project_id: projectId } })"
              class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-charcoal-700 hover:bg-charcoal-600 text-cream-muted hover:text-cream text-xs transition-colors"
              title="New Invoice for this project"
            >
              <Icon icon="lucide:file-plus" class="w-3.5 h-3.5" /> Invoice
            </button>
            <button
              v-if="can('receipts.create')"
              @click="router.push({ name: 'receipts.create', query: { project_id: projectId } })"
              class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-charcoal-700 hover:bg-charcoal-600 text-cream-muted hover:text-cream text-xs transition-colors"
              title="New Receipt for this project"
            >
              <Icon icon="lucide:receipt" class="w-3.5 h-3.5" /> Receipt
            </button>
            <button
              v-if="can('letterheads.create')"
              @click="router.push({ name: 'letterheads.create', query: { project_id: projectId } })"
              class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-charcoal-700 hover:bg-charcoal-600 text-cream-muted hover:text-cream text-xs transition-colors"
              title="New Letterhead for this project"
            >
              <Icon icon="lucide:file" class="w-3.5 h-3.5" /> Letterhead
            </button>
          </div>

          <div v-if="can('projects.update')" class="flex items-center gap-1.5">
            <button
              @click="router.push({ name: 'projects.edit', params: { id: projectId } })"
              class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber/10 hover:bg-amber/20 text-amber text-xs transition-colors"
            >
              <Icon icon="lucide:pencil" class="w-3.5 h-3.5" /> Edit
            </button>
            <button
              v-if="can('projects.delete')"
              @click="showDeleteConfirm = true"
              class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-900/20 hover:bg-red-900/40 text-red-400 text-xs transition-colors"
            >
              <Icon icon="lucide:trash-2" class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex items-center gap-1 border-b border-charcoal-700 overflow-x-auto">
        <button
          v-for="tab in (['overview', 'client', 'invoices', 'receipts', 'letterheads', 'files', 'activity'] as Tab[])"
          :key="tab"
          @click="activeTab = tab"
          :class="[
            'px-3 py-2 text-xs font-medium capitalize transition-colors whitespace-nowrap border-b-2 -mb-px',
            activeTab === tab
              ? 'border-amber text-amber'
              : 'border-transparent text-cream-faint hover:text-cream',
          ]"
        >
          {{ { overview: 'Overview', client: 'Client', invoices: 'Invoices', receipts: 'Receipts', letterheads: 'Letterheads', files: 'Files', activity: 'Activity' }[tab] }}
        </button>
      </div>

      <!-- ── Overview tab ──────────────────────────────── -->
      <div v-if="activeTab === 'overview'" class="grid grid-cols-1 md:grid-cols-2 gap-5">

        <!-- Details -->
        <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5 space-y-4">
          <h2 class="text-sm font-semibold text-cream">Details</h2>
          <dl class="space-y-2.5">
            <div class="flex justify-between text-xs">
              <dt class="text-cream-faint">Number</dt>
              <dd class="text-cream font-medium">{{ project.number }}</dd>
            </div>
            <div v-if="project.client" class="flex justify-between text-xs">
              <dt class="text-cream-faint">Client</dt>
              <dd class="text-cream">{{ project.client.name }}</dd>
            </div>
            <div class="flex justify-between text-xs">
              <dt class="text-cream-faint">Status Tracking</dt>
              <dd class="text-cream capitalize">{{ project.status_tracking }}</dd>
            </div>
            <div v-if="project.start_date" class="flex justify-between text-xs">
              <dt class="text-cream-faint">Start Date</dt>
              <dd class="text-cream">{{ formatDate(project.start_date) }}</dd>
            </div>
            <div v-if="project.end_date" class="flex justify-between text-xs">
              <dt class="text-cream-faint">End Date</dt>
              <dd class="text-cream">{{ formatDate(project.end_date) }}</dd>
            </div>
            <div v-if="project.description" class="pt-1">
              <dt class="text-cream-faint text-xs mb-1">Description</dt>
              <dd class="text-cream-muted text-xs leading-relaxed">{{ project.description }}</dd>
            </div>
          </dl>
        </div>

        <!-- Financials -->
        <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5 space-y-4">
          <h2 class="text-sm font-semibold text-cream">Financials</h2>
          <dl class="space-y-2.5">
            <div v-if="project.financials?.contract_value" class="flex justify-between text-xs">
              <dt class="text-cream-faint">Contract Value</dt>
              <dd class="text-cream font-medium">{{ project.currency }} {{ project.financials.contract_value.toLocaleString() }}</dd>
            </div>
            <div class="flex justify-between text-xs">
              <dt class="text-cream-faint">Total Invoiced</dt>
              <dd class="text-cream">{{ project.currency }} {{ (project.financials?.total_invoiced ?? 0).toLocaleString() }}</dd>
            </div>
            <div class="flex justify-between text-xs">
              <dt class="text-cream-faint">Total Received</dt>
              <dd class="text-green-400 font-medium">{{ project.currency }} {{ (project.financials?.total_received ?? 0).toLocaleString() }}</dd>
            </div>
            <div class="flex justify-between text-xs">
              <dt class="text-cream-faint">Balance</dt>
              <dd :class="(project.financials?.balance ?? 0) > 0 ? 'text-amber font-medium' : 'text-cream'">
                {{ project.currency }} {{ (project.financials?.balance ?? 0).toLocaleString() }}
              </dd>
            </div>
          </dl>
          <!-- Progress bar -->
          <div v-if="(project.financials?.total_invoiced ?? 0) > 0">
            <div class="flex justify-between text-[10px] text-cream-faint mb-1">
              <span>Payment progress</span>
              <span>{{ paidPercent }}%</span>
            </div>
            <div class="h-1.5 bg-charcoal-700 rounded-full overflow-hidden">
              <div class="h-full bg-green-500 rounded-full transition-all duration-500" :style="{ width: `${paidPercent}%` }" />
            </div>
          </div>
        </div>

      </div>

      <!-- ── Client tab ───────────────────────────────── -->
      <div v-if="activeTab === 'client'" class="space-y-4 max-w-lg">

        <!-- No client assigned -->
        <div v-if="!project.client" class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-8 flex flex-col items-center text-center gap-3">
          <div class="w-12 h-12 rounded-full bg-charcoal-700 flex items-center justify-center">
            <Icon icon="lucide:user" class="w-5 h-5 text-cream-faint" />
          </div>
          <div>
            <p class="text-sm font-medium text-cream">No client assigned</p>
            <p class="text-xs text-cream-faint mt-0.5">Assign a client to track who this project is for</p>
          </div>
          <button
            v-if="can('projects.update')"
            @click="openAssignClient"
            class="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber hover:bg-amber-light text-charcoal-900 font-semibold text-xs transition-colors"
          >
            <Icon icon="lucide:user-plus" class="w-3.5 h-3.5" /> Assign Client
          </button>
        </div>

        <!-- Client card -->
        <div v-else class="bg-charcoal-800 border border-charcoal-700 rounded-xl overflow-hidden">
          <!-- Card header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-charcoal-700">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-amber/15 flex items-center justify-center shrink-0">
                <span class="text-sm font-bold text-amber">
                  {{ project.client.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() }}
                </span>
              </div>
              <div>
                <div class="text-sm font-semibold text-cream">{{ project.client.name }}</div>
                <div v-if="project.client.company" class="text-xs text-cream-faint">{{ project.client.company }}</div>
              </div>
            </div>
            <button
              @click="router.push({ name: 'clients.view', params: { id: project.client.id } })"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-charcoal-700 hover:bg-charcoal-600 text-cream-muted hover:text-cream text-xs transition-colors"
            >
              <Icon icon="lucide:external-link" class="w-3.5 h-3.5" /> View Client
            </button>
          </div>

          <!-- Contact info -->
          <div class="px-5 py-4 space-y-3">
            <div v-if="project.client.email" class="flex items-center gap-2.5 text-xs">
              <Icon icon="lucide:mail" class="w-3.5 h-3.5 text-cream-faint shrink-0" />
              <span class="text-cream-muted">{{ project.client.email }}</span>
            </div>
            <div v-if="!project.client.email" class="text-xs text-cream-faint italic">No email on record</div>
          </div>

          <!-- Actions -->
          <div v-if="can('projects.update')" class="px-5 py-3 border-t border-charcoal-700 flex items-center gap-2">
            <button
              @click="openAssignClient"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-charcoal-700 hover:bg-charcoal-600 text-cream-muted hover:text-cream text-xs transition-colors"
            >
              <Icon icon="lucide:refresh-cw" class="w-3.5 h-3.5" /> Change Client
            </button>
            <button
              @click="assignClient(null)"
              :disabled="isAssigningClient"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-900/30 text-cream-faint hover:text-red-400 text-xs transition-colors disabled:opacity-40"
            >
              <Icon icon="lucide:user-x" class="w-3.5 h-3.5" /> Remove Client
            </button>
          </div>
        </div>

      </div>

      <!-- ── Invoices tab ──────────────────────────────── -->
      <div v-if="activeTab === 'invoices'" class="space-y-3">
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-medium text-cream">Invoices ({{ invoices.length }})</span>
          <div class="flex items-center gap-2">
            <button
              v-if="can('invoices.create')"
              @click="router.push({ name: 'invoices.create', query: { project_id: projectId } })"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber hover:bg-amber-light text-charcoal-900 font-semibold text-xs transition-colors"
            >
              <Icon icon="lucide:plus" class="w-3.5 h-3.5" /> Create Invoice
            </button>
            <button
              v-if="can('projects.update')"
              @click="openAttach('invoice')"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-charcoal-700 hover:bg-charcoal-600 text-cream-muted hover:text-cream text-xs transition-colors"
            >
              <Icon icon="lucide:link" class="w-3.5 h-3.5" /> Link Existing
            </button>
          </div>
        </div>

        <div v-if="invoices.length === 0" class="text-center py-10 text-cream-faint text-sm">No invoices linked.</div>
        <div v-else class="bg-charcoal-800 border border-charcoal-700 rounded-xl overflow-hidden">
          <div
            v-for="(inv, i) in invoices" :key="inv.id"
            :class="['flex items-center gap-3 px-4 py-3 hover:bg-charcoal-700/40 transition-colors group', i < invoices.length - 1 ? 'border-b border-charcoal-700/60' : '']"
          >
            <Icon icon="lucide:file-text" class="w-4 h-4 text-cream-faint shrink-0" />
            <div class="flex-1 min-w-0">
              <div class="text-xs font-medium text-cream">{{ inv.number }}</div>
              <div class="text-[11px] text-cream-faint">{{ inv.to_name ?? '—' }} · {{ inv.issue_date ?? '—' }}</div>
            </div>
            <span :class="statusBadge(inv.status)">{{ statusLabel(inv.status) }}</span>
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button @click="router.push({ name: 'invoices.view', params: { id: inv.id } })" class="p-1.5 rounded hover:bg-charcoal-600 text-cream-faint hover:text-cream transition-colors">
                <Icon icon="lucide:external-link" class="w-3.5 h-3.5" />
              </button>
              <button v-if="can('projects.update')" @click="doDetach('invoice', inv.id)" class="p-1.5 rounded hover:bg-red-900/30 text-cream-faint hover:text-red-400 transition-colors">
                <Icon icon="lucide:unlink" class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Receipts tab ──────────────────────────────── -->
      <div v-if="activeTab === 'receipts'" class="space-y-3">
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-medium text-cream">Receipts ({{ receipts.length }})</span>
          <div class="flex items-center gap-2">
            <button
              v-if="can('receipts.create')"
              @click="router.push({ name: 'receipts.create', query: { project_id: projectId } })"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber hover:bg-amber-light text-charcoal-900 font-semibold text-xs transition-colors"
            >
              <Icon icon="lucide:plus" class="w-3.5 h-3.5" /> Create Receipt
            </button>
            <button
              v-if="can('projects.update')"
              @click="openAttach('receipt')"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-charcoal-700 hover:bg-charcoal-600 text-cream-muted hover:text-cream text-xs transition-colors"
            >
              <Icon icon="lucide:link" class="w-3.5 h-3.5" /> Link Existing
            </button>
          </div>
        </div>

        <div v-if="receipts.length === 0" class="text-center py-10 text-cream-faint text-sm">No receipts linked.</div>
        <div v-else class="bg-charcoal-800 border border-charcoal-700 rounded-xl overflow-hidden">
          <div
            v-for="(rec, i) in receipts" :key="rec.id"
            :class="['flex items-center gap-3 px-4 py-3 hover:bg-charcoal-700/40 transition-colors group', i < receipts.length - 1 ? 'border-b border-charcoal-700/60' : '']"
          >
            <Icon icon="lucide:receipt" class="w-4 h-4 text-cream-faint shrink-0" />
            <div class="flex-1 min-w-0">
              <div class="text-xs font-medium text-cream">{{ rec.number }}</div>
              <div class="text-[11px] text-cream-faint">{{ rec.to_name ?? '—' }} · {{ rec.paid_at ?? '—' }}</div>
            </div>
            <span v-if="rec.stamp" class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-charcoal-500 bg-charcoal-600 text-cream-muted">{{ rec.stamp }}</span>
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button @click="router.push({ name: 'receipts.view', params: { id: rec.id } })" class="p-1.5 rounded hover:bg-charcoal-600 text-cream-faint hover:text-cream transition-colors">
                <Icon icon="lucide:external-link" class="w-3.5 h-3.5" />
              </button>
              <button v-if="can('projects.update')" @click="doDetach('receipt', rec.id)" class="p-1.5 rounded hover:bg-red-900/30 text-cream-faint hover:text-red-400 transition-colors">
                <Icon icon="lucide:unlink" class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Letterheads tab ──────────────────────────── -->
      <div v-if="activeTab === 'letterheads'" class="space-y-3">
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-medium text-cream">Letterheads ({{ letterheads.length }})</span>
          <div class="flex items-center gap-2">
            <button
              v-if="can('letterheads.create')"
              @click="router.push({ name: 'letterheads.create', query: { project_id: projectId } })"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber hover:bg-amber-light text-charcoal-900 font-semibold text-xs transition-colors"
            >
              <Icon icon="lucide:plus" class="w-3.5 h-3.5" /> Create Letterhead
            </button>
            <button
              v-if="can('projects.update')"
              @click="openAttach('letterhead')"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-charcoal-700 hover:bg-charcoal-600 text-cream-muted hover:text-cream text-xs transition-colors"
            >
              <Icon icon="lucide:link" class="w-3.5 h-3.5" /> Link Existing
            </button>
          </div>
        </div>

        <div v-if="letterheads.length === 0" class="text-center py-10 text-cream-faint text-sm">No letterheads linked.</div>
        <div v-else class="bg-charcoal-800 border border-charcoal-700 rounded-xl overflow-hidden">
          <div
            v-for="(lh, i) in letterheads" :key="lh.id"
            :class="['flex items-center gap-3 px-4 py-3 hover:bg-charcoal-700/40 transition-colors group', i < letterheads.length - 1 ? 'border-b border-charcoal-700/60' : '']"
          >
            <Icon icon="lucide:file" class="w-4 h-4 text-cream-faint shrink-0" />
            <div class="flex-1 min-w-0">
              <div class="text-xs font-medium text-cream">{{ lh.name }}</div>
              <div class="text-[11px] text-cream-faint">{{ formatDate(lh.created_at) }}</div>
            </div>
            <span :class="statusBadge(lh.status)">{{ statusLabel(lh.status) }}</span>
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button @click="router.push({ name: 'letterheads.view', params: { id: lh.id } })" class="p-1.5 rounded hover:bg-charcoal-600 text-cream-faint hover:text-cream transition-colors">
                <Icon icon="lucide:external-link" class="w-3.5 h-3.5" />
              </button>
              <button v-if="can('projects.update')" @click="doDetach('letterhead', lh.id)" class="p-1.5 rounded hover:bg-red-900/30 text-cream-faint hover:text-red-400 transition-colors">
                <Icon icon="lucide:unlink" class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Files tab ─────────────────────────────────── -->
      <div v-if="activeTab === 'files'" class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-cream">Files ({{ files.length }})</span>
          <button v-if="can('projects.update')" @click="showAddFile = true" class="flex items-center gap-1.5 text-xs text-amber hover:text-amber-light transition-colors">
            <Icon icon="lucide:plus" class="w-3.5 h-3.5" /> Add File
          </button>
        </div>

        <div v-if="files.length === 0" class="text-center py-10 text-cream-faint text-sm">No files yet.</div>
        <div v-else class="bg-charcoal-800 border border-charcoal-700 rounded-xl overflow-hidden">
          <div
            v-for="(file, i) in files" :key="file.id"
            :class="['flex items-center gap-3 px-4 py-3 group', i < files.length - 1 ? 'border-b border-charcoal-700/60' : '']"
          >
            <Icon :icon="file.type === 'upload' ? 'lucide:file-up' : 'lucide:link'" class="w-4 h-4 text-cream-faint shrink-0" />
            <div class="flex-1 min-w-0">
              <a :href="file.url" target="_blank" rel="noopener noreferrer" class="text-xs font-medium text-cream hover:text-amber transition-colors truncate block">{{ file.name }}</a>
              <div class="text-[11px] text-cream-faint">
                {{ file.mime_type ?? file.type }}{{ file.file_size ? ` · ${formatBytes(file.file_size)}` : '' }}
              </div>
            </div>
            <button v-if="can('projects.update')" @click="handleDeleteFile(file.id)" class="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-900/30 text-cream-faint hover:text-red-400 transition-all">
              <Icon icon="lucide:trash-2" class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <!-- ── Activity tab ──────────────────────────────── -->
      <div v-if="activeTab === 'activity'" class="space-y-4">
        <!-- Add note -->
        <div v-if="can('projects.update')" class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4 space-y-3">
          <label class="text-xs font-medium text-cream">Add a Note</label>
          <textarea
            v-model="noteText"
            class="app-inp resize-none w-full text-xs"
            rows="3"
            placeholder="Write a note or update…"
          />
          <div class="flex justify-end">
            <button
              @click="handleAddNote"
              :disabled="!noteText.trim() || isSavingNote"
              class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber hover:bg-amber-light text-charcoal-900 font-semibold text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Icon v-if="isSavingNote" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
              {{ isSavingNote ? 'Saving…' : 'Add Note' }}
            </button>
          </div>
        </div>

        <!-- Timeline -->
        <div v-if="activities.length === 0" class="text-center py-10 text-cream-faint text-sm">No activity yet.</div>
        <div v-else class="relative space-y-0 before:absolute before:left-5 before:top-0 before:bottom-0 before:w-px before:bg-charcoal-700">
          <div v-for="activity in activities" :key="activity.id" class="flex items-start gap-3 relative pl-0">
            <div class="w-10 h-10 rounded-full bg-charcoal-700 border border-charcoal-600 flex items-center justify-center shrink-0 z-10">
              <Icon :icon="activityIcon(activity.type)" class="w-4 h-4 text-cream-faint" />
            </div>
            <div class="flex-1 pb-5 min-w-0">
              <div class="text-xs font-medium text-cream">{{ activity.title }}</div>
              <div v-if="activity.body" class="text-xs text-cream-muted mt-0.5 leading-relaxed">{{ activity.body }}</div>
              <div class="text-[11px] text-cream-faint mt-1 flex items-center gap-2">
                <span v-if="activity.user">{{ activity.user.name }}</span>
                <span>{{ formatDateTime(activity.created_at) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </template>

    <!-- ── Delete confirm modal ─────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-200 flex items-center justify-center p-4" @click.self="showDeleteConfirm = false">
          <div class="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 class="text-lg font-semibold text-cream mb-2">Delete Project?</h2>
            <p class="text-sm text-cream-faint mb-5">This will permanently delete this project. Linked invoices and receipts will not be deleted.</p>
            <div class="flex gap-2">
              <button @click="showDeleteConfirm = false" class="flex-1 py-2 rounded-lg bg-charcoal-700 hover:bg-charcoal-600 text-cream-muted text-sm transition-colors">Cancel</button>
              <button @click="handleDelete" :disabled="isDeleting" class="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                <Icon v-if="isDeleting" icon="lucide:loader-2" class="w-4 h-4 animate-spin" />
                {{ isDeleting ? 'Deleting…' : 'Delete' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Attach Invoice modal -->
      <Transition name="modal">
        <div v-if="showAttachInvoice" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-200 flex items-center justify-center p-4" @click.self="showAttachInvoice = false">
          <div class="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-5 w-full max-w-md shadow-2xl">
            <h2 class="text-base font-semibold text-cream mb-4">Link Invoice</h2>
            <div class="relative mb-3">
              <Icon icon="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cream-faint" />
              <input v-model="attachSearch" @input="searchAttach('invoice')" class="app-inp pl-8 text-xs" placeholder="Search invoices…" />
            </div>
            <div v-if="attachLoading" class="flex justify-center py-6"><Icon icon="lucide:loader-2" class="w-5 h-5 animate-spin text-cream-faint" /></div>
            <div v-else class="space-y-1 max-h-64 overflow-y-auto">
              <button
                v-for="inv in attachResults" :key="inv.id"
                @click="doAttach('invoice', inv.id)"
                :disabled="isAttaching"
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-charcoal-700 transition-colors text-left disabled:opacity-50"
              >
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-medium text-cream">{{ inv.number }}</div>
                  <div class="text-[11px] text-cream-faint">{{ inv.to_name ?? '—' }}</div>
                </div>
                <span :class="statusBadge(inv.status)">{{ statusLabel(inv.status) }}</span>
              </button>
              <div v-if="attachResults.length === 0" class="text-center py-6 text-cream-faint text-xs">No invoices found</div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Attach Receipt modal -->
      <Transition name="modal">
        <div v-if="showAttachReceipt" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-200 flex items-center justify-center p-4" @click.self="showAttachReceipt = false">
          <div class="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-5 w-full max-w-md shadow-2xl">
            <h2 class="text-base font-semibold text-cream mb-4">Link Receipt</h2>
            <div class="relative mb-3">
              <Icon icon="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cream-faint" />
              <input v-model="attachSearch" @input="searchAttach('receipt')" class="app-inp pl-8 text-xs" placeholder="Search receipts…" />
            </div>
            <div v-if="attachLoading" class="flex justify-center py-6"><Icon icon="lucide:loader-2" class="w-5 h-5 animate-spin text-cream-faint" /></div>
            <div v-else class="space-y-1 max-h-64 overflow-y-auto">
              <button
                v-for="rec in attachResults" :key="rec.id"
                @click="doAttach('receipt', rec.id)"
                :disabled="isAttaching"
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-charcoal-700 transition-colors text-left disabled:opacity-50"
              >
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-medium text-cream">{{ rec.number }}</div>
                  <div class="text-[11px] text-cream-faint">{{ rec.to_name ?? '—' }}</div>
                </div>
                <span :class="statusBadge(rec.status)">{{ statusLabel(rec.status) }}</span>
              </button>
              <div v-if="attachResults.length === 0" class="text-center py-6 text-cream-faint text-xs">No receipts found</div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Attach Letterhead modal -->
      <Transition name="modal">
        <div v-if="showAttachLetterhead" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-200 flex items-center justify-center p-4" @click.self="showAttachLetterhead = false">
          <div class="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-5 w-full max-w-md shadow-2xl">
            <h2 class="text-base font-semibold text-cream mb-4">Link Letterhead</h2>
            <div class="relative mb-3">
              <Icon icon="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cream-faint" />
              <input v-model="attachSearch" @input="searchAttach('letterhead')" class="app-inp pl-8 text-xs" placeholder="Search letterheads…" />
            </div>
            <div v-if="attachLoading" class="flex justify-center py-6"><Icon icon="lucide:loader-2" class="w-5 h-5 animate-spin text-cream-faint" /></div>
            <div v-else class="space-y-1 max-h-64 overflow-y-auto">
              <button
                v-for="lh in attachResults" :key="lh.id"
                @click="doAttach('letterhead', lh.id)"
                :disabled="isAttaching"
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-charcoal-700 transition-colors text-left disabled:opacity-50"
              >
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-medium text-cream">{{ lh.name }}</div>
                  <div class="text-[11px] text-cream-faint">{{ formatDate(lh.created_at) }}</div>
                </div>
                <span :class="statusBadge(lh.status)">{{ statusLabel(lh.status) }}</span>
              </button>
              <div v-if="attachResults.length === 0" class="text-center py-6 text-cream-faint text-xs">No letterheads found</div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Add File modal -->
      <Transition name="modal">
        <div v-if="showAddFile" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-200 flex items-center justify-center p-4" @click.self="showAddFile = false">
          <div class="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-5 w-full max-w-sm shadow-2xl">
            <h2 class="text-base font-semibold text-cream mb-4">Add File</h2>
            <div class="space-y-3">
              <div>
                <label class="app-label">Name</label>
                <input v-model="fileForm.name" class="app-inp" placeholder="Design mockup" />
              </div>
              <div>
                <label class="app-label">Type</label>
                <div class="flex gap-2 mt-1">
                  <button
                    @click="fileForm.type = 'url'"
                    :class="['flex-1 py-2 rounded-lg text-xs border transition-colors', fileForm.type === 'url' ? 'border-amber/40 bg-amber/6 text-amber' : 'border-charcoal-600 text-cream-faint hover:border-charcoal-500']"
                  >Link / URL</button>
                  <button
                    @click="fileForm.type = 'upload'"
                    :class="['flex-1 py-2 rounded-lg text-xs border transition-colors', fileForm.type === 'upload' ? 'border-amber/40 bg-amber/6 text-amber' : 'border-charcoal-600 text-cream-faint hover:border-charcoal-500']"
                  >Uploaded File</button>
                </div>
              </div>
              <div>
                <label class="app-label">URL</label>
                <input v-model="fileForm.url" class="app-inp" placeholder="https://…" />
              </div>
            </div>
            <div class="flex gap-2 mt-5">
              <button @click="showAddFile = false" class="flex-1 py-2 rounded-lg bg-charcoal-700 hover:bg-charcoal-600 text-cream-muted text-sm transition-colors">Cancel</button>
              <button @click="handleAddFile" :disabled="isSavingFile" class="flex-1 py-2 rounded-lg bg-amber hover:bg-amber-light text-charcoal-900 font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                <Icon v-if="isSavingFile" icon="lucide:loader-2" class="w-4 h-4 animate-spin" />
                {{ isSavingFile ? 'Adding…' : 'Add File' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Assign Client modal -->
      <Transition name="modal">
        <div v-if="showAssignClient" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-200 flex items-center justify-center p-4" @click.self="showAssignClient = false">
          <div class="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-5 w-full max-w-md shadow-2xl">
            <h2 class="text-base font-semibold text-cream mb-4">{{ project?.client ? 'Change Client' : 'Assign Client' }}</h2>
            <div class="relative mb-3">
              <Icon icon="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cream-faint" />
              <input
                v-model="clientSearch"
                @input="searchClients"
                class="w-full bg-charcoal-700 border border-charcoal-600 rounded-lg text-cream text-xs pl-8 pr-3 py-2 outline-none placeholder-[#6b6560] focus:border-amber/40 transition-colors"
                placeholder="Search clients…"
                autofocus
              />
            </div>
            <div v-if="clientSearching" class="flex justify-center py-6">
              <Icon icon="lucide:loader-2" class="w-5 h-5 animate-spin text-cream-faint" />
            </div>
            <div v-else class="space-y-1 max-h-72 overflow-y-auto">
              <button
                v-for="c in clientResults" :key="c.id"
                @click="assignClient(c.id)"
                :disabled="isAssigningClient"
                :class="[
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left disabled:opacity-50',
                  project?.client?.id === c.id ? 'bg-amber/8 border border-amber/20' : 'hover:bg-charcoal-700',
                ]"
              >
                <div class="w-8 h-8 rounded-full bg-charcoal-600 flex items-center justify-center shrink-0">
                  <span class="text-xs font-bold text-cream-muted">
                    {{ c.full_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() }}
                  </span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-medium text-cream truncate">{{ c.full_name }}</div>
                  <div v-if="c.company" class="text-[11px] text-cream-faint truncate">{{ c.company }}</div>
                </div>
                <Icon v-if="project?.client?.id === c.id" icon="lucide:check" class="w-3.5 h-3.5 text-amber shrink-0" />
              </button>
              <div v-if="clientResults.length === 0" class="text-center py-6 text-cream-faint text-xs">No clients found</div>
            </div>
            <button @click="showAssignClient = false" class="mt-4 w-full py-2 rounded-lg bg-charcoal-700 hover:bg-charcoal-600 text-cream-muted text-xs transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<style scoped>
.modal-enter-active { transition: opacity 0.2s ease; }
.modal-leave-active { transition: opacity 0.15s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
