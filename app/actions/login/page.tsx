import type { Handle } from 'remix/component'

import { routes } from '../../routes.ts'
import {
  alertClass,
  buttonClass,
  fieldClass,
  formClass,
  inputClass,
  labelClass,
  linkClass,
  PageCard,
} from '../../ui/page-card.tsx'
import { Document } from '../document.tsx'

export interface LoginPageProps {
  csrfToken: string
  email?: string
  returnTo?: string | null
  failed?: boolean
}

export function LoginPage(handle: Handle<LoginPageProps>) {
  return () => {
    let { csrfToken, email = '', returnTo, failed = false } = handle.props

    return (
      <Document title="Log in">
        <PageCard
          title="Log in"
          footer={
            <>
              No account yet?{' '}
              <a class={linkClass} href={routes.signup.index.href()}>
                Sign up
              </a>
            </>
          }
        >
          {failed && (
            <p role="alert" class={alertClass}>
              Incorrect email or password.
            </p>
          )}
          <form method="post" action={routes.login.action.href()} class={formClass}>
            <input type="hidden" name="_csrf" value={csrfToken} />
            {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
            <div class={fieldClass}>
              <label htmlFor="login-email" class={labelClass}>
                Email
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={email}
                required
                class={inputClass}
              />
            </div>
            <div class={fieldClass}>
              <label htmlFor="login-password" class={labelClass}>
                Password
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                class={inputClass}
              />
            </div>
            <button type="submit" class={buttonClass}>
              Log in
            </button>
          </form>
        </PageCard>
      </Document>
    )
  }
}
