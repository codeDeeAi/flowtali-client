<template>
  <div class="space-y-1">
    <label v-if="labelText" class="flex capitalize text-sm" :class="[
      labelClass,
      {
        'label__color -': !error,
        'error__color -': error,
      },
    ]">
      <span>{{ labelText }}</span>
      <span v-if="isRequired" class="error__color">*</span>
    </label>
    <textarea ref="inputComponent" class="form-input" :class="{ 'error -': error, [inputClasses]: inputClasses }"
      v-bind="$attrs" :style="inputStyles" @input="handleInput" @change="handleChange" @focus="handleFocus"
      @blur="handleBlur" :value="modelValue">
    </textarea>
    <small v-if="error" class="error__color text-xs">{{ error }}</small>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'

defineProps({
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
})

const emit = defineEmits([
  'input',
  'change',
  'blur',
  'focus',
  'invalidExpressionError',
  'update:modelValue',
])

const inputComponent = ref<HTMLTextAreaElement | null>(null)

const handleInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  emit('input', target.value)
  emit('update:modelValue', target.value)
}

const handleChange = (event: Event) => {
  const target = event.target as HTMLTextAreaElement

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

textarea {
  border-color: #e3e3e3;
}


textarea.error {
  border-color: #e4626f;
}

textarea:focus,
textarea:focus-visible {
  outline: none;
  box-shadow: none;
}

/* For Webkit Browsers (Chrome, Safari, Edge) */
textarea[type='number']::-webkit-inner-spin-button,
textarea[type='number']::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* For Firefox */
textarea[type='number'] {
  appearance: textfield;
  -moz-appearance: textfield;
}
</style>
