<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useTourStore } from '@/stores/tour'
import { usePermissions } from '@/composables/usePermissions'

const tourStore = useTourStore()
const router = useRouter()
const { can, isBusinessOrg } = usePermissions()

interface TourStep {
  selector: string | null
  title: string
  description: string
  route?: string
}

// Steps are computed so they reflect the user's actual org type and permissions.
const steps = computed<TourStep[]>(() => {
  const list: TourStep[] = [
    {
      selector: null,
      title: 'Welcome to Flowtali!',
      description: "Let's walk you through the key features. This will only take a minute.",
    },
    {
      selector: '[data-tour="nav-dashboard"]',
      title: 'Your Dashboard',
      description: 'Get an overview of your revenue, outstanding amounts, collection rate, and recent activity.',
      route: '/app/dashboard',
    },
  ]

  if (isBusinessOrg.value && can('projects.read')) {
    list.push({
      selector: '[data-tour="nav-projects"]',
      title: 'Projects',
      description: 'Group invoices and work under projects to keep client engagements organised.',
      route: '/app/projects',
    })
  }

  if (can('invoices.read')) {
    list.push({
      selector: '[data-tour="nav-invoices"]',
      title: 'Invoices',
      description: 'Create professional invoices, track their status, and share them with clients in one click.',
      route: '/app/invoices',
    })
  }

  if (can('clients.read')) {
    list.push({
      selector: '[data-tour="nav-clients"]',
      title: 'Clients',
      description: 'Store client details here so you can populate invoices instantly without re-typing.',
      route: '/app/clients',
    })
  }

  if (isBusinessOrg.value && can('members.read')) {
    list.push({
      selector: '[data-tour="nav-members"]',
      title: 'Members',
      description: 'Invite team members to your organisation and control what each person can access.',
      route: '/app/members',
    })
  }

  if (isBusinessOrg.value && can('roles.read')) {
    list.push({
      selector: '[data-tour="nav-roles"]',
      title: 'Roles & Permissions',
      description: 'Define custom roles with fine-grained permissions so every team member has the right access.',
      route: '/app/roles',
    })
  }

  list.push({
    selector: '[data-tour="nav-org-preferences"]',
    title: 'Org Preferences',
    description: 'Set up your bank details, invoice templates, stamps, and tax preferences for your organisation.',
    route: '/app/org-preferences',
  })

  if (can('analytics.read')) {
    list.push({
      selector: '[data-tour="nav-analytics"]',
      title: 'Analytics',
      description: 'Dive deeper into revenue trends, invoice performance, and business insights over time.',
      route: '/app/analytics',
    })
  }

  list.push({
    selector: null,
    title: "You're all set!",
    description: isBusinessOrg.value
      ? "That's the tour. Start by inviting your team, adding clients, and creating your first invoice."
      : "That's the tour. Start by adding a client, then create your first invoice. Good luck!",
  })

  return list
})

const totalSteps = computed(() => steps.value.length)

const spotlightRect = ref<{ top: number; left: number; width: number; height: number } | null>(null)
const tooltipStyle = ref<Record<string, string>>({})

const currentStep = computed(() => tourStore.currentStep)
const step = computed(() => steps.value[currentStep.value])
const isFirst = computed(() => currentStep.value === 0)
const isLast = computed(() => currentStep.value === totalSteps.value - 1)

async function updatePosition() {
  await nextTick()
  const s = step.value
  if (!s?.selector) {
    spotlightRect.value = null
    tooltipStyle.value = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      maxWidth: '380px',
      width: '90vw',
    }
    return
  }

  const el = document.querySelector(s.selector) as HTMLElement | null
  if (!el) {
    spotlightRect.value = null
    tooltipStyle.value = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      maxWidth: '380px',
      width: '90vw',
    }
    return
  }

  const padding = 6
  const rect = el.getBoundingClientRect()
  spotlightRect.value = {
    top: rect.top - padding,
    left: rect.left - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  }

  const tooltipW = 280
  const rightSpace = window.innerWidth - rect.right - padding

  if (rightSpace >= tooltipW + 20) {
    tooltipStyle.value = {
      position: 'fixed',
      top: `${Math.max(16, rect.top + rect.height / 2)}px`,
      left: `${rect.right + padding + 16}px`,
      transform: 'translateY(-50%)',
      width: `${tooltipW}px`,
    }
  } else if (rect.left >= tooltipW + 20) {
    tooltipStyle.value = {
      position: 'fixed',
      top: `${Math.max(16, rect.top + rect.height / 2)}px`,
      right: `${window.innerWidth - rect.left + padding + 16}px`,
      transform: 'translateY(-50%)',
      width: `${tooltipW}px`,
    }
  } else {
    tooltipStyle.value = {
      position: 'fixed',
      top: `${rect.bottom + padding + 16}px`,
      left: `${Math.max(16, rect.left + rect.width / 2 - tooltipW / 2)}px`,
      width: `${tooltipW}px`,
    }
  }
}

