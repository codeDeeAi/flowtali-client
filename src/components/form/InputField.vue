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
    <input ref="inputComponent" class="form-input" :class="{ 'error -': error, [inputClasses]: inputClasses }"
      :value="modelValue" :type="type" v-bind="$attrs" :style="inputStyles" @input="handleInput" @change="handleChange"
      @keydown="handleKeyDown" @focus="handleFocus" @blur="handleBlur" />
    <small v-if="error" class="error__color text-xs">{{ error }}</small>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'

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
    type: [String, Number],
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
  type: {
    type: String,
    required: false,
    default: 'text',
  },
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

const handleKeyDown = (event: KeyboardEvent) => {
  if (props.type === 'number') {
    const allowedKeys = ['Backspace', 'Tab', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
    const target = event.target as HTMLInputElement

    const value = target.value
    const key = event.key

    if (event.ctrlKey || event.metaKey) return

    if (allowedKeys.includes(key)) return

    if (key === '.' && value.includes('.')) {
      emit('invalidExpressionError', value + key)
      event.preventDefault()
      return
    }

    if (!/^\d$/.test(key)) {
      emit('invalidExpressionError', value + key)
      event.preventDefault()
      return
    }
  }
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
