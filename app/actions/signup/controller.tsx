import * as s from 'remix/data-schema'
import { getCsrfToken } from 'remix/middleware/csrf'
import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { hashPassword } from '../../data/passwords.ts'
import { users } from '../../data/tables.ts'
import { signIn } from '../../middleware/auth.ts'
import type { AppContext } from '../../router.ts'
import { routes } from '../../routes.ts'
import { SignupPage } from './page.tsx'
import { signupForm } from './schema.ts'

const EMAIL_TAKEN = [{ message: 'An account with this email already exists', path: ['email'] }]

export default createController(routes.signup, {
  actions: {
    index(context) {
      if (context.auth.ok) return redirect(routes.account.href(), 303)

      return context.render(<SignupPage csrfToken={getCsrfToken(context)} />)
    },
    async action(context) {
      let parsed = s.parseSafe(signupForm, context.formData)
      if (!parsed.success) {
        return context.render(
          <SignupPage
            csrfToken={getCsrfToken(context)}
            email={readText(context.formData, 'email')}
            issues={parsed.issues}
          />,
          { status: 400 },
        )
      }

      let { email, password } = parsed.value

      let existing = await context.db.findOne(users, { where: { email } })
      if (existing !== null) {
        return renderEmailTaken(context, email)
      }

      let id = crypto.randomUUID()

      try {
        await context.db.create(users, {
          id,
          email,
          password_hash: await hashPassword(password),
          created_at: Date.now(),
        })
      } catch (error) {
        // A concurrent signup can win the race past the lookup above.
        if (isUniqueViolation(error)) {
          return renderEmailTaken(context, email)
        }
        console.error('Failed to create user:', error)
        return new Response('Unable to create account', { status: 500 })
      }

      signIn(context, id)
      return redirect(routes.account.href(), 303)
    },
  },
})

function renderEmailTaken(context: AppContext, email: string) {
  return context.render(
    <SignupPage csrfToken={getCsrfToken(context)} email={email} issues={EMAIL_TAKEN} />,
    { status: 409 },
  )
}

function readText(formData: FormData, name: string): string {
  let value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

function isUniqueViolation(error: unknown): boolean {
  let message = error instanceof Error ? `${error.message} ${String(error.cause ?? '')}` : ''
  return /UNIQUE constraint failed/i.test(message)
}
