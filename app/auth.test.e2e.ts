import * as assert from 'remix/assert'
import { createTestServer } from 'remix/node-fetch-server/test'
import { describe, it } from 'remix/test'

import { createTestRouter } from '../test/router.ts'
import { routes } from './routes.ts'

describe('account flow', () => {
  it('signs up, logs out and logs back in from the home page', async (t) => {
    let { router, close } = await createTestRouter()
    t.after(close)
    let page = await t.serve(await createTestServer(router.fetch))

    await page.goto(routes.home.href())
    await page.getByRole('link', { name: 'Sign up' }).click()
    await page.getByLabel('Email').fill('pat@example.com')
    await page.getByLabel('Password').fill('correct horse')
    await page.getByRole('button', { name: 'Create account' }).click()

    await page.getByRole('heading', { name: 'Your account' }).waitFor()
    assert.equal(new URL(page.url()).pathname, routes.account.href())
    await page.getByText('pat@example.com').waitFor()

    await page.getByRole('button', { name: 'Log out' }).click()
    await page.getByRole('heading', { name: 'Log in' }).waitFor()
    assert.equal(new URL(page.url()).pathname, routes.login.index.href())

    await page.getByLabel('Email').fill('pat@example.com')
    await page.getByLabel('Password').fill('wrong password')
    await page.getByRole('button', { name: 'Log in' }).click()
    await page.getByRole('alert').getByText('Incorrect email or password.').waitFor()

    await page.getByLabel('Password').fill('correct horse')
    await page.getByRole('button', { name: 'Log in' }).click()
    await page.getByRole('heading', { name: 'Your account' }).waitFor()

    await page.goto(routes.home.href())
    await page.getByRole('link', { name: 'Your account' }).waitFor()
    assert.equal(await page.getByRole('link', { name: 'Log in' }).count(), 0)
  })
})
