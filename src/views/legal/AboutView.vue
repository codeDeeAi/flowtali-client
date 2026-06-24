<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useSeo } from '@/composables/useSeo'

const router = useRouter()

useSeo({
  title: 'About Flowtali',
  description: 'Flowtali is a document tool built for freelancers and small teams. Create professional invoices and letterheads with real-time preview and one-click PDF export.',
  canonical: 'https://flowtali.com/about',
})
</script>

<template>
  <div class="min-h-screen bg-gray-100 text-gray-1000">

    <!-- Nav -->
    <header class="border-b border-gray-300 px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
      <button @click="router.back()" class="flex items-center gap-2 text-sm text-gray-900 hover:text-gray-1000 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        Back
      </button>
      <router-link to="/" class="font-sans text-lg font-bold text-green-700">Flowtali</router-link>
    </header>

    <!-- Hero -->
    <section class="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
      <div class="inline-flex items-center gap-2 bg-green-700/10 border border-green-700/20 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
        Our Story
      </div>
      <h1 class="text-5xl font-bold font-sans text-gray-1000 mb-6 leading-tight">
        Documents that look as good<br class="hidden md:block" /> as the work behind them
      </h1>
      <p class="text-lg text-gray-900 max-w-2xl mx-auto leading-relaxed">
        Flowtali was built for freelancers and small teams who care about first impressions — because a polished invoice or letterhead says everything before you say a word.
      </p>
    </section>

    <!-- Mission -->
    <section class="max-w-5xl mx-auto px-6 py-16">
      <div class="grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 class="text-3xl font-bold font-sans text-gray-1000 mb-5">Why we built Flowtali</h2>
          <div class="space-y-4 text-gray-900 leading-relaxed">
            <p>
              Too many great freelancers were sending invoices assembled in Google Docs, or letterheads cobbled together in Word — and it showed. Clients noticed. Deals were harder to close.
            </p>
            <p>
              We built Flowtali to close that gap. Professional-grade invoice and letterhead tooling, accessible to a solo designer, a consultant, or a 5-person studio — not just the enterprise with a design team.
            </p>
            <p>
              Every template, every setting, every feature was designed with one question in mind: <em class="text-gray-1000 not-italic font-medium">"Would a client trust this?"</em> If the answer is yes, it ships. If not, it doesn't.
            </p>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-gray-200 border border-gray-400 rounded-2xl p-6 text-center">
            <div class="text-3xl font-bold text-green-700 mb-1">6</div>
            <div class="text-sm text-gray-900">Letterhead themes</div>
          </div>
          <div class="bg-gray-200 border border-gray-400 rounded-2xl p-6 text-center">
            <div class="text-3xl font-bold text-green-700 mb-1">11+</div>
            <div class="text-sm text-gray-900">Currencies supported</div>
          </div>
          <div class="bg-gray-200 border border-gray-400 rounded-2xl p-6 text-center">
            <div class="text-3xl font-bold text-green-700 mb-1">100%</div>
            <div class="text-sm text-gray-900">Browser-based</div>
          </div>
          <div class="bg-gray-200 border border-gray-400 rounded-2xl p-6 text-center">
            <div class="text-3xl font-bold text-green-700 mb-1">∞</div>
            <div class="text-sm text-gray-900">Share links per doc</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Values -->
    <section class="border-t border-gray-300 py-16">
      <div class="max-w-5xl mx-auto px-6">
        <h2 class="text-2xl font-bold font-sans text-gray-1000 mb-10 text-center">What we believe in</h2>
        <div class="grid md:grid-cols-3 gap-6">
          <div class="bg-gray-200 border border-gray-400 rounded-2xl p-6">
            <div class="w-10 h-10 rounded-xl bg-green-700/10 border border-green-700/20 flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            </div>
            <h3 class="font-semibold text-gray-1000 mb-2">What you see is what they get</h3>
            <p class="text-sm text-gray-900 leading-relaxed">Live preview is at the heart of Flowtali. No surprises after export — your document looks exactly the same on screen as it does printed.</p>
          </div>
          <div class="bg-gray-200 border border-gray-400 rounded-2xl p-6">
            <div class="w-10 h-10 rounded-xl bg-green-700/10 border border-green-700/20 flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <h3 class="font-semibold text-gray-1000 mb-2">Speed without compromise</h3>
            <p class="text-sm text-gray-900 leading-relaxed">A first draft in under two minutes. No fiddling with margins or table formatting. Just fill, preview, share.</p>
          </div>
          <div class="bg-gray-200 border border-gray-400 rounded-2xl p-6">
            <div class="w-10 h-10 rounded-xl bg-green-700/10 border border-green-700/20 flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            </div>
            <h3 class="font-semibold text-gray-1000 mb-2">Your data stays yours</h3>
            <p class="text-sm text-gray-900 leading-relaxed">We don't read your documents, sell your data, or share it with third parties. Encrypted in transit, access-controlled by you.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="max-w-5xl mx-auto px-6 py-20 text-center">
      <h2 class="text-3xl font-bold font-sans text-gray-1000 mb-4">Ready to get started?</h2>
      <p class="text-gray-900 mb-8">Join thousands of freelancers and small businesses sending better documents.</p>
      <div class="flex items-center justify-center gap-4 flex-wrap">
        <router-link :to="{ name: 'signup' }" class="px-6 py-3 bg-green-700 hover:bg-green-800 text-bg-100 font-semibold text-sm rounded-xl transition-colors">
          Create free account
        </router-link>
        <router-link :to="{ name: 'contact' }" class="px-6 py-3 bg-gray-200 hover:bg-gray-400 border border-gray-400 text-gray-1000 text-sm font-medium rounded-xl transition-colors">
          Get in touch
        </router-link>
      </div>
    </section>

    <!-- Footer -->
    <footer class="border-t border-gray-300 px-6 py-8 text-center">
      <div class="flex items-center justify-center gap-6 text-sm text-gray-700">
        <router-link :to="{ name: 'privacy' }" class="hover:text-gray-1000 transition-colors">Privacy</router-link>
        <router-link :to="{ name: 'terms' }" class="hover:text-gray-1000 transition-colors">Terms</router-link>
        <router-link :to="{ name: 'contact' }" class="hover:text-gray-1000 transition-colors">Contact</router-link>
      </div>
      <p class="text-xs text-gray-700/50 mt-4">© {{ new Date().getFullYear() }} Flowtali. All rights reserved.</p>
    </footer>
  </div>
</template>
