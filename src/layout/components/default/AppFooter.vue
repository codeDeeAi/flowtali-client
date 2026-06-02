<script setup lang="ts">
</script>
<template>
  <footer class="border-t border-charcoal-700/30 py-12 bg-charcoal-950">
    <div class="max-w-7xl mx-auto px-6">
      <div class="grid md:grid-cols-4 gap-10 mb-12">
        <div class="md:col-span-2">
          <router-link :to="{ name: 'home' }" class="flex items-center gap-2.5 mb-4 cursor-pointer">
            <div
              class="w-7 h-7 rounded-lg bg-gradient-to-br from-amber to-amber-light flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0a0a0b" stroke-width="2.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M7 8h10M7 12h6M7 16h4" />
              </svg>
            </div>
            <span class="font-display font-semibold text-lg text-cream">Flowtali</span>
          </router-link>
          <p class="text-cream-faint text-sm leading-relaxed max-w-xs">Professional invoices and letterheads for
            freelancers and small businesses. Get paid faster, communicate better.</p>
        </div>
        <div>
          <div class="text-cream text-sm font-semibold mb-4">Products</div>
          <div class="flex flex-col gap-2.5">
            <router-link :to="{ name: 'signup' }"
              class="text-cream-faint text-sm hover:text-cream cursor-pointer transition-colors">Invoice
              Generator</router-link>
            <router-link :to="{ name: 'signup' }"
              class="text-cream-faint text-sm hover:text-cream cursor-pointer transition-colors">Letterhead
              Generator</router-link>
            <span class="text-cream-faint text-sm cursor-not-allowed opacity-50">Pricing</span>
            <router-link :to="{ name: 'changelog' }"
              class="text-cream-faint text-sm hover:text-cream transition-colors">Changelog</router-link>
          </div>
        </div>
        <div>
          <div class="text-cream text-sm font-semibold mb-4">Company</div>
          <div class="flex flex-col gap-2.5">
            <router-link :to="{ name: 'about' }"
              class="text-cream-faint text-sm hover:text-cream transition-colors">About</router-link>
            <router-link :to="{ name: 'privacy' }"
              class="text-cream-faint text-sm hover:text-cream transition-colors">Privacy</router-link>
            <router-link :to="{ name: 'terms' }"
              class="text-cream-faint text-sm hover:text-cream transition-colors">Terms</router-link>
            <router-link :to="{ name: 'contact' }"
              class="text-cream-faint text-sm hover:text-cream transition-colors">Contact</router-link>
          </div>
        </div>
      </div>
      <div class="section-divider mb-6"></div>
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="text-cream-faint text-xs">© {{ new Date().getFullYear() }} Flowtali. All rights reserved.</div>
        <div class="flex gap-5 text-cream-faint text-xs">
          <router-link :to="{ name: 'about' }" class="hover:text-cream transition-colors">About</router-link>
          <router-link :to="{ name: 'privacy' }" class="hover:text-cream transition-colors">Privacy</router-link>
          <router-link :to="{ name: 'terms' }" class="hover:text-cream transition-colors">Terms</router-link>
          <router-link :to="{ name: 'contact' }" class="hover:text-cream transition-colors">Contact</router-link>
        </div>
      </div>
    </div>
  </footer>
</template>
