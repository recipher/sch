import type { Handle } from 'remix/component'
import type { Issue } from 'remix/data-schema'

import { routes } from '../../routes.ts'
import {
  alertClass,
  buttonClass,
  fieldClass,
  fieldErrorClass,
  formClass,
  inputClass,
  labelClass,
  linkClass,
  PageCard,
} from '../../ui/page-card.tsx'
import { Document } from '../document.tsx'

export interface SignupPageProps {
  csrfToken: string
  email?: string
  issues?: readonly Issue[]
}

export function SignupPage(handle: Handle<SignupPageProps>) {
  return () => {
    let { csrfToken, email = '', issues = [] } = handle.props
    let emailIssue = issues.find((issue) => issue.path?.[0] === 'email')
    let passwordIssue = issues.find((issue) => issue.path?.[0] === 'password')

    return (
      <Document title="Sign up">
        <PageCard
          title="Sign up"
          footer={
            <>
              Already have an account?{' '}
              <a class={linkClass} href={routes.login.index.href()}>
                Log in
              </a>
            </>
          }
        >
          {issues.length > 0 && (
            <p role="alert" class={alertClass}>
              Please correct the fields below.
            </p>
          )}
          <form method="post" action={routes.signup.action.href()} class={formClass}>
            <input type="hidden" name="_csrf" value={csrfToken} />
            <div class={fieldClass}>
              <label htmlFor="signup-email" class={labelClass}>
                Email
              </label>
              <input
                id="signup-email"
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={email}
                required
                class={inputClass}
                aria-invalid={emailIssue ? 'true' : undefined}
                aria-describedby={emailIssue ? 'signup-email-error' : undefined}
              />
              {emailIssue && (
                <p id="signup-email-error" class={fieldErrorClass}>
                  {emailIssue.message}
                </p>
              )}
            </div>
            <div class={fieldClass}>
              <label htmlFor="signup-password" class={labelClass}>
                Password
              </label>
              <input
                id="signup-password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                class={inputClass}
                aria-invalid={passwordIssue ? 'true' : undefined}
                aria-describedby={passwordIssue ? 'signup-password-error' : 'signup-password-hint'}
              />
              {passwordIssue ? (
                <p id="signup-password-error" class={fieldErrorClass}>
                  {passwordIssue.message}
                </p>
              ) : (
                <p id="signup-password-hint" class="text-xs text-fg-muted">
                  At least 8 characters.
                </p>
              )}
            </div>
            <button type="submit" class={buttonClass}>
              Create account
            </button>
          </form>
        </PageCard>
      </Document>
    )
  }
}
