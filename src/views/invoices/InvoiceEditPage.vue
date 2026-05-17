<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import InvoiceEditor from './InvoiceEditor.vue'

const route = useRoute()
const isLoading = ref(true)
const notFound  = ref(false)
const initialData = ref<Record<string, any> | undefined>(undefined)

const mockInvoices = [
  {
    number: 'INV-0042', stamp: 'PAID', theme: 'classic', accentColor: '#E8A83E',
    fromName: 'Acme Design Studio', fromTagline: 'Creative Agency & Digital Studio',
    fromEmail: 'hello@acme.studio', fromPhone: '+1 415 555 0199', fromWebsite: 'www.acme.studio',
    fromAddress: '123 Design Street\nSan Francisco, CA 94105',
    toName: 'Globex Corp', toCompany: 'Globex Corporation', toEmail: 'billing@globex.com',
    toPhone: '+1 212 555 0100', toAddress: '742 Evergreen Terrace\nSpringfield, IL 62701',
    issueDate: '2025-03-15', dueDate: '2025-04-14', paymentTerms: 'Net 30', currency: 'USD',
    discount: 0, discountType: 'percent',
    taxes: [{ id: 1, label: 'Tax', rate: 0 }],
    notes: 'Payment due within 30 days. Thank you for your business.',
    items: [
      { id: 1, description: 'Brand Identity Design', qty: 1, unit: 'project', rate: 3500 },
      { id: 2, description: 'Web Development', qty: 40, unit: 'hrs', rate: 100 },
      { id: 3, description: 'Hosting Setup', qty: 1, unit: 'project', rate: 1050 },
    ],
  },
  {
    number: 'INV-0041', stamp: '', theme: 'modern', accentColor: '#a78bfa',
    fromName: 'Acme Design Studio', fromTagline: 'Creative Agency & Digital Studio',
    fromEmail: 'hello@acme.studio', fromPhone: '+1 415 555 0199', fromWebsite: 'www.acme.studio',
    fromAddress: '123 Design Street\nSan Francisco, CA 94105',
    toName: 'Pixel Works', toCompany: 'Pixel Works Ltd', toEmail: 'accounts@pxl.io',
    toPhone: '+44 20 7946 0958', toAddress: '10 Downing St\nLondon SW1A 2AA',
    issueDate: '2025-03-10', dueDate: '2025-04-10', paymentTerms: 'Net 30', currency: 'GBP',
    discount: 5, discountType: 'percent',
    taxes: [{ id: 1, label: 'VAT', rate: 20 }],
    notes: 'Includes 20% VAT. Payment via bank transfer preferred.',
    items: [
      { id: 1, description: 'UI Component Library', qty: 1, unit: 'project', rate: 2800 },
      { id: 2, description: 'Design Review Session', qty: 2, unit: 'hrs', rate: 200 },
    ],
  },
  {
    number: 'INV-0038', stamp: 'DRAFT', theme: 'minimal', accentColor: '#e8a83e',
    fromName: 'Acme Design Studio', fromTagline: 'Creative Agency & Digital Studio',
    fromEmail: 'hello@acme.studio', fromPhone: '+1 415 555 0199', fromWebsite: 'www.acme.studio',
    fromAddress: '123 Design Street\nSan Francisco, CA 94105',
    toName: 'Studio X', toCompany: '', toEmail: 'hello@studiox.co',
    toPhone: '+1 415 555 0199', toAddress: '555 Mission St\nSan Francisco, CA 94105',
    issueDate: '2025-03-18', dueDate: '2025-04-17', paymentTerms: 'Net 30', currency: 'USD',
    discount: 0, discountType: 'percent',
    taxes: [{ id: 1, label: 'Tax', rate: 0 }],
    notes: 'Production design and creative direction for Q2 campaign.',
    items: [
      { id: 1, description: 'Production Design', qty: 1, unit: 'project', rate: 4200 },
      { id: 2, description: 'Creative Direction', qty: 20, unit: 'hrs', rate: 140 },
    ],
  },
]

onMounted(async () => {
  await new Promise(r => setTimeout(r, 350))
  const id   = Number(route.params.id)
  const data = mockInvoices.find((_, i) => i + 1 === id) ?? mockInvoices[0]
  if (!data) { notFound.value = true; isLoading.value = false; return }
  initialData.value = { ...data, items: data.items.map(i => ({ ...i })) }
  isLoading.value = false
})
</script>

<template>
  <div v-if="isLoading" class="flex items-center justify-center h-screen bg-charcoal-900">
    <Icon icon="lucide:loader-2" class="w-6 h-6 text-cream-faint animate-spin" />
  </div>

  <div v-else-if="notFound" class="flex flex-col items-center justify-center h-screen bg-charcoal-900">
    <p class="text-cream-faint">Invoice not found</p>
    <button @click="$router.push({ name: 'invoices' })" class="mt-4 text-amber text-sm hover:underline">
      Back to invoices
    </button>
  </div>

  <InvoiceEditor v-else mode="edit" :initial-data="initialData" />
</template>
