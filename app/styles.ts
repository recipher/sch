import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/postcss'
import postcss from 'postcss'

const entry = fileURLToPath(new URL('./styles/app.css', import.meta.url))
const isProduction = process.env.NODE_ENV === 'production'

// One processor for the app's lifetime, so Tailwind can reuse its cache between builds.
const processor = postcss([tailwindcss({ optimize: isProduction })])

async function build(): Promise<string> {
  let result = await processor.process(await readFile(entry, 'utf8'), { from: entry })
  return result.css
}

// Production compiles once at startup and serves a content-hashed URL that browsers can cache
// forever. Elsewhere the stylesheet is rebuilt per request so new classes show up immediately.
const productionCss = isProduction ? await build() : null

export const stylesheet = {
  href: productionCss
    ? `/styles.css?v=${createHash('sha256').update(productionCss).digest('hex').slice(0, 12)}`
    : '/styles.css',
  cacheControl: productionCss ? 'public, max-age=31536000, immutable' : 'no-cache',
  async css() {
    return productionCss ?? build()
  },
}
