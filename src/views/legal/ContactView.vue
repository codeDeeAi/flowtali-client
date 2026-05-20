<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()

const copied = ref(false)
function copyEmail() {
  navigator.clipboard.writeText('flowtaliltd@gmail.com').catch(() => {})
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>

<template>
  <div class="min-h-screen bg-charcoal-900 text-cream">

    <!-- Nav -->
    <header class="border-b border-charcoal-800 px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
      <button @click="router.back()" class="flex items-center gap-2 text-sm text-cream-muted hover:text-cream transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        Back
      </button>
      <router-link to="/" class="font-display text-lg font-bold text-amber">Flowtali</router-link>
    </header>

    <main class="max-w-4xl mx-auto px-6 py-20">

      <!-- Header -->
      <div class="text-center mb-16">
        <div class="inline-flex items-center gap-2 bg-amber/10 border border-amber/20 text-amber text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          Get in touch
        </div>
        <h1 class="text-4xl font-bold font-display text-cream mb-4">We'd love to hear from you</h1>
        <p class="text-cream-muted text-lg max-w-xl mx-auto">
          Have a question, a feature request, or just want to say hello? Drop us a line — we read every message.
        </p>
      </div>

      <div class="grid md:grid-cols-2 gap-8">

        <!-- Contact card -->
        <div class="space-y-4">

          <div class="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-xl bg-amber/10 border border-amber/20 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              </div>
              <div>
                <div class="text-sm font-semibold text-cream">Email us</div>
                <div class="text-xs text-cream-faint">We typically reply within 24 hours</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <a href="mailto:flowtaliltd@gmail.com" class="flex-1 text-sm font-mono text-amber hover:underline truncate">
                flowtaliltd@gmail.com
              </a>
              <button
                @click="copyEmail"
                class="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 text-cream-muted hover:text-cream rounded-lg transition-colors"
              >
                <svg v-if="!copied" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                <svg v-else class="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                {{ copied ? 'Copied' : 'Copy' }}
              </button>
            </div>
          </div>

          <div class="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-6">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-xl bg-amber/10 border border-amber/20 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3"/></svg>
              </div>
              <div>
                <div class="text-sm font-semibold text-cream">Response time</div>
                <div class="text-xs text-cream-faint">Business hours, Mon – Fri</div>
              </div>
            </div>
            <p class="text-sm text-cream-muted">We aim to respond to all enquiries within <strong class="text-cream">one business day</strong>. For urgent issues, please include "URGENT" in your subject line.</p>
          </div>

        </div>

        <!-- What to write about -->
        <div class="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-6 space-y-5">
          <h3 class="text-base font-semibold text-cream">What can we help with?</h3>

          <div class="space-y-3">
            <div v-for="item in [
              { icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', title: 'Feature requests', desc: 'Have an idea that would make Flowtali better? We love hearing from users.' },
              { icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', title: 'Bug reports', desc: 'Found something broken? Tell us exactly what happened and we\'ll fix it fast.' },
              { icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', title: 'General questions', desc: 'Not sure how something works? We\'ll walk you through it.' },
              { icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', title: 'Team & billing', desc: 'Questions about your plan, invoices, or team access.' },
            ]" :key="item.title"
              class="flex items-start gap-3"
            >
              <div class="w-7 h-7 rounded-lg bg-charcoal-700 border border-charcoal-600 flex items-center justify-center shrink-0 mt-0.5">
                <svg class="w-3.5 h-3.5 text-cream-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.icon"/></svg>
              </div>
              <div>
                <div class="text-sm font-medium text-cream">{{ item.title }}</div>
                <div class="text-xs text-cream-faint mt-0.5 leading-relaxed">{{ item.desc }}</div>
              </div>
            </div>
          </div>

          <div class="pt-2 border-t border-charcoal-700">
            <a href="mailto:flowtaliltd@gmail.com" class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber hover:bg-amber-light text-charcoal-900 font-semibold text-sm rounded-xl transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              Send us an email
            </a>
          </div>
        </div>

      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-charcoal-800 mt-4 px-6 py-8 text-center">
      <div class="flex items-center justify-center gap-6 text-sm text-cream-faint">
        <router-link :to="{ name: 'about' }" class="hover:text-cream transition-colors">About</router-link>
        <router-link :to="{ name: 'privacy' }" class="hover:text-cream transition-colors">Privacy</router-link>
        <router-link :to="{ name: 'terms' }" class="hover:text-cream transition-colors">Terms</router-link>
      </div>
      <p class="text-xs text-cream-faint/50 mt-4">© {{ new Date().getFullYear() }} Flowtali. All rights reserved.</p>
    </footer>
  </div>
</template>
