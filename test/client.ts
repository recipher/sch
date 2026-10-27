import * as assert from 'remix/assert'

interface Fetcher {
  fetch(request: Request): Promise<Response>
}

const origin = 'http://localhost'

// Acts like one browser: keeps cookies between requests and reads CSRF tokens from forms.
export function createClient(router: Fetcher) {
  let cookies = new Map<string, string>()

  async function send(path: string, init: RequestInit = {}) {
    let headers = new Headers(init.headers)
    if (cookies.size > 0) {
      headers.set('Cookie', [...cookies].map(([name, value]) => `${name}=${value}`).join('; '))
    }

    let response = await router.fetch(new Request(new URL(path, origin), { ...init, headers }))
    for (let header of response.headers.getSetCookie()) {
      let [pair, ...attributes] = header.split(';')
      let name = pair.slice(0, pair.indexOf('='))
      let value = pair.slice(pair.indexOf('=') + 1)
      let expired = value === '' || attributes.some((attribute) => /^\s*max-age=0\s*$/i.test(attribute))
      if (expired) cookies.delete(name)
      else cookies.set(name, value)
    }
    return response
  }

  return {
    cookies,
    get(path: string) {
      return send(path)
    },
    // Loads the page holding the form first and sends its hidden fields (CSRF token included)
    // along with `fields`, as a browser would.
    async submit(formPath: string, action: string, fields: Record<string, string>) {
      let page = await send(formPath)
      let hidden = readHiddenFields(await page.text())
      assert.ok(hidden._csrf, `Expected a CSRF token on ${formPath}`)
      return this.post(action, { ...hidden, ...fields })
    },
    post(path: string, fields: Record<string, string>) {
      let body = new FormData()
      for (let [name, value] of Object.entries(fields)) body.set(name, value)
      return send(path, { method: 'POST', body })
    },
  }
}

function readHiddenFields(html: string): Record<string, string> {
  let fields: Record<string, string> = {}
  for (let [input] of html.matchAll(/<input\b[^>]*type="hidden"[^>]*>/g)) {
    let name = input.match(/\bname="([^"]*)"/)?.[1]
    let value = input.match(/\bvalue="([^"]*)"/)?.[1] ?? ''
    if (name) fields[name] = decodeEntities(value)
  }
  return fields
}

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}
