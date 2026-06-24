<script setup lang="ts">
import FlowtaliLogo from '@/components/ui/FlowtaliLogo.vue'
</script>
<template>
  <footer class="border-t border-gray-400/30 py-12 bg-bg-100">
    <div class="max-w-7xl mx-auto px-6">
      <div class="grid md:grid-cols-5 gap-10 mb-12">
        <div class="md:col-span-2">
          <router-link :to="{ name: 'home' }" class="flex items-center mb-4 cursor-pointer">
            <FlowtaliLogo variant="full" :size="20" />
          </router-link>
          <p class="text-gray-700 text-sm leading-relaxed max-w-xs">Professional invoices and letterheads for
            freelancers and small businesses. Get paid faster, communicate better.</p>
        </div>
        <div>
          <div class="text-gray-1000 text-sm font-semibold mb-4">Products</div>
          <div class="flex flex-col gap-2.5">
            <router-link :to="{ name: 'signup' }"
              class="text-gray-700 text-sm hover:text-gray-1000 cursor-pointer transition-colors">Invoice
              Generator</router-link>
            <router-link :to="{ name: 'signup' }"
              class="text-gray-700 text-sm hover:text-gray-1000 cursor-pointer transition-colors">Letterhead
              Generator</router-link>
            <span class="text-gray-700 text-sm cursor-not-allowed opacity-50">Pricing</span>
            <router-link :to="{ name: 'changelog' }"
              class="text-gray-700 text-sm hover:text-gray-1000 transition-colors">Changelog</router-link>
          </div>
        </div>
        <div>
          <div class="text-gray-1000 text-sm font-semibold mb-4">Developers</div>
          <div class="flex flex-col gap-2.5">
            <router-link :to="{ name: 'docs.embed' }"
              class="text-gray-700 text-sm hover:text-gray-1000 transition-colors">Embed SDK</router-link>
            <router-link :to="{ name: 'docs.embed', hash: '#auth' }"
              class="text-gray-700 text-sm hover:text-gray-1000 transition-colors">API Keys</router-link>
            <router-link :to="{ name: 'docs.embed', hash: '#events' }"
              class="text-gray-700 text-sm hover:text-gray-1000 transition-colors">Events</router-link>
            <router-link :to="{ name: 'changelog' }"
              class="text-gray-700 text-sm hover:text-gray-1000 transition-colors">Changelog</router-link>
          </div>
        </div>
        <div>
          <div class="text-gray-1000 text-sm font-semibold mb-4">Company</div>
          <div class="flex flex-col gap-2.5">
            <router-link :to="{ name: 'about' }"
              class="text-gray-700 text-sm hover:text-gray-1000 transition-colors">About</router-link>
            <router-link :to="{ name: 'privacy' }"
              class="text-gray-700 text-sm hover:text-gray-1000 transition-colors">Privacy</router-link>
            <router-link :to="{ name: 'terms' }"
              class="text-gray-700 text-sm hover:text-gray-1000 transition-colors">Terms</router-link>
            <router-link :to="{ name: 'contact' }"
              class="text-gray-700 text-sm hover:text-gray-1000 transition-colors">Contact</router-link>
          </div>
        </div>
      </div>
      <div class="section-divider mb-6"></div>
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="text-gray-700 text-xs">© {{ new Date().getFullYear() }} Flowtali. All rights reserved.</div>
        <div class="flex gap-5 text-gray-700 text-xs">
          <router-link :to="{ name: 'about' }" class="hover:text-gray-1000 transition-colors">About</router-link>
          <router-link :to="{ name: 'privacy' }" class="hover:text-gray-1000 transition-colors">Privacy</router-link>
          <router-link :to="{ name: 'terms' }" class="hover:text-gray-1000 transition-colors">Terms</router-link>
          <router-link :to="{ name: 'contact' }" class="hover:text-gray-1000 transition-colors">Contact</router-link>
        </div>
      </div>
    </div>
  </footer>
</template>
