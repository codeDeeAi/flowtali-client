<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useSeo } from '@/composables/useSeo'
import { useHead } from '@unhead/vue'
import { SubscriptionService, type ISubscriptionPlan } from '@/services/subscription.service'
import { TestimonialService, type ITestimonial } from '@/services/testimonial.service'

useSeo({
  title: 'Flowtali — Invoices, Receipts, Projects & Letterheads for Freelancers',
  description: 'Create professional invoices, payment receipts, and branded letterheads — then organize everything under projects. Multi-currency, real-time preview, PDF export, client management, and team roles. Free to start.',
  canonical: 'https://flowtali.com/',
})

// JSON-LD structured data for search engines + AI crawlers
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Flowtali',
        url: 'https://flowtali.com',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description: 'Complete business document platform for freelancers and small teams: invoices, payment receipts, project tracking, branded letterheads, client management, and team roles.',
        offers: [
          { '@type': 'Offer', price: '0', priceCurrency: 'USD', name: 'Starter' },
          { '@type': 'Offer', price: '10', priceCurrency: 'USD', name: 'Pro', priceSpecification: { billingDuration: 'P1Y' } },
          { '@type': 'Offer', price: '23', priceCurrency: 'USD', name: 'Business', priceSpecification: { billingDuration: 'P1Y' } },
        ],
        featureList: [
          'Real-time invoice preview',
          'One-click PDF export',
          'Payment receipt generation',
          'Project management with linked documents',
          'Custom branding and logo',
          'Multi-currency support',
          'Letterhead generator with 8 templates',
          'Stamp and watermark tools',
          'Client management',
          'Team roles and permissions',
          'Activity timeline per project',
          'File attachments per project',
        ],
      }),
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Flowtali',
        url: 'https://flowtali.com',
        logo: 'https://flowtali.com/logo.png',
        sameAs: ['https://twitter.com/flowtali'],
      }),
    },
  ],
})

// ── LANDING DATA ──
const mockItems = [
  { name: 'Brand Design', qty: 1, amount: '3,500' },
  { name: 'Web Dev (40h)', qty: 40, amount: '4,000' },
  { name: 'Hosting Setup', qty: 1, amount: '1,050' },
];
const brands = ['Notion', 'Figma', 'Stripe', 'Linear', 'Vercel', 'Loom'];

