// Lightweight UX helper to mark invalid form fields and scroll/focus the first one
// Usage: add data-field="<key>" to the field wrapper element (the container around label+input/select)
// Then call markErrorsAndScroll(["key1","key2"]) when validation fails

export function markErrorsAndScroll(missingKeys: string[]) {
  try {
    // Clear previous error marks
    document.querySelectorAll('[data-error="true"]').forEach((el) => {
      el.setAttribute('data-error', 'false')
    })

    if (!missingKeys || missingKeys.length === 0) return

    // Mark current invalid fields
    for (const key of missingKeys) {
      const wrapper = document.querySelector<HTMLElement>(`[data-field="${CSS.escape(key)}"]`)
      if (wrapper) {
        wrapper.setAttribute('data-error', 'true')
      }
    }

    // Scroll to first invalid
    const firstKey = missingKeys[0]
    const firstWrapper = document.querySelector<HTMLElement>(`[data-field="${CSS.escape(firstKey)}"]`)
    if (firstWrapper) {
      firstWrapper.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // focus the first focusable control inside
      const focusable = firstWrapper.querySelector<HTMLElement>(
        'input, textarea, select, button[role="combobox"], [tabindex]'
      )
      if (focusable) {
        setTimeout(() => {
          focusable.focus({ preventScroll: true } as any)
        }, 250)
      }
    }
  } catch {
    // no-op
  }
}

export function clearFieldError(key: string) {
  try {
    const wrapper = document.querySelector<HTMLElement>(`[data-field="${CSS.escape(key)}"]`)
    if (wrapper) {
      wrapper.setAttribute('data-error', 'false')
    }
  } catch {
    // no-op
  }
}


