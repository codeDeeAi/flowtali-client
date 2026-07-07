<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n'
import { useSeo } from '@/composables/useSeo'
import { useHead } from '@unhead/vue'
import { SubscriptionService, type ISubscriptionPlan } from '@/services/subscription.service'
import { TestimonialService, type ITestimonial } from '@/services/testimonial.service'

const { t, tm, rt } = useI18n()

useSeo({
  title: t('home.seo.title'),
  description: t('home.seo.description'),
  canonical: 'https://flowtali.com/',
  localePath: '/',
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

// Icons + flags stay in code (non-translatable); titles/descriptions come from i18n.
const FEATURE_META = [
  { isNew: false, icon: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12s1.5-3 4-3 4 3 4 3-1.5 3-4 3-4-3-4-3z"/><circle cx="12" cy="12" r="1.5"/>' },
  { isNew: false, icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M16 13H8M16 17H8M10 9H8"/>' },
  { isNew: true, icon: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1z"/><path d="M14 8H8M14 12H8M11 16H8"/>' },
  { isNew: true, icon: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><path d="M12 11v6M8 13v4M16 9v8"/>' },
  { isNew: false, icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>' },
  { isNew: false, icon: '<circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/>' },
  { isNew: false, icon: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>' },
  { isNew: true, icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
  { isNew: false, icon: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>' },
];
const features = computed(() =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (tm('home.features.items') as any[]).map((item, i) => ({
    title: rt(item.title),
    desc: rt(item.desc),
    isNew: FEATURE_META[i]?.isNew ?? false,
    icon: FEATURE_META[i]?.icon ?? '',
  })),
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const letterheadFeatures = computed(() => (tm('home.letterheadSpotlight.features') as any[]).map((f) => rt(f)));

// Visual style stays in code; tagline/preview copy comes from i18n.
const LH_TEMPLATE_STYLE = [
  { name: 'Classic', color: '#00c853', font: 'var(--font-sans)' },
  { name: 'Modern', color: '#4f86c6', font: 'var(--font-sans)' },
  { name: 'Minimal', color: '#5ab88a', font: "'Lato',sans-serif" },
  { name: 'Bold', color: '#e05a5a', font: "'Montserrat',sans-serif" },
];
const lhTemplatePreviews = computed(() =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (tm('home.letterheadSpotlight.templates') as any[]).map((tmpl, i) => ({
    name: LH_TEMPLATE_STYLE[i]?.name ?? '',
    color: LH_TEMPLATE_STYLE[i]?.color ?? '#00c853',
    font: LH_TEMPLATE_STYLE[i]?.font ?? 'var(--font-sans)',
    tagline: rt(tmpl.tagline),
    preview: rt(tmpl.preview),
  })),
);

const billing = ref<'monthly' | 'annual'>('annual');
const currency = ref<'NGN' | 'USD'>('USD');
const apiPlans = ref<ISubscriptionPlan[]>([]);
const plansLoading = ref(false);

// Featured flag stays in code; copy comes from i18n (home.pricing.plans.<slug>).
const PLAN_FEATURED: Record<string, boolean> = { starter: false, pro: true, business: false };
type PlanMeta = { desc: string; cta: string; featured: boolean; features: string[] };
const staticPlanData = computed<Record<string, PlanMeta>>(() => {
  const build = (slug: string): PlanMeta => ({
    desc: t(`home.pricing.plans.${slug}.desc`),
    cta: t(`home.pricing.plans.${slug}.cta`),
    featured: PLAN_FEATURED[slug] ?? false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    features: (tm(`home.pricing.plans.${slug}.features`) as any[]).map((f) => rt(f)),
  });
  return { starter: build('starter'), pro: build('pro'), business: build('business') };
});

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
    const meta = staticPlanData.value[plan.slug] ?? { desc: plan.description, cta: t('home.pricing.plans.pro.cta'), featured: false, features: [] };
    const prices = plan.prices[currency.value];
    const priceDisplay = billing.value === 'annual' && !plan.is_free ? prices.annual_per_month : prices.monthly_display;
    const billedNote = billing.value === 'annual' && !plan.is_free ? t('home.pricing.billedNote', { amount: prices.annual_display }) : null;
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

const EMBED_FEATURE_ICONS = [
  '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  '<circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
]
const embedFeatures = computed(() =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (tm('home.embed.features') as any[]).map((item, i) => ({
    title: rt(item.title),
    desc: rt(item.desc),
    icon: EMBED_FEATURE_ICONS[i] ?? '',
  })),
)

const testimonials = ref<ITestimonial[]>([]);

function avatarHue(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

const openFaq = ref<number | null>(null);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const faqs = computed(() => (tm('home.faq.items') as any[]).map((f) => ({ q: rt(f.q), a: rt(f.a) })));

// Product-card feature tags, per product.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tagsOf = (slug: string) => (tm(`home.products.${slug}.tags`) as any[]).map((x) => rt(x));
const productTags = computed(() => ({
  invoice: tagsOf('invoice'),
  letterhead: tagsOf('letterhead'),
  receipt: tagsOf('receipt'),
  project: tagsOf('project'),
}));

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
            {{ t('home.hero.badge') }}
          </div>
          <h1
            class="font-sans text-5xl sm:text-6xl lg:text-7xl font-semibold leading-[1.05] text-gray-1000 mb-6 opacity-0 animate-fade-up">
            {{ t('home.hero.titleLine1') }}<br />{{ t('home.hero.titleLine2') }}<br /><em class="shimmer-text not-italic">{{ t('home.hero.titleEm') }}</em>
          </h1>
          <p class="text-gray-900 text-lg leading-relaxed max-w-md mb-10 opacity-0 animate-fade-up">
            {{ t('home.hero.subtitle') }}
          </p>
          <div class="flex flex-wrap gap-4 opacity-0 animate-fade-up">
            <router-link :to="{ name: 'signup' }" class="btn-primary text-base px-7 py-3.5">{{ t('home.hero.ctaPrimary') }}</router-link>
            <button class="btn-ghost text-base px-6 py-3.5" @click="scrollTo('products')">
              {{ t('home.hero.ctaSecondary') }}
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
            <div class="text-xs text-gray-700 mb-0.5">{{ t('home.hero.letterheadExported') }}</div>
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
      <p class="text-center text-gray-700 text-sm mb-8 tracking-widest uppercase font-mono">{{ t('home.socialProof.trustedBy') }}
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
        <div class="badge inline-flex mb-5">{{ t('home.products.badge') }}</div>
        <h2 class="font-sans text-5xl md:text-6xl font-semibold text-gray-1000 leading-tight">
          {{ t('home.products.titleLine1') }}<br /><em class="text-green-700 not-italic">{{ t('home.products.titleEm') }}</em>
        </h2>
        <p class="text-gray-900 text-lg mt-5 max-w-xl mx-auto">{{ t('home.products.subtitle') }}</p>
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
              <div class="text-gray-1000 font-semibold">{{ t('home.products.invoice.name') }}</div>
              <div class="text-gray-700 text-xs">{{ t('home.products.invoice.tagline') }}</div>
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
          <h3 class="font-sans text-2xl font-semibold text-gray-1000 mb-3">{{ t('home.products.invoice.heading') }}</h3>
          <p class="text-gray-900 text-sm leading-relaxed mb-5">{{ t('home.products.invoice.desc') }}</p>
          <div class="flex flex-wrap gap-2">
            <span v-for="tag in productTags.invoice"
              :key="tag"
              class="text-xs px-2.5 py-1 rounded-full bg-gray-400/80 border border-gray-500/50 text-gray-900">{{
                tag }}</span>
          </div>
          <div class="mt-6 flex items-center gap-2 text-green-700 text-sm font-medium group-hover:gap-3 transition-all">
            {{ t('home.products.invoice.cta') }} <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        </router-link>

        <!-- Letterhead Product Card -->
        <router-link :to="{ name: 'signup' }"
          class="bg-gray-200/60 border border-gray-400/40 rounded-3xl p-8 card-glow transition-all duration-300 hover:border-green-400 hover:-translate-y-1 cursor-pointer group relative overflow-hidden">
          <div class="absolute top-4 right-4 badge text-xs">{{ t('home.products.new') }}</div>
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
              <div class="text-gray-1000 font-semibold">{{ t('home.products.letterhead.name') }}</div>
              <div class="text-gray-700 text-xs">{{ t('home.products.letterhead.tagline') }}</div>
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
          <h3 class="font-sans text-2xl font-semibold text-gray-1000 mb-3">{{ t('home.products.letterhead.heading') }}</h3>
          <p class="text-gray-900 text-sm leading-relaxed mb-5">{{ t('home.products.letterhead.desc') }}</p>
          <div class="flex flex-wrap gap-2">
            <span v-for="tag in productTags.letterhead"
              :key="tag"
              class="text-xs px-2.5 py-1 rounded-full bg-gray-400/80 border border-gray-500/50 text-gray-900">{{
                tag }}</span>
          </div>
          <div class="mt-6 flex items-center gap-2 text-green-700 text-sm font-medium group-hover:gap-3 transition-all">
            {{ t('home.products.letterhead.cta') }} <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        </router-link>

        <!-- Receipt Product Card -->
        <router-link :to="{ name: 'signup' }"
          class="bg-gray-200/60 border border-gray-400/40 rounded-3xl p-8 card-glow transition-all duration-300 hover:border-green-400 hover:-translate-y-1 cursor-pointer group relative overflow-hidden">
          <div class="absolute top-4 right-4 badge text-xs">{{ t('home.products.new') }}</div>
          <div class="flex items-center gap-3 mb-6">
            <div class="w-10 h-10 rounded-xl bg-green-100 border border-green-400 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1z"/>
                <path d="M14 8H8M14 12H8M11 16H8"/>
              </svg>
            </div>
            <div>
              <div class="text-gray-1000 font-semibold">{{ t('home.products.receipt.name') }}</div>
              <div class="text-gray-700 text-xs">{{ t('home.products.receipt.tagline') }}</div>
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
          <h3 class="font-sans text-2xl font-semibold text-gray-1000 mb-3">{{ t('home.products.receipt.heading') }}</h3>
          <p class="text-gray-900 text-sm leading-relaxed mb-5">{{ t('home.products.receipt.desc') }}</p>
          <div class="flex flex-wrap gap-2">
            <span v-for="tag in productTags.receipt"
              :key="tag"
              class="text-xs px-2.5 py-1 rounded-full bg-gray-400/80 border border-gray-500/50 text-gray-900">{{ tag }}</span>
          </div>
          <div class="mt-6 flex items-center gap-2 text-green-700 text-sm font-medium group-hover:gap-3 transition-all">
            {{ t('home.products.receipt.cta') }} <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        </router-link>

        <!-- Projects Product Card -->
        <router-link :to="{ name: 'signup' }"
          class="bg-gray-200/60 border border-gray-400/40 rounded-3xl p-8 card-glow transition-all duration-300 hover:border-green-400 hover:-translate-y-1 cursor-pointer group relative overflow-hidden">
          <div class="absolute top-4 right-4 badge text-xs">{{ t('home.products.new') }}</div>
          <div class="flex items-center gap-3 mb-6">
            <div class="w-10 h-10 rounded-xl bg-green-100 border border-green-400 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                <path d="M12 11v6M8 13v4M16 9v8"/>
              </svg>
            </div>
            <div>
              <div class="text-gray-1000 font-semibold">{{ t('home.products.project.name') }}</div>
              <div class="text-gray-700 text-xs">{{ t('home.products.project.tagline') }}</div>
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
          <h3 class="font-sans text-2xl font-semibold text-gray-1000 mb-3">{{ t('home.products.project.heading') }}</h3>
          <p class="text-gray-900 text-sm leading-relaxed mb-5">{{ t('home.products.project.desc') }}</p>
          <div class="flex flex-wrap gap-2">
            <span v-for="tag in productTags.project"
              :key="tag"
              class="text-xs px-2.5 py-1 rounded-full bg-gray-400/80 border border-gray-500/50 text-gray-900">{{ tag }}</span>
          </div>
          <div class="mt-6 flex items-center gap-2 text-green-700 text-sm font-medium group-hover:gap-3 transition-all">
            {{ t('home.products.project.cta') }} <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
        <div class="badge inline-flex mb-5">{{ t('home.features.badge') }}</div>
        <h2 class="font-sans text-5xl md:text-6xl font-semibold text-gray-1000 leading-tight">
          {{ t('home.features.titleLine1') }}<br /><em class="text-green-700 not-italic">{{ t('home.features.titleEm') }}</em>
        </h2>
        <p class="text-gray-900 text-lg mt-5 max-w-xl mx-auto">{{ t('home.features.subtitle') }}</p>
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
            {{ t('home.features.new') }}</div>
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
          <div class="badge inline-flex mb-5">{{ t('home.letterheadSpotlight.badge') }}</div>
          <h2 class="font-sans text-5xl font-semibold text-gray-1000 leading-tight mb-6">
            {{ t('home.letterheadSpotlight.titleLine1') }}<br />{{ t('home.letterheadSpotlight.titleLine2') }}<em class="text-green-700 not-italic">{{ t('home.letterheadSpotlight.titleEm') }}</em>
          </h2>
          <p class="text-gray-900 text-base leading-relaxed mb-8">{{ t('home.letterheadSpotlight.desc') }}</p>
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
            {{ t('home.letterheadSpotlight.cta') }}
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
        <div class="badge inline-flex mb-5">{{ t('home.pricing.badge') }}</div>
        <h2 class="font-sans text-5xl md:text-6xl font-semibold text-gray-1000 mb-4">{{ t('home.pricing.title') }}</h2>
        <p class="text-gray-900 text-lg">{{ t('home.pricing.subtitle') }}</p>
        <div class="flex flex-wrap items-center justify-center gap-6 mt-8">
          <!-- Billing interval toggle -->
          <div class="flex items-center gap-4">
            <span class="text-sm" :class="billing === 'monthly' ? 'text-gray-1000' : 'text-gray-700'">{{ t('home.pricing.monthly') }}</span>
            <button class="relative w-12 h-6 rounded-full transition-colors duration-300"
              :class="billing === 'annual' ? 'bg-green-700' : 'bg-gray-500'"
              @click="billing = billing === 'monthly' ? 'annual' : 'monthly'">
              <span class="absolute top-0.5 left-0 w-5 h-5 rounded-full bg-white transition-transform duration-300 shadow"
                :class="billing === 'annual' ? 'translate-x-6' : 'translate-x-0.5'"></span>
            </button>
            <span class="text-sm" :class="billing === 'annual' ? 'text-gray-1000' : 'text-gray-700'">
              {{ t('home.pricing.annual') }}
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
                {{ plan.priceDisplay }}<span class="text-lg text-gray-700 font-normal font-sans">{{ t('home.pricing.perMonth') }}</span>
              </div>
              <div v-if="plan.billedNote" class="text-green-700 text-xs mt-1">{{ plan.billedNote }}</div>
            </div>
            <div v-if="plan.featured" class="badge text-xs">{{ t('home.pricing.mostPopular') }}</div>
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
      <p class="text-center text-gray-700 text-sm mt-8">{{ t('home.pricing.footnote') }}</p>
    </div>
  </section>

  <div class="section-divider max-w-5xl mx-auto"></div>

  <!-- TESTIMONIALS -->
  <section v-if="testimonials.length" id="testimonials" class="py-28 relative overflow-hidden">
    <div class="absolute left-0 top-1/2 -translate-y-1/2 w-80 h-80 rounded-full opacity-10 pointer-events-none"
      style="background:radial-gradient(circle,rgba(0,200,83,0.4) 0%,transparent 70%)"></div>
    <div class="max-w-6xl mx-auto px-6">
      <div class="text-center mb-16">
        <div class="badge inline-flex mb-5">{{ t('home.testimonials.badge') }}</div>
        <h2 class="font-sans text-5xl font-semibold text-gray-1000">{{ t('home.testimonials.title') }}</h2>
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
          {{ t('home.embed.badge') }}
        </div>
        <h2 class="font-sans text-5xl md:text-6xl font-semibold text-gray-1000 leading-tight">
          {{ t('home.embed.titlePre') }} <em class="text-green-700 not-italic">{{ t('home.embed.titleEm') }}</em> {{ t('home.embed.titlePost') }}
        </h2>
        <p class="text-gray-900 text-lg mt-5 max-w-2xl mx-auto">{{ t('home.embed.subtitle') }}</p>
        <router-link :to="{ name: 'docs.embed' }" class="inline-flex items-center gap-2 mt-6 text-sm text-green-700 hover:underline">
          {{ t('home.embed.readDocs') }}
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
            {{ t('home.embed.viewDocs') }}
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
        <div class="badge inline-flex mb-5">{{ t('home.faq.badge') }}</div>
        <h2 class="font-sans text-5xl font-semibold text-gray-1000">{{ t('home.faq.title') }}</h2>
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
      <h2 class="font-sans text-5xl md:text-6xl font-semibold text-gray-1000 mb-5 leading-tight">{{ t('home.cta.titlePre') }}<em
          class="shimmer-text not-italic">{{ t('home.cta.titleEm') }}</em></h2>
      <p class="text-gray-900 text-lg mb-10">{{ t('home.cta.subtitle') }}</p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <router-link :to="{ name: 'signup' }" class="btn-primary text-base px-8 py-4">{{ t('home.cta.primary') }}</router-link>
        <router-link :to="{ name: 'signup' }" class="btn-ghost text-base px-8 py-4">{{ t('home.cta.secondary') }}</router-link>
      </div>
    </div>
  </section>
</template>