const features = [
  { title: 'Live Preview', isNew: false, desc: 'See invoices and letterheads update in real time as you type. Zero guessing — what you see is exactly what your client receives.', icon: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12s1.5-3 4-3 4 3 4 3-1.5 3-4 3-4-3-4-3z"/><circle cx="12" cy="12" r="1.5"/>' },
  { title: 'PDF Export', isNew: false, desc: 'Export pixel-perfect PDFs with one click. Print-ready invoices, receipts, and branded letterheads — ready to send in seconds.', icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M16 13H8M16 17H8M10 9H8"/>' },
  { title: 'Receipt Tracking', isNew: true, desc: 'Generate professional payment receipts in seconds. Attach to invoices, link to projects, and keep a clear record of every payment received.', icon: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1z"/><path d="M14 8H8M14 12H8M11 16H8"/>' },
  { title: 'Project Management', isNew: true, desc: 'Group invoices, receipts, letterheads, and files under a single project. Track contract value, payment progress, and client in one place.', icon: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><path d="M12 11v6M8 13v4M16 9v8"/>' },
  { title: 'Letterhead Generator', isNew: false, desc: '8 elegant templates for formal letters, proposals, and engagements. Full branding — logo, signature, colors, watermark, and footer.', icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>' },
  { title: 'Custom Branding', isNew: false, desc: 'Upload your logo and signature, pick accent colors, choose fonts. Every document looks unmistakably yours.', icon: '<circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/>' },
  { title: 'Multi-Currency', isNew: false, desc: 'Invoice and receipt clients globally in USD, EUR, GBP, NGN, and 7+ currencies. Automatic symbols and formatting per locale.', icon: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>' },
  { title: 'Team Roles & Permissions', isNew: true, desc: 'Invite team members and control exactly what they can access. Granular permissions for invoices, receipts, projects, clients, and more.', icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
  { title: 'Watermarks & Stamps', isNew: false, desc: 'Add custom watermarks to letterheads and status stamps to invoices. CONFIDENTIAL, APPROVED, DRAFT — or any text you need.', icon: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>' },
];

const letterheadFeatures = [
  '5 stunning layout templates: Classic, Modern, Minimal, Bold Header, Split Panel',
  'Upload your logo and signature image',
  'Custom accent colors + 10 preset palettes',
  '6 professional font families',
  'Optional watermark text (CONFIDENTIAL, DRAFT…)',
  'Recipient block, reference line, and footer customization',
  'One-click PDF export — print-ready every time',
];

const lhTemplatePreviews = [
  { name: 'Classic', color: '#00c853', font: "var(--font-sans)", tagline: 'Timeless & professional', preview: 'Dear Mr. Johnson, We are pleased to confirm our engagement for the Q1 brand identity project. This proposal outlines scope, deliverables, and timeline…' },
  { name: 'Modern', color: '#4f86c6', font: "var(--font-sans)", tagline: 'Clean & contemporary', preview: 'Subject: Project Kickoff — Q1 2025. Following our initial call, we are delighted to present the formal engagement letter for review…' },
  { name: 'Minimal', color: '#5ab88a', font: "'Lato',sans-serif", tagline: 'Simple & elegant', preview: 'Hello, Thank you for choosing us for this project. Please find below the terms and conditions of our engagement…' },
  { name: 'Bold', color: '#e05a5a', font: "'Montserrat',sans-serif", tagline: 'Strong & impactful', preview: 'Dear Client, We write to formally confirm the commencement of the brand refresh initiative scheduled to begin…' },
];

const billing = ref<'monthly' | 'annual'>('annual');
const currency = ref<'NGN' | 'USD'>('USD');
const apiPlans = ref<ISubscriptionPlan[]>([]);
const plansLoading = ref(false);

const staticPlanData: Record<string, { desc: string; cta: string; featured: boolean; features: string[] }> = {
  starter: {
    desc: 'Perfect for freelancers starting out.',
    cta: 'Start free',
    featured: false,
    features: ['5 invoices + 3 letterheads/month', '10 receipts/month', '1 active project', 'Basic templates', 'PDF export', 'Flowtali branding'],
  },
  pro: {
    desc: 'For active freelancers who need full power.',
    cta: 'Get started',
    featured: true,
    features: ['Unlimited invoices, receipts & letterheads', 'Unlimited projects', 'All 8 letterhead templates', 'Custom branding & logo', 'All currencies', 'Stamp + watermark', 'Remove Flowtali branding', 'Priority support'],
  },
  business: {
    desc: 'For studios and small teams.',
    cta: 'Get started',
    featured: false,
    features: ['Everything in Pro', 'Up to 5 team members', 'Team roles & permissions', 'Project activity timeline', 'Invoice analytics', 'Dedicated support'],
  },
};

const annualDiscount = computed(() => {
  const pro = apiPlans.value.find(p => p.slug === 'pro');
  if (!pro) return 20;
  const prices = pro.prices[currency.value];
  if (!prices.monthly) return 0;
  return Math.round((1 - (prices.annual / 12) / prices.monthly) * 100);
});

const displayPlans = computed(() => {
  if (!apiPlans.value.length) return [];
  return apiPlans.value.map(plan => {
    const meta = staticPlanData[plan.slug] ?? { desc: plan.description, cta: 'Get started', featured: false, features: [] };
    const prices = plan.prices[currency.value];
    const priceDisplay = billing.value === 'annual' && !plan.is_free ? prices.annual_per_month : prices.monthly_display;
    const billedNote = billing.value === 'annual' && !plan.is_free ? `Billed ${prices.annual_display}/year` : null;
    return { name: plan.name, slug: plan.slug, priceDisplay, billedNote, isFree: plan.is_free, ...meta };
  });
});

onMounted(async () => {
  plansLoading.value = true;
  try {
    const res = await SubscriptionService.getPlans();
    apiPlans.value = res.data.data.plans;
    currency.value = res.data.data.recommended_currency;
  } catch {
    // leave empty — section stays hidden
  } finally {
    plansLoading.value = false;
  }

  try {
    const res = await TestimonialService.list();
    testimonials.value = res.data.data;
  } catch {
    // keep fallback data
  }
});

const embedFeatures = [
  { title: 'All views, one SDK', desc: 'Embed invoices, projects, receipts, clients, preferences, analytics, and more. Pass a single view param to switch.', icon: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>' },
  { title: 'Permission-scoped tokens', desc: 'Issue short-lived JWTs for each user with exactly the permissions they need — invoices.read, invoices.create, and more.', icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' },
  { title: 'Runtime theming', desc: 'Match your brand with primaryColor, fontFamily, borderRadius, and more — passed as a plain JS object.', icon: '<circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>' },
  { title: 'Event callbacks', desc: 'React to actions inside the embed with ft.on("invoice.created", cb) — perfect for syncing with your own system.', icon: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>' },
]

const testimonials = ref<ITestimonial[]>([]);

function avatarHue(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

const openFaq = ref<number | null>(null);
const faqs = [
  { q: 'What is Project Management in Flowtali?', a: 'Projects let you group all your work for a client under one place — attach invoices, payment receipts, and letterheads, track contract value vs. payments received, upload project files, add notes, and monitor an activity timeline. Everything for a job in one view.' },
  { q: 'How does Receipt Tracking work?', a: 'After creating an invoice, you can generate a payment receipt for any amount received. Receipts can be linked directly to a project, exported as a PDF, and stamped (e.g. PAID). They appear on both the project overview and the dedicated Receipts section.' },
  { q: 'How do Team Roles & Permissions work?', a: 'Business plans can invite team members and assign granular permissions — for example, a member can create invoices but not delete projects, or view receipts without editing clients. Roles are managed per organisation from the Members settings page.' },
  { q: 'What is the Letterhead Generator?', a: 'The Letterhead Generator lets you create professional branded letterheads for formal letters, proposals, and engagement letters. Choose from 8 templates, upload your logo and signature, set your colors and font, add a watermark, and export a pixel-perfect PDF.' },
  { q: 'Is Flowtali really free to start?', a: 'Yes — the Starter plan is free forever. You get invoices, receipts, 1 active project, and 3 letterheads per month, PDF exports, and core templates at no cost.' },
  { q: 'Can I use my own logo and signature?', a: 'Absolutely. Pro and Business plans support full branding: upload your logo, signature image, set any accent color, and choose your font style across all documents.' },
  { q: 'What currencies are supported?', a: 'USD, EUR, GBP, NGN, CAD, AUD, JPY, INR, ZAR, CHF, and AED — with correct symbols and formatting for every invoice and receipt.' },
  { q: 'Can I cancel my subscription anytime?', a: 'Yes. Cancel at any time from account settings. You keep access until the end of your billing period.' },
];

const scrollTo = (id: string) => {
  const el = document.getElementById(id);

  if (el) el.scrollIntoView({ behavior: 'smooth' });
};
</script>
<template>

  <!-- HERO -->
  <section class="relative min-h-screen grid-texture flex items-center overflow-hidden pt-16">
    <div
      class="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full opacity-20 pointer-events-none"
      style="background:radial-gradient(ellipse,rgba(0,200,83,0.3) 0%,transparent 70%)"></div>
    <div class="orbit w-[600px] h-[600px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
    <div class="orbit w-[900px] h-[900px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      style="border-color:rgba(0,200,83,0.04)"></div>
    <div class="max-w-7xl mx-auto px-6 py-24 w-full">
      <div class="grid lg:grid-cols-2 gap-16 items-center">
        <div class="stagger">
          <div class="badge mb-6 opacity-0 animate-fade-up">
            <span class="w-1.5 h-1.5 rounded-full bg-green-700 inline-block"></span>
            Invoices · Receipts · Projects · Letterheads
          </div>
          <h1
            class="font-sans text-5xl sm:text-6xl lg:text-7xl font-semibold leading-[1.05] text-gray-1000 mb-6 opacity-0 animate-fade-up">
            Run your freelance<br />business from one<br /><em class="shimmer-text not-italic">beautiful platform</em>
          </h1>
          <p class="text-gray-900 text-lg leading-relaxed max-w-md mb-10 opacity-0 animate-fade-up">
            Flowtali gives freelancers and studios everything they need — stunning invoices, payment receipts, branded
            letterheads, and project tracking — all with live preview, instant PDF, zero friction.
          </p>
          <div class="flex flex-wrap gap-4 opacity-0 animate-fade-up">
            <router-link :to="{ name: 'signup' }" class="btn-primary text-base px-7 py-3.5">Start for free</router-link>
            <button class="btn-ghost text-base px-6 py-3.5" @click="scrollTo('products')">
              See what's inside
              <svg class="inline ml-2 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Floating mockups: Invoice + Letterhead stacked -->
        <div class="relative hidden lg:block opacity-0 animate-fade-up" style="animation-delay:.4s">
          <!-- Invoice card -->
          <div class="animate-float">
            <div class="inv-mockup p-5 w-[340px] ml-auto">
              <div class="flex justify-between items-start mb-3">
                <div>
                  <div class="text-xs font-bold text-green-700">ACME STUDIO</div>
                  <div class="text-[9px] text-gray-400">Creative Agency</div>
                </div>
                <div class="text-right">
                  <div class="text-xl font-bold text-gray-800" style="font-family:var(--font-sans)">INVOICE
                  </div>
                  <div class="text-[9px] text-gray-400">INV-0042</div>
                </div>
              </div>
              <div class="h-px bg-green-700/30 mb-3"></div>
              <table class="w-full text-[9px] mb-3">
                <tbody>
                  <tr v-for="item in mockItems" :key="item.name" class="border-b border-gray-100">
                    <td class="py-1 text-gray-700">{{ item.name }}</td>
                    <td class="text-right font-medium text-gray-700">${{ item.amount }}</td>
                  </tr>
                </tbody>
              </table>
              <div class="flex justify-end">
                <div class="text-right">
                  <div class="text-xs text-gray-400">Total</div>
                  <div class="text-lg font-bold text-green-700" style="font-family:var(--font-sans)">$8,550.00
                  </div>
                </div>
              </div>
            </div>
          </div>
          <!-- Letterhead card offset -->
          <div class="absolute -bottom-8 -left-10 w-[280px]"
            style="animation:float 7s ease-in-out infinite;animation-delay:1.2s">
            <div class="lh-mockup p-5">
              <div class="h-1 rounded-full mb-3" style="background:#00c853"></div>
              <div class="flex justify-between items-start mb-4">
                <div>
                  <div class="text-sm font-bold text-gray-800" style="font-family:var(--font-sans)">ACME STUDIO
                  </div>
                  <div class="text-[9px] text-gray-400">Creative Agency · San Francisco</div>
                </div>
                <div class="text-right text-[8px] text-gray-400">hello@acme.studio<br />+1 415 555 0199</div>
              </div>
              <div class="text-[9px] text-gray-600 leading-relaxed">Dear Mr. Johnson,<br /><br />We are pleased to
                confirm our engagement for the upcoming brand identity project…</div>
              <div class="h-px bg-gray-100 mt-4 mb-2"></div>
              <div class="text-[8px] text-gray-400 text-center">123 Design St, San Francisco CA 94105 · flowtali.com
              </div>
            </div>
          </div>
          <!-- Floating badges -->
          <div
            class="absolute -right-4 top-2 bg-gray-200 border border-gray-500 rounded-xl px-3 py-2.5 shadow-2xl"
            style="animation:float 5s ease-in-out infinite;animation-delay:.5s">
            <div class="text-xs text-gray-700 mb-0.5">Letterhead exported</div>
            <div class="text-sm font-semibold text-green-700 flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
              </svg>
              letter_acme.pdf
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="absolute bottom-0 left-0 right-0">
      <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"
        class="w-full h-16">
        <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="#1a1a1a" opacity="0.5" />
      </svg>
    </div>
  </section>

  <!-- SOCIAL PROOF BAR -->
  <section class="py-14 bg-gray-200/40 border-y border-gray-400/30">
    <div class="max-w-6xl mx-auto px-6">
      <p class="text-center text-gray-700 text-sm mb-8 tracking-widest uppercase font-mono">Trusted by freelancers at
      </p>
      <div class="flex flex-wrap justify-center items-center gap-8 md:gap-14 opacity-40">
        <div v-for="brand in brands" :key="brand"
          class="font-sans text-xl text-gray-900 tracking-widest font-light">{{ brand }}</div>
      </div>
    </div>
  </section>

  <!-- PRODUCTS SECTION -->
  <section id="products" class="py-28 relative overflow-hidden">
    <div
      class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] pointer-events-none opacity-5"
      style="background:radial-gradient(ellipse,rgba(0,200,83,1) 0%,transparent 70%)"></div>
    <div class="max-w-7xl mx-auto px-6">
      <div class="text-center mb-20">
        <div class="badge inline-flex mb-5">Four tools, one platform</div>
        <h2 class="font-sans text-5xl md:text-6xl font-semibold text-gray-1000 leading-tight">
          Everything you need to<br /><em class="text-green-700 not-italic">run your business</em>
        </h2>
        <p class="text-gray-900 text-lg mt-5 max-w-xl mx-auto">Invoices, receipts, projects, and letterheads — all in one seamless workspace built for freelancers and small teams.</p>
      </div>

      <div class="grid lg:grid-cols-2 gap-8">
        <!-- Invoice Product Card -->
        <router-link :to="{ name: 'signup' }"
          class="bg-gray-200/60 border border-gray-400/40 rounded-3xl p-8 card-glow transition-all duration-300 hover:border-green-400 hover:-translate-y-1 cursor-pointer group">
          <div class="flex items-center gap-3 mb-6">
            <div class="w-10 h-10 rounded-xl bg-green-100 border border-green-400 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M7 8h10M7 12h6M7 16h4" />
              </svg>
            </div>
            <div>
              <div class="text-gray-1000 font-semibold">Invoice Generator</div>
              <div class="text-gray-700 text-xs">Get paid faster</div>
            </div>
          </div>
          <!-- Mini invoice preview -->
          <div class="bg-white rounded-xl p-5 mb-6 shadow-2xl">
            <div class="flex justify-between items-start mb-3">
              <div class="text-xs font-bold text-green-700" style="font-family:var(--font-sans)">ACME STUDIO</div>
              <div class="text-right">
                <div class="text-xl font-semibold text-gray-800" style="font-family:var(--font-sans)">INVOICE
                </div>
                <div class="text-gray-400 text-[9px]">INV-0042</div>
              </div>
            </div>
            <div class="h-0.5 bg-green-700/30 mb-3 rounded"></div>
            <div class="space-y-1.5 mb-3">
              <div v-for="item in mockItems" :key="item.name" class="flex justify-between text-[10px]">
                <span class="text-gray-600">{{ item.name }}</span>
                <span class="text-gray-800 font-medium">${{ item.amount }}</span>
              </div>
            </div>
            <div class="flex justify-end"><span class="text-lg font-bold text-green-700"
                style="font-family:var(--font-sans)">$8,550.00</span></div>
          </div>
          <h3 class="font-sans text-2xl font-semibold text-gray-1000 mb-3">Beautiful invoices in minutes</h3>
          <p class="text-gray-900 text-sm leading-relaxed mb-5">Live preview, custom branding, multi-currency, tax &
            discounts, logo upload, stamp customization — everything you need to send polished invoices.</p>
          <div class="flex flex-wrap gap-2">
            <span v-for="tag in ['Live Preview', 'PDF Export', 'Multi-Currency', 'Custom Stamp', 'Logo Upload']"
              :key="tag"
              class="text-xs px-2.5 py-1 rounded-full bg-gray-400/80 border border-gray-500/50 text-gray-900">{{
                tag }}</span>
          </div>
          <div class="mt-6 flex items-center gap-2 text-green-700 text-sm font-medium group-hover:gap-3 transition-all">
            Try Invoice Generator <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        </router-link>

        <!-- Letterhead Product Card -->
        <router-link :to="{ name: 'signup' }"
          class="bg-gray-200/60 border border-gray-400/40 rounded-3xl p-8 card-glow transition-all duration-300 hover:border-green-400 hover:-translate-y-1 cursor-pointer group relative overflow-hidden">
          <div class="absolute top-4 right-4 badge text-xs">New ✦</div>
          <div class="flex items-center gap-3 mb-6">
            <div class="w-10 h-10 rounded-xl bg-green-100 border border-green-400 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <line x1="10" y1="9" x2="8" y2="9" />
              </svg>
            </div>
            <div>
              <div class="text-gray-1000 font-semibold">Letterhead Generator</div>
              <div class="text-gray-700 text-xs">Make every letter count</div>
            </div>
          </div>
          <!-- Mini letterhead preview -->
          <div class="bg-white rounded-xl overflow-hidden mb-6 shadow-2xl">
            <div class="h-1.5 bg-green-700"></div>
            <div class="p-5">
              <div class="flex justify-between items-start mb-3">
                <div>
                  <div class="text-sm font-bold text-gray-800" style="font-family:var(--font-sans)">ACME STUDIO
                  </div>
                  <div class="text-[8px] text-gray-400">San Francisco · hello@acme.studio</div>
                </div>
                <div class="w-8 h-8 rounded-full bg-green-700/20 flex items-center justify-center"><span
                    class="text-green-700 text-xs font-bold">A</span></div>
              </div>
              <div class="h-px bg-gray-100 mb-3"></div>
              <div class="text-[8px] text-gray-500 leading-relaxed">Dear Mr. Johnson,<br /><br />We are pleased to
                confirm our partnership for the upcoming brand identity project. This engagement will cover…</div>
              <div class="mt-4 text-[8px] text-gray-800 font-medium">Best regards,<br /><span class="font-bold">Ada
                  Lovelace</span><br /><span class="text-gray-400">Creative Director</span></div>
              <div class="h-px bg-gray-100 mt-4 mb-2"></div>
              <div class="text-[7px] text-gray-400 text-center">123 Design St, SF CA 94105 · acme.studio</div>
            </div>
          </div>
          <h3 class="font-sans text-2xl font-semibold text-gray-1000 mb-3">Letterheads that command respect</h3>
          <p class="text-gray-900 text-sm leading-relaxed mb-5">8 elegant layout templates, full brand customization,
            logo & signature upload, custom color themes, watermarks, footer details — all with live preview and PDF
            export.</p>
          <div class="flex flex-wrap gap-2">
            <span v-for="tag in ['8 Templates', 'Logo & Signature', 'Custom Theme', 'Watermark', 'Footer Details']"
              :key="tag"
              class="text-xs px-2.5 py-1 rounded-full bg-gray-400/80 border border-gray-500/50 text-gray-900">{{
                tag }}</span>
          </div>
          <div class="mt-6 flex items-center gap-2 text-green-700 text-sm font-medium group-hover:gap-3 transition-all">
            Try Letterhead Generator <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        </router-link>

        <!-- Receipt Product Card -->
        <router-link :to="{ name: 'signup' }"
          class="bg-gray-200/60 border border-gray-400/40 rounded-3xl p-8 card-glow transition-all duration-300 hover:border-green-400 hover:-translate-y-1 cursor-pointer group relative overflow-hidden">
          <div class="absolute top-4 right-4 badge text-xs">New ✦</div>
          <div class="flex items-center gap-3 mb-6">
            <div class="w-10 h-10 rounded-xl bg-green-100 border border-green-400 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1z"/>
                <path d="M14 8H8M14 12H8M11 16H8"/>
              </svg>
            </div>
            <div>
              <div class="text-gray-1000 font-semibold">Receipt Generator</div>
              <div class="text-gray-700 text-xs">Confirm every payment</div>
            </div>
          </div>
          <!-- Mini receipt preview -->
          <div class="bg-white rounded-xl p-5 mb-6 shadow-2xl">
            <div class="flex justify-between items-start mb-3">
              <div>
                <div class="text-xs font-bold text-green-700" style="font-family:var(--font-sans)">PAYMENT RECEIPT</div>
                <div class="text-gray-400 text-[9px]">REC-0018</div>
              </div>
              <div class="text-right">
                <div class="text-[9px] text-gray-400">Received from</div>
                <div class="text-xs font-semibold text-gray-700">Johnson Corp</div>
              </div>
            </div>
            <div class="h-0.5 bg-green-100 mb-3 rounded"></div>
            <div class="flex justify-between items-center mb-2">
              <span class="text-[9px] text-gray-500">Amount Received</span>
              <span class="text-sm font-bold text-green-600" style="font-family:var(--font-sans)">$4,200.00</span>
            </div>
            <div class="flex justify-between items-center mb-3">
              <span class="text-[9px] text-gray-500">Payment Method</span>
              <span class="text-[9px] text-gray-700 font-medium">Bank Transfer</span>
            </div>
            <div class="flex items-center justify-center py-1 rounded bg-green-50">
              <span class="text-[9px] font-bold text-green-600 tracking-wider">✓ PAYMENT CONFIRMED</span>
            </div>
          </div>
          <h3 class="font-sans text-2xl font-semibold text-gray-1000 mb-3">Receipts clients can trust</h3>
          <p class="text-gray-900 text-sm leading-relaxed mb-5">Generate professional payment receipts, attach them to invoices, link them to projects, and export stamped PDFs — all with the same live preview experience.</p>
          <div class="flex flex-wrap gap-2">
            <span v-for="tag in ['Linked to Invoices', 'Project Tracking', 'PDF Export', 'Payment Stamps', 'Multi-Currency']"
              :key="tag"
              class="text-xs px-2.5 py-1 rounded-full bg-gray-400/80 border border-gray-500/50 text-gray-900">{{ tag }}</span>
          </div>
          <div class="mt-6 flex items-center gap-2 text-green-700 text-sm font-medium group-hover:gap-3 transition-all">
            Try Receipt Generator <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        </router-link>

        <!-- Projects Product Card -->
        <router-link :to="{ name: 'signup' }"
          class="bg-gray-200/60 border border-gray-400/40 rounded-3xl p-8 card-glow transition-all duration-300 hover:border-green-400 hover:-translate-y-1 cursor-pointer group relative overflow-hidden">
          <div class="absolute top-4 right-4 badge text-xs">New ✦</div>
          <div class="flex items-center gap-3 mb-6">
            <div class="w-10 h-10 rounded-xl bg-green-100 border border-green-400 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                <path d="M12 11v6M8 13v4M16 9v8"/>
              </svg>
            </div>
            <div>
              <div class="text-gray-1000 font-semibold">Project Management</div>
              <div class="text-gray-700 text-xs">Track every engagement</div>
            </div>
          </div>
          <!-- Mini project preview -->
          <div class="bg-white rounded-xl p-5 mb-6 shadow-2xl">
            <div class="flex justify-between items-start mb-3">
              <div>
                <div class="text-[9px] text-gray-400 mb-0.5">PRJ-004</div>
                <div class="text-xs font-bold text-gray-800">Brand Identity — Acme Corp</div>
              </div>
              <span class="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-100">Active</span>
            </div>
            <div class="h-0.5 bg-gray-100 mb-3 rounded"></div>
            <div class="flex justify-between text-[9px] text-gray-500 mb-2">
              <span>Contract</span><span class="text-gray-800 font-semibold">$12,000</span>
            </div>
            <div class="mb-2">
              <div class="flex justify-between text-[8px] text-gray-400 mb-1"><span>Received</span><span>$8,400 (70%)</span></div>
              <div class="h-1.5 bg-gray-100 rounded-full"><div class="h-1.5 bg-green-700 rounded-full" style="width:70%"></div></div>
            </div>
            <div class="flex gap-2 mt-3">
              <span class="text-[8px] px-1.5 py-0.5 bg-gray-50 rounded border border-gray-100 text-gray-500">3 Invoices</span>
              <span class="text-[8px] px-1.5 py-0.5 bg-gray-50 rounded border border-gray-100 text-gray-500">2 Receipts</span>
              <span class="text-[8px] px-1.5 py-0.5 bg-gray-50 rounded border border-gray-100 text-gray-500">1 Letterhead</span>
            </div>
          </div>
          <h3 class="font-sans text-2xl font-semibold text-gray-1000 mb-3">Every project, fully in view</h3>
          <p class="text-gray-900 text-sm leading-relaxed mb-5">Link invoices, receipts, and letterheads to a project. Track contract value, payment progress, upload files, log notes, and see a full activity timeline per engagement.</p>
          <div class="flex flex-wrap gap-2">
            <span v-for="tag in ['Linked Documents', 'Payment Progress', 'Activity Timeline', 'File Uploads', 'Client Tracking']"
              :key="tag"
              class="text-xs px-2.5 py-1 rounded-full bg-gray-400/80 border border-gray-500/50 text-gray-900">{{ tag }}</span>
          </div>
          <div class="mt-6 flex items-center gap-2 text-green-700 text-sm font-medium group-hover:gap-3 transition-all">
            Try Project Management <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        </router-link>
      </div>
    </div>
  </section>

  <div class="section-divider max-w-5xl mx-auto"></div>

  <!-- FEATURES -->
  <section id="features" class="py-28 relative">
    <div class="max-w-7xl mx-auto px-6">
      <div class="text-center mb-20">
        <div class="badge inline-flex mb-5">Features</div>
        <h2 class="font-sans text-5xl md:text-6xl font-semibold text-gray-1000 leading-tight">
          Everything you need to<br /><em class="text-green-700 not-italic">look like a pro</em>
        </h2>
        <p class="text-gray-900 text-lg mt-5 max-w-xl mx-auto">Invoices, receipts, projects, letterheads, branding, team roles — built for freelancers who want results without complexity.</p>
      </div>
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="feature in features" :key="feature.title"
          class="bg-gray-200/60 border border-gray-400/40 rounded-2xl p-6 card-glow transition-all duration-300 hover:border-green-400 hover:-translate-y-1">
          <div class="feature-icon mb-5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
              v-html="feature.icon"></svg>
          </div>
          <div v-if="feature.isNew"
            class="inline-block text-[10px] font-semibold text-green-700 bg-green-100 border border-green-400 rounded-full px-2 py-0.5 mb-2">
            New</div>
          <h3 class="font-sans text-xl font-semibold text-gray-1000 mb-2">{{ feature.title }}</h3>
          <p class="text-gray-900 text-sm leading-relaxed">{{ feature.desc }}</p>
        </div>
      </div>
    </div>
  </section>

  <div class="section-divider max-w-5xl mx-auto"></div>

  <!-- LETTERHEAD SPOTLIGHT SECTION -->
  <section class="py-28 relative overflow-hidden">
    <div class="absolute right-0 top-0 w-1/2 h-full pointer-events-none opacity-5"
      style="background:radial-gradient(ellipse at right center,rgba(0,200,83,1) 0%,transparent 70%)"></div>
    <div class="max-w-7xl mx-auto px-6">
      <div class="grid lg:grid-cols-2 gap-20 items-center">
        <div>
          <div class="badge inline-flex mb-5">Letterhead Generator</div>
          <h2 class="font-sans text-5xl font-semibold text-gray-1000 leading-tight mb-6">
            Every letter should<br />make a<em class="text-green-700 not-italic"> lasting impression</em>
          </h2>
          <p class="text-gray-900 text-base leading-relaxed mb-8">Whether it's a proposal, engagement letter, or
            formal notice — Flowtali's letterhead generator gives you professional-grade stationery in seconds. Pick a
            layout, drop in your logo, and export a pixel-perfect PDF.</p>
          <div class="flex flex-col gap-4 mb-8">
            <div v-for="lf in letterheadFeatures" :key="lf" class="flex items-center gap-3">
              <div class="check-icon flex-shrink-0">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span class="text-gray-900 text-sm">{{ lf }}</span>
            </div>
          </div>
          <router-link :to="{ name: 'signup' }" class="btn-primary text-base px-7 py-3.5">
            Open Letterhead Generator
            <svg class="inline ml-2 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </router-link>
        </div>
        <!-- Letterhead template showcase -->
        <div class="grid grid-cols-2 gap-4">
          <div v-for="(tmpl, i) in lhTemplatePreviews" :key="tmpl.name"
            class="bg-white rounded-xl overflow-hidden shadow-xl cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl"
            :class="i === 0 ? 'col-span-2' : ''">
            <!-- Top bar accent -->
            <div class="h-1.5" :style="`background:${tmpl.color}`"></div>
            <div class="p-4">
              <div class="flex justify-between items-start mb-2">
                <div>
                  <div class="text-xs font-bold text-gray-800" :style="`font-family:${tmpl.font};color:${tmpl.color}`">
                    STUDIO NAME</div>
                  <div class="text-[8px] text-gray-400 mt-0.5">{{ tmpl.tagline }}</div>
                </div>
                <div class="text-[8px] text-right text-gray-400">{{ tmpl.name }}</div>
              </div>
              <div class="h-px bg-gray-100 mb-2"></div>
              <div class="text-[7px] text-gray-500 leading-relaxed line-clamp-3">{{ tmpl.preview }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <div class="section-divider max-w-5xl mx-auto"></div>

  <!-- PRICING -->
  <section id="pricing" class="py-28">
    <div class="max-w-6xl mx-auto px-6">
      <div class="text-center mb-16">
        <div class="badge inline-flex mb-5">Pricing</div>
        <h2 class="font-sans text-5xl md:text-6xl font-semibold text-gray-1000 mb-4">Simple, honest pricing</h2>
        <p class="text-gray-900 text-lg">All tools included in every plan. No hidden fees.</p>
        <div class="flex flex-wrap items-center justify-center gap-6 mt-8">
          <!-- Billing interval toggle -->
          <div class="flex items-center gap-4">
            <span class="text-sm" :class="billing === 'monthly' ? 'text-gray-1000' : 'text-gray-700'">Monthly</span>
            <button class="relative w-12 h-6 rounded-full transition-colors duration-300"
              :class="billing === 'annual' ? 'bg-green-700' : 'bg-gray-500'"
              @click="billing = billing === 'monthly' ? 'annual' : 'monthly'">
              <span class="absolute top-0.5 left-0 w-5 h-5 rounded-full bg-white transition-transform duration-300 shadow"
                :class="billing === 'annual' ? 'translate-x-6' : 'translate-x-0.5'"></span>
            </button>
            <span class="text-sm" :class="billing === 'annual' ? 'text-gray-1000' : 'text-gray-700'">
              Annual
              <span v-if="annualDiscount > 0" class="text-green-700 text-xs font-semibold ml-1">-{{ annualDiscount }}%</span>
            </span>
          </div>
          <!-- Currency toggle -->
          <div class="flex items-center gap-1 bg-gray-200/60 border border-gray-400/40 rounded-full px-1 py-1">
            <button v-for="c in (['USD', 'NGN'] as const)" :key="c"
              class="px-4 py-1 rounded-full text-sm font-medium transition-all duration-200"
              :class="currency === c ? 'bg-green-700 text-bg-100' : 'text-gray-700 hover:text-gray-1000'"
              @click="currency = c">
              {{ c === 'USD' ? '$ USD' : '₦ NGN' }}
            </button>
          </div>
        </div>
      </div>
      <!-- Loading skeleton -->
      <div v-if="plansLoading" class="grid md:grid-cols-3 gap-6">
        <div v-for="i in 3" :key="i" class="rounded-2xl p-7 bg-gray-200/60 border border-gray-400/40 animate-pulse">
          <div class="h-3 bg-gray-400 rounded mb-3 w-16"></div>
          <div class="h-9 bg-gray-400 rounded mb-2 w-28"></div>
          <div class="h-3 bg-gray-400 rounded mb-6 w-full"></div>
          <div class="h-10 bg-gray-400 rounded mb-6"></div>
          <div class="space-y-2.5">
            <div v-for="j in 5" :key="j" class="h-3 bg-gray-400 rounded w-full"></div>
          </div>
        </div>
      </div>
      <div v-else class="grid md:grid-cols-3 gap-6 items-start">
        <div v-for="plan in displayPlans" :key="plan.name"
          class="rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1"
          :class="plan.featured ? 'pricing-featured accent-glow' : 'bg-gray-200/60 border border-gray-400/40 card-glow'">
          <div class="flex items-start justify-between mb-6">
            <div>
              <div class="text-gray-700 text-sm font-medium mb-1">{{ plan.name }}</div>
              <div class="font-sans text-4xl font-semibold text-gray-1000">
                {{ plan.priceDisplay }}<span class="text-lg text-gray-700 font-normal font-sans">/mo</span>
              </div>
              <div v-if="plan.billedNote" class="text-green-700 text-xs mt-1">{{ plan.billedNote }}</div>
            </div>
            <div v-if="plan.featured" class="badge text-xs">Most popular</div>
          </div>
          <p class="text-gray-900 text-sm mb-6 leading-relaxed">{{ plan.desc }}</p>
          <router-link :to="{ name: 'signup' }"
            :class="plan.featured ? 'btn-primary w-full text-sm py-3' : 'btn-ghost w-full text-sm py-3'">
            {{ plan.cta }}
          </router-link>
          <div class="section-divider my-6"></div>
          <div class="flex flex-col gap-3">
            <div v-for="item in plan.features" :key="item" class="check-item">
              <div class="check-icon"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg></div>
              <span class="text-gray-900 text-sm">{{ item }}</span>
            </div>
          </div>
        </div>
      </div>
      <p class="text-center text-gray-700 text-sm mt-8">All plans include Invoice Generator, Receipt Generator, Project Management, and Letterhead Generator. Cancel anytime.</p>
    </div>
  </section>

  <div class="section-divider max-w-5xl mx-auto"></div>

  <!-- TESTIMONIALS -->
  <section v-if="testimonials.length" id="testimonials" class="py-28 relative overflow-hidden">
    <div class="absolute left-0 top-1/2 -translate-y-1/2 w-80 h-80 rounded-full opacity-10 pointer-events-none"
      style="background:radial-gradient(circle,rgba(0,200,83,0.4) 0%,transparent 70%)"></div>
    <div class="max-w-6xl mx-auto px-6">
      <div class="text-center mb-16">
        <div class="badge inline-flex mb-5">Reviews</div>
        <h2 class="font-sans text-5xl font-semibold text-gray-1000">Our customers love Flowtali</h2>
      </div>
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div v-for="t in testimonials" :key="t.id" class="testimonial-card card-glow transition-all duration-300">
          <div class="flex text-green-700 text-sm mb-4">{{ '★'.repeat(t.rating) }}</div>
          <p class="text-gray-1000 text-sm leading-relaxed mb-5 font-light italic">"{{ t.content }}"</p>
          <div class="flex items-center gap-3">
            <img v-if="t.author_avatar" :src="t.author_avatar" :alt="t.author_name" class="w-9 h-9 rounded-full object-cover" />
            <div v-else class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-bg-100"
              :style="`background:hsl(${avatarHue(t.id)},55%,60%)`">{{ t.author_name[0] }}</div>
            <div>
              <div class="text-gray-1000 text-sm font-medium">{{ t.author_name }}</div>
              <div v-if="t.author_role" class="text-gray-700 text-xs">{{ t.author_role }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <div class="section-divider max-w-5xl mx-auto"></div>

  <!-- EMBED SDK -->
  <section id="embed-sdk" class="py-28 relative overflow-hidden">
    <div class="absolute left-0 top-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-10 pointer-events-none"
      style="background:radial-gradient(circle,rgba(0,200,83,0.5) 0%,transparent 70%)"></div>
    <div class="max-w-7xl mx-auto px-6">
      <div class="text-center mb-16">
        <div class="badge inline-flex mb-5 items-center gap-1.5">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          Embed SDK
        </div>
        <h2 class="font-sans text-5xl md:text-6xl font-semibold text-gray-1000 leading-tight">
          Flowtali in <em class="text-green-700 not-italic">your</em> product
        </h2>
        <p class="text-gray-900 text-lg mt-5 max-w-2xl mx-auto">Embed invoices, projects, receipts, and more directly in your own SaaS — with one script tag, a permission-scoped token, and a fully brandable iframe.</p>
        <router-link :to="{ name: 'docs.embed' }" class="inline-flex items-center gap-2 mt-6 text-sm text-green-700 hover:underline">
          Read the docs
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </router-link>
      </div>

      <div class="grid lg:grid-cols-2 gap-12 items-center">
        <!-- Code snippet -->
        <div class="relative">
          <div class="bg-bg-100 border border-gray-400/50 rounded-2xl overflow-hidden shadow-2xl">
            <div class="bg-gray-200/60 border-b border-gray-400/40 px-5 py-3 flex items-center gap-2">
              <div class="w-3 h-3 rounded-full bg-red-500/40"></div>
              <div class="w-3 h-3 rounded-full bg-yellow-500/40"></div>
              <div class="w-3 h-3 rounded-full bg-green-500/40"></div>
              <span class="ml-3 text-gray-700 text-xs font-mono">app.js</span>
            </div>
            <pre class="p-5 text-xs font-mono leading-relaxed overflow-x-auto"><code class="text-gray-900"><span class="text-gray-700">// 1. Add the script</span>
&lt;script src="flowtali.com/sdk/flowtali.js"&gt;&lt;/script&gt;

<span class="text-gray-700">// 2. Init with your publishable key + branding</span>
<span class="text-gray-1000">const ft = Flowtali.init(<span class="text-green-700">'pk_live_...'</span>, {
  appearance: { primaryColor: <span class="text-green-700">'#6366f1'</span> }
})</span>

<span class="text-gray-700">// 3. Mount any view with a user token</span>
<span class="text-gray-1000">ft.mount(<span class="text-green-700">'#container'</span>, {
  view: <span class="text-green-700">'invoices'</span>,
  token: userEmbedToken,
})

ft.on(<span class="text-green-700">'invoice.created'</span>, (inv) =&gt; {
  syncToYourSystem(inv.id)
})</span></code></pre>
          </div>
          <div class="absolute -bottom-6 -right-6 w-48 h-48 rounded-full pointer-events-none"
            style="background:radial-gradient(circle,rgba(0,200,83,0.12) 0%,transparent 70%)"></div>
        </div>

        <!-- Feature list -->
        <div class="flex flex-col gap-5">
          <div v-for="item in embedFeatures" :key="item.title"
            class="bg-gray-200/50 border border-gray-400/40 rounded-xl p-5 flex items-start gap-4 hover:border-green-400 transition-colors">
            <div class="w-9 h-9 rounded-lg bg-green-700/10 border border-green-700/15 flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" v-html="item.icon"></svg>
            </div>
            <div>
              <div class="text-gray-1000 text-sm font-medium mb-0.5">{{ item.title }}</div>
              <div class="text-gray-900 text-xs leading-relaxed">{{ item.desc }}</div>
            </div>
          </div>

          <router-link :to="{ name: 'docs.embed' }"
            class="mt-2 inline-flex items-center justify-center gap-2 bg-green-700 text-bg-100 font-semibold text-sm px-6 py-3 rounded-lg hover:bg-green-800 transition-colors self-start">
            View full docs
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </router-link>
        </div>
      </div>
    </div>
  </section>

  <div class="section-divider max-w-5xl mx-auto"></div>

  <!-- FAQ -->
  <section id="faq" class="py-28">
    <div class="max-w-3xl mx-auto px-6">
      <div class="text-center mb-16">
        <div class="badge inline-flex mb-5">FAQ</div>
        <h2 class="font-sans text-5xl font-semibold text-gray-1000">Common questions</h2>
      </div>
      <div class="flex flex-col divide-y divide-gray-400/40">
        <div v-for="(faq, i) in faqs" :key="i" class="py-5">
          <button class="w-full flex items-center justify-between text-left gap-4 cursor-pointer"
            @click="openFaq = openFaq === i ? null : i">
            <span class="text-gray-1000 font-medium">{{ faq.q }}</span>
            <svg class="w-5 h-5 text-green-700 flex-shrink-0 transition-transform duration-200"
              :class="openFaq === i ? 'rotate-45' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <div v-show="openFaq === i" class="pt-3 text-gray-900 text-sm leading-relaxed">{{ faq.a }}</div>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA BAND -->
  <section class="py-20 relative overflow-hidden">
    <div class="absolute inset-0 grid-texture opacity-50"></div>
    <div class="absolute inset-0"
      style="background:radial-gradient(ellipse at 50% 50%,rgba(0,200,83,0.12) 0%,transparent 70%)"></div>
    <div class="relative max-w-4xl mx-auto px-6 text-center">
      <h2 class="font-sans text-5xl md:text-6xl font-semibold text-gray-1000 mb-5 leading-tight">Ready to run your<em
          class="shimmer-text not-italic"> business better?</em></h2>
      <p class="text-gray-900 text-lg mb-10">Join 4,200+ freelancers who trust Flowtali for invoices, receipts, projects, and letterheads.</p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <router-link :to="{ name: 'signup' }" class="btn-primary text-base px-8 py-4">Start free — no credit
          card</router-link>
        <router-link :to="{ name: 'signup' }" class="btn-ghost text-base px-8 py-4">Explore all features →</router-link>
      </div>
    </div>
  </section>
</template>
