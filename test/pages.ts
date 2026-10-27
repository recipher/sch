import * as assert from 'remix/assert'

import { routes } from '../app/routes.ts'
import type { createClient } from './client.ts'

type Browser = ReturnType<typeof createClient>

export async function signUp(browser: Browser) {
  await browser.submit(routes.signup.index.href(), routes.signup.action.href(), {
    email: 'pat@example.com',
    password: 'correct horse',
  })
}

// Submits a form and returns the path it redirects to.
export async function submitForRedirect(
  browser: Browser,
  formPath: string,
  action: string,
  fields: Record<string, string>,
) {
  let response = await browser.submit(formPath, action, fields)
  assert.equal(response.status, 303)
  let location = response.headers.get('Location')
  assert.ok(location)
  return location
}

export function lastSegment(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

// The action of the form whose markup contains `text`, such as the remove button beside a location.
export function formActionNear(html: string, text: string): string {
  let form = [...html.matchAll(/<form\b[^>]*action="([^"]*)"[^>]*>([\s\S]*?)<\/form>/g)].find(([, , body]) =>
    body.includes(text),
  )
  assert.ok(form, `Expected a form containing ${text}`)
  return form[1]
}
