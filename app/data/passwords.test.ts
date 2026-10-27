import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import { hashPassword, verifyPassword } from './passwords.ts'

describe('passwords', () => {
  it('verifies the password a hash was made from, and nothing else', async () => {
    let stored = await hashPassword('correct horse')

    assert.match(stored, /^scrypt\$[\w-]+\$[\w-]+$/)
    assert.equal(await verifyPassword('correct horse', stored), true)
    assert.equal(await verifyPassword('correct horse ', stored), false)
    assert.equal(await verifyPassword('', stored), false)
  })

  it('salts each hash', async () => {
    assert.notEqual(await hashPassword('correct horse'), await hashPassword('correct horse'))
  })

  it('rejects malformed stored hashes instead of throwing or matching', async () => {
    let valid = await hashPassword('correct horse')
    let [, salt, hash] = valid.split('$')

    let malformed = {
      empty: '',
      plaintext: 'correct horse',
      'other scheme': `bcrypt$${salt}$${hash}`,
      'missing hash': `scrypt$${salt}`,
      'empty parts': 'scrypt$$',
      'empty salt': `scrypt$$${hash}`,
      'extra part': `${valid}$extra`,
      // Invalid base64 decodes to zero bytes; an empty derived key would compare equal.
      'undecodable hash': `scrypt$${salt}$!!!`,
      // A truncated hash would let random passwords match far too often.
      'truncated hash': `scrypt$${salt}$${hash.slice(0, 2)}`,
    }

    for (let [name, stored] of Object.entries(malformed)) {
      for (let password of ['correct horse', 'anything at all']) {
        assert.equal(await verifyPassword(password, stored), false, `${name} accepted "${password}"`)
      }
    }
  })
})
