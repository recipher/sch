import { createCredentialsAuthProvider, verifyCredentials } from 'remix/auth'
import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'
import { getCsrfToken } from 'remix/middleware/csrf'

import { hashPassword, verifyPassword } from '../../data/passwords.ts'
import { users } from '../../data/tables.ts'
import { safeReturnTo, signIn } from '../../middleware/auth.ts'
import { routes } from '../../routes.ts'
import { LoginPage } from './page.tsx'

// Checked against when the email is unknown, so both failures take about as long.
const unknownUserHash = hashPassword('unknown-user-placeholder')

export default createController(routes.login, {
  actions: {
    index(context) {
      if (context.auth.ok) return redirect(routes.account.href(), 303)

      return context.render(
        <LoginPage
          csrfToken={getCsrfToken(context)}
          returnTo={safeReturnTo(context.url.searchParams.get('returnTo'))}
        />,
      )
    },
    async action(context) {
      let db = context.db
      let passwordProvider = createCredentialsAuthProvider({
        parse() {
          return {
            email: readText(context.formData, 'email').trim().toLowerCase(),
            password: readText(context.formData, 'password'),
          }
        },
        async verify({ email, password }) {
          let user = email ? await db.findOne(users, { where: { email } }) : null
          let valid = await verifyPassword(password, user?.password_hash ?? (await unknownUserHash))
          return user && valid ? user : null
        },
      })

      let user = await verifyCredentials(passwordProvider, context)
      let returnTo = safeReturnTo(context.formData.get('returnTo'))

      if (user === null) {
        return context.render(
          <LoginPage
            csrfToken={getCsrfToken(context)}
            email={readText(context.formData, 'email')}
            returnTo={returnTo}
            failed
          />,
          { status: 401 },
        )
      }

      signIn(context, user.id)
      return redirect(returnTo ?? routes.account.href(), 303)
    },
  },
})

function readText(formData: FormData, name: string): string {
  let value = formData.get(name)
  return typeof value === 'string' ? value : ''
}
