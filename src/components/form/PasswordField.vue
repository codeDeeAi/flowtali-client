<template>
  <div class="space-y-1">
    <label v-if="labelText" class="flex capitalize text-sm text-cream-faint" :class="[
      labelClass,
      {
        'label__color -': !error,
        'error__color -': error,
      },
    ]">
      <span>{{ labelText }}</span>
      <span v-if="isRequired" class="error__color">*</span>
    </label>
    <div class="relative">
      <input ref="inputComponent" class="form-input" :class="{ 'error -': error, [inputClasses]: inputClasses }"
        :value="modelValue" :type="type" v-bind="$attrs" :style="inputStyles" @input="handleInput"
        @change="handleChange" @keydown="handleKeyDown" @focus="handleFocus" @blur="handleBlur" />
      <small v-if="error" class="error__color text-xs">{{ error }}</small>

      <button class="absolute right-3 top-1/2 -translate-y-1/2 text-cream-faint hover:text-cream"
        @click="handleTypeChange"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2">
          <path v-if="type === 'password'" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle v-if="type === 'password'" cx="12" cy="12" r="3" />
          <path v-if="type === 'text'"
            d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" />
        </svg>
      </button>
    </div>

    <!-- Strength Indicator -->
    <div v-if="useStrengthIndicator" class="flex gap-1 mt-2">
      <div v-for="i in 4" :key="i" class="flex-1 h-0.5 rounded-full transition-colors duration-200"
        :class="passwordStrength >= i ? (passwordStrength >= 4 ? 'bg-green-500' : passwordStrength >= 3 ? 'bg-amber' : 'bg-red-500') : 'bg-charcoal-600'">
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps({
  labelText: {
    type: String,
    required: false,
  },
  labelClass: {
    type: String,
    required: false,
    default: '',
  },
  modelValue: {
    type: [String],
    required: false,
    default: '',
  },
  inputClasses: {
    type: String,
    required: false,
    default: '',
  },
  inputStyles: {
    type: Object,
    required: false,
    default: () => ({}),
  },
  isRequired: {
    type: Boolean,
    required: false,
    default: false,
  },
  error: {
    type: String,
    required: false,
    default: '',
  },
  useStrengthIndicator: {
    type: Boolean,
    required: false,
    default: false,
  }
})

const emit = defineEmits([
  'input',
  'change',
  'blur',
  'focus',
  'invalidExpressionError',
  'update:modelValue',
])

const inputComponent = ref<HTMLInputElement | null>(null)

const type = ref<'password' | 'text'>('password')

const passwordStrength = computed(() => {
  const value = props.modelValue;

  if (!value) return 0;

  let strength = 0;

  if (value.length >= 8) strength++;

  if (/[A-Z]/.test(value)) strength++;

  if (/[0-9]/.test(value)) strength++;

  if (/[^A-Za-z0-9]/.test(value)) strength++;

  return strength;
});

const handleKeyDown = () => {

  return;
}

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement

  emit('input', target.value)
  emit('update:modelValue', target.value)
}

const handleChange = (event: Event) => {
  const target = event.target as HTMLInputElement

  emit('change', target.value)
}

const handleFocus = (event: Event) => {
  emit('focus', event)
}

const handleBlur = (event: Event) => {
  emit('blur', event)
}

const handleTypeChange = () => {
  type.value = type.value === 'password' ? 'text' : 'password'
}

defineExpose({
  inputComponent,
})
</script>
<style scoped>
.error__color {
  color: #e4626f;
}

.label__color {
  color: #616161;
}

input {
  border-color: #e3e3e3;
}

input::placeholder {
  color: #d1d1d1;
}

input.error {
  border-color: #e4626f !important;
}

input:focus,
input:focus-visible {
  outline: none;
  box-shadow: none;
}

/* For Webkit Browsers (Chrome, Safari, Edge) */
input[type='number']::-webkit-inner-spin-button,
input[type='number']::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* For Firefox */
input[type='number'] {
  appearance: textfield;
  -moz-appearance: textfield;
}
</style>
