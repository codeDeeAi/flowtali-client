<script setup lang="ts">
import { useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';

const router = useRouter();
</script>

<template>
  <div class="min-h-screen bg-charcoal-900 flex items-center justify-center p-6">
    <div class="text-center max-w-md">

      <!-- Glowing 404 -->
      <div class="relative mb-8 inline-block">
        <div class="font-display text-[120px] md:text-[160px] font-bold leading-none select-none"
          style="background: linear-gradient(135deg, #e8a83e 0%, #f2c16b 40%, #e8a83e 60%, #c8782a 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
          404
        </div>
        <!-- Glow blur -->
        <div class="absolute inset-0 font-display text-[120px] md:text-[160px] font-bold leading-none text-amber opacity-20 blur-2xl pointer-events-none select-none">
          404
        </div>
      </div>

      <!-- Icon -->
      <div class="w-14 h-14 rounded-2xl bg-amber/10 border border-amber/20 flex items-center justify-center mx-auto mb-5">
        <Icon icon="lucide:compass-off" class="w-7 h-7 text-amber" />
      </div>

      <h1 class="text-xl font-semibold text-cream mb-2">Page not found</h1>
      <p class="text-sm text-cream-faint mb-8 leading-relaxed">
        The page you're looking for doesn't exist or has been moved.<br/>
        Double-check the URL or head back to safety.
      </p>

      <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          class="flex items-center gap-2 bg-amber hover:bg-amber-light text-charcoal-900 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors w-full sm:w-auto justify-center"
          @click="router.push('/app/dashboard')"
        >
          <Icon icon="lucide:layout-dashboard" class="w-4 h-4" />
          Go to Dashboard
        </button>
        <button
          class="flex items-center gap-2 bg-charcoal-800 border border-charcoal-700 hover:border-charcoal-500 text-cream-muted hover:text-cream text-sm px-5 py-2.5 rounded-lg transition-colors w-full sm:w-auto justify-center"
          @click="router.back()"
        >
          <Icon icon="lucide:arrow-left" class="w-4 h-4" />
          Go Back
        </button>
      </div>

    </div>
  </div>
</template>
