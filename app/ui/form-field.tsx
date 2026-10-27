import type { Handle } from 'remix/component'
import type { Issue } from 'remix/data-schema'

import { fieldClass, fieldErrorClass, inputClass, labelClass } from './page-card.tsx'

export interface TextFieldProps {
  id: string
  name: string
  label: string
  type?: 'text' | 'date'
  value?: string
  required?: boolean
  issues?: readonly Issue[]
}

// A labelled input that shows the first issue reported for its name.
export function TextField(handle: Handle<TextFieldProps>) {
  return () => {
    let { id, name, label, type = 'text', value = '', required = false, issues = [] } = handle.props
    let issue = issues.find((candidate) => candidate.path?.[0] === name)
    let errorId = `${id}-error`
    let inputProps = {
      id,
      name,
      defaultValue: value,
      required,
      class: inputClass,
      'aria-invalid': issue ? ('true' as const) : undefined,
      'aria-describedby': issue ? errorId : undefined,
    }

    return (
      <div class={fieldClass}>
        <label htmlFor={id} class={labelClass}>
          {label}
        </label>
        {type === 'date' ? <input type="date" {...inputProps} /> : <input type="text" {...inputProps} />}
        {issue && (
          <p id={errorId} class={fieldErrorClass}>
            {issue.message}
          </p>
        )}
      </div>
    )
  }
}

export function readText(formData: FormData, name: string): string {
  let value = formData.get(name)
  return typeof value === 'string' ? value : ''
}
