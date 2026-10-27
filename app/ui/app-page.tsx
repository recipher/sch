import type { Handle, RemixNode } from 'remix/component'

import { Document } from '../actions/document.tsx'
import { routes } from '../routes.ts'
import { linkClass } from './page-card.tsx'

export interface Crumb {
  label: string
  href: string
}

export interface AppPageProps {
  title: string
  crumbs?: Crumb[]
  children?: RemixNode
}

// Wide layout for signed-in pages, with breadcrumbs back up the client hierarchy.
export function AppPage(handle: Handle<AppPageProps>) {
  return () => {
    let { title, crumbs = [], children } = handle.props

    return (
      <Document title={title}>
        <header class="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <a href={routes.clients.index.href()} class="font-bold tracking-widest uppercase hover:text-brand">
            Scheduler
          </a>
          <a href={routes.account.href()} class={linkClass}>
            Your account
          </a>
        </header>
        <main class="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-12 sm:px-6">
          {crumbs.length > 0 && (
            <nav aria-label="Breadcrumb" class="text-fg-muted">
              {crumbs.map((crumb, index) => (
                <span key={crumb.href}>
                  {index > 0 && ' / '}
                  <a href={crumb.href} class={linkClass}>
                    {crumb.label}
                  </a>
                </span>
              ))}
            </nav>
          )}
          <h1 class="text-base font-bold tracking-widest uppercase">{title}</h1>
          {children}
        </main>
      </Document>
    )
  }
}

export function Section(handle: Handle<{ title: string; children?: RemixNode }>) {
  return () => (
    <section class="flex flex-col gap-4 rounded-[20px] bg-surface-3 px-6 pt-6 pb-6">
      <h2 class="text-sm/normal font-bold tracking-widest uppercase">{handle.props.title}</h2>
      {handle.props.children}
    </section>
  )
}

export const tableClass = 'w-full text-left [&_td]:py-2 [&_td]:pr-4 [&_th]:pb-2 [&_th]:pr-4 [&_th]:text-xs [&_th]:tracking-wider [&_th]:text-fg-muted [&_th]:uppercase'

export const emptyClass = 'text-fg-muted'
