import type { Handle, RemixNode } from 'remix/component'

export interface PageCardProps {
  title: string
  children?: RemixNode
  footer?: RemixNode
}

// Centered card used by the signup, login and account pages.
export function PageCard(handle: Handle<PageCardProps>) {
  return () => {
    let { title, children, footer } = handle.props

    return (
      <main class="flex min-h-screen items-center justify-center px-4 py-12">
        <div class="w-full max-w-sm">
          <div class="flex flex-col gap-6 rounded-[20px] bg-surface-3 px-6 pt-8 pb-6">
            <h1 class="text-sm/normal font-bold tracking-widest uppercase">{title}</h1>
            {children}
          </div>
          {footer && <p class="mt-6 text-center text-fg-muted">{footer}</p>}
        </div>
      </main>
    )
  }
}

export const formClass = 'flex flex-col gap-5'

export const fieldClass = 'flex flex-col gap-2'

export const labelClass = 'text-xs font-bold tracking-wider uppercase'

export const inputClass =
  'w-full rounded-xl border border-transparent bg-surface-4 px-4 py-3 text-fg outline-none transition-colors placeholder:text-fg-muted focus:border-brand aria-invalid:border-danger'

export const fieldErrorClass = 'text-xs text-danger'

export const alertClass = 'rounded-xl bg-danger/10 px-4 py-3 text-danger'

export const buttonClass =
  'w-full cursor-pointer rounded-xl bg-fg px-4 py-3 font-bold text-surface-3 transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

export const secondaryButtonClass =
  'w-full cursor-pointer rounded-xl border border-fg-muted/40 px-4 py-3 font-bold transition-colors hover:bg-surface-4 hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

export const linkClass = 'text-fg underline decoration-fg-muted underline-offset-4 hover:text-brand hover:decoration-brand'