watch(
  () => tourStore.currentStep,
  async (newStep) => {
    const s = steps.value[newStep]
    if (s?.route) await router.push(s.route)
    await updatePosition()
  },
  { immediate: true },
)

watch(() => tourStore.isTourActive, async (active) => {
  if (active) await updatePosition()
})

function onResize() { updatePosition() }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

function handleNext() { tourStore.nextStep(totalSteps.value) }
function handlePrev() { tourStore.prevStep() }
function handleEnd() { tourStore.endTour() }
</script>

<template>
  <Teleport to="body">
    <div v-if="tourStore.isTourActive" class="fixed inset-0 z-[300]" @click.self="handleEnd">

      <!-- Dark overlay -->
      <div class="absolute inset-0 bg-black/70" style="pointer-events: none;" />

      <!-- Spotlight cutout -->
      <div
        v-if="spotlightRect"
        class="absolute rounded-lg pointer-events-none transition-all duration-300"
        :style="{
          top: spotlightRect.top + 'px',
          left: spotlightRect.left + 'px',
          width: spotlightRect.width + 'px',
          height: spotlightRect.height + 'px',
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.75)',
          border: '2px solid rgba(0,200,83,0.6)',
          zIndex: 1,
        }"
      />

      <!-- Tooltip card -->
      <div
        class="absolute z-10 bg-gray-200 border border-gray-500 rounded-xl shadow-2xl p-5 transition-all duration-300"
        :style="tooltipStyle"
        style="box-shadow: 0 20px 60px rgba(0,0,0,0.6);"
      >
        <!-- Step dots + counter -->
        <div class="flex items-center justify-between mb-3">
          <div class="flex gap-1">
            <div
              v-for="(_, i) in steps"
              :key="i"
              class="h-1 rounded-full transition-all duration-300"
              :class="i === currentStep ? 'bg-green-700 w-4' : i < currentStep ? 'bg-green-700/40 w-2' : 'bg-gray-500 w-2'"
            />
          </div>
          <span class="text-[10px] text-gray-700 font-medium">{{ currentStep + 1 }} / {{ totalSteps }}</span>
        </div>

        <!-- Content -->
        <h3 class="font-sans text-base font-semibold text-gray-1000 mb-1.5">{{ step?.title }}</h3>
        <p class="text-sm text-gray-700 leading-relaxed mb-4">{{ step?.description }}</p>

        <!-- Actions -->
        <div class="flex items-center gap-2">
          <button
            v-if="!isFirst"
            class="flex items-center gap-1 text-xs text-gray-700 hover:text-gray-1000 transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-400"
            @click="handlePrev"
          >
            <Icon icon="lucide:arrow-left" class="w-3.5 h-3.5" />
            Back
          </button>

          <div class="flex-1" />

          <button
            class="text-xs text-gray-700 hover:text-gray-1000 transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-400"
            @click="handleEnd"
          >
            Skip tour
          </button>

          <button
            class="flex items-center gap-1.5 bg-green-700 hover:bg-green-800 text-bg-100 font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors"
            @click="handleNext"
          >
            {{ isLast ? 'Finish' : 'Next' }}
            <Icon v-if="!isLast" icon="lucide:arrow-right" class="w-3.5 h-3.5" />
            <Icon v-else icon="lucide:check" class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

    </div>
  </Teleport>
</template>
