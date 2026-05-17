import type { AxiosResponse } from 'axios'
import { ref, computed, nextTick } from 'vue'

export function useFormErrors() {
  const errors = ref<Record<string, string[]>>({})

  /**
   * Get the first error message for a field
   */
  const firstError = (field: string) => {
    if (!errors.value || !field || !Object.prototype.hasOwnProperty.call(errors.value, field)) {
      return ''
    }

    const fieldErrors = errors.value[field]

    if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
      return fieldErrors[0]
    }

    return typeof fieldErrors === 'string' ? fieldErrors : ''
  }

  /**
   * Computed property to use directly in templates or props
   */
  const getError = (field: string) => computed(() => firstError(field))

  /**
   * Get all errors matching a pattern (e.g., 'items.' to get all item-related errors)
   */
  const getErrorsByPattern = (pattern: string, flatten = false) => {
    return computed(() => {
      if (!pattern || !errors.value) return flatten ? [] : {}

      const regex = new RegExp(`^${pattern.replace(/\./g, '\\.')}`)
      const matchedErrors: Record<string, string[]> = {}

      for (const [key, value] of Object.entries(errors.value)) {
        if (regex.test(key)) {
          matchedErrors[key] = value
        }
      }

      return flatten
        ? Object.values(matchedErrors).flat()
        : matchedErrors
    })
  }

  /**
   * Set errors for a single field
   */
  const setError = (field: string, value: string | string[]) => {
    errors.value[field] = Array.isArray(value) ? value : [value]
  }

  /**
   * Set multiple field errors at once (useful for API validation)
   */
  const setErrors = (newErrors: Record<string, string | string[]>) => {
    const normalizedErrors: Record<string, string[]> = {}
    for (const [key, value] of Object.entries(newErrors)) {
      normalizedErrors[key] = Array.isArray(value) ? value : [value]
    }
    errors.value = normalizedErrors
  }

  /**
   * Clear a single field error
   */
  const clearError = (field: string) => {
    delete errors.value[field]
  }

  /**
   * Clear all errors
   */
  const clearAllErrors = () => {
    errors.value = {}
  }

  /**
   * Handle Api 422 error responses gracefully
   * @param {Object} response - usually error.response
   */
  const handleApiErrorResponse = (response: AxiosResponse) => {
    if (response && response.data && response.data.errors) {
      const errors = response.data.errors;

      setErrors(errors);

      scrollToFirstError();
      return;
    }
  }

  /**
   * Scroll smoothly to the first field with an error
   * @param {string} selector - optional CSS selector prefix (e.g. 'input[name=]')
   */
  const scrollToFirstError = async (selector: string = '[name]') => {
    await nextTick()

    const firstErrorField = Object.keys(errors.value)[0]
    if (!firstErrorField) return

    const el =
      document.querySelector(`${selector}[name="${firstErrorField}"]`) ||
      document.querySelector(`[data-field="${firstErrorField}"]`)

    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      if (el instanceof HTMLElement) {
        el.focus()
      }
    }
  }

  /**
   * The instance object to be passed around
   */
  const instance = {
    errors,
    getError,
    setError,
    setErrors,
    clearError,
    clearAllErrors,
    scrollToFirstError,
    getErrorsByPattern,
    handleApiErrorResponse
  };

  return {
    errors,
    instance,
    getError,
    setError,
    setErrors,
    clearError,
    clearAllErrors,
    scrollToFirstError,
    getErrorsByPattern,
    handleApiErrorResponse
  }
}
