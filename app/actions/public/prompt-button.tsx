import { clientEntry, on, type Handle } from 'remix/component'

const FADE_MS = 180
const HOLD_MS = 1200

type CopyState = 'idle' | 'copied' | 'failed' | 'resetting'

interface PromptButtonProps {
  text: string
}

// This component hydrates independently; the rest of the page stays static HTML.
export const PromptButton = clientEntry(
  import.meta.url,
  function PromptButton(handle: Handle<PromptButtonProps>) {
    let state: CopyState = 'idle'
    // The last outcome, so the label fading out during 'resetting' matches what happened.
    let copyFailed = false

    return () => {
      let promptLabel = `\u201C${handle.props.text}\u201D`
      let label =
        state === 'idle' ? promptLabel : copyFailed ? 'Copy failed' : 'Copied to clipboard'
      let active = state !== 'idle'

      return (
        <button
          type="button"
          class={`${buttonClass} ${active ? 'bg-surface-4 text-brand' : 'bg-transparent'}`}
          mix={[
            on('click', async (_event, signal) => {
              try {
                await navigator.clipboard.writeText(handle.props.text)
                if (signal.aborted) return
              } catch {
                copyFailed = true
                state = 'failed'
                await handle.update()
                await wait(HOLD_MS)
                if (signal.aborted) return
                state = 'resetting'
                await handle.update()
                await wait(FADE_MS)
                if (signal.aborted) return
                state = 'idle'
                handle.update()
                return
              }

              copyFailed = false
              state = 'copied'
              await handle.update()
              await wait(HOLD_MS)
              if (signal.aborted) return

              state = 'resetting'
              await handle.update()
              await wait(FADE_MS)
              if (signal.aborted) return

              state = 'idle'
              await handle.update()
            }),
          ]}
        >
          <span
            aria-hidden="true"
            class="flex w-6 flex-none items-center justify-center [&_svg]:block [&_svg]:size-5 [&_svg]:rotate-180"
          >
            <CopyIcon />
          </span>
          <span
            class={`relative flex min-w-0 flex-1 items-center text-sm/normal transition-opacity duration-180 ${state === 'resetting' ? 'opacity-0' : 'opacity-100'}`}
          >
            <span
              aria-hidden={state === 'idle' ? true : undefined}
              class={`absolute inset-0 flex items-center ${state === 'idle' ? 'invisible' : 'visible'}`}
            >
              {label}
            </span>
            <span
              aria-hidden={state === 'idle' ? undefined : true}
              class={state === 'idle' ? 'visible' : 'invisible'}
            >
              {promptLabel}
            </span>
          </span>
        </button>
      )
    }
  },
)

export function CopyIcon() {
  return () => (
    <svg viewBox="0 0 14 16.5" fill="none">
      <path
        d="M0.75 9.188L0.75 4.083C0.75 2.242 2.242 0.75 4.083 0.75L9.188 0.75M5.75 15.75L11.375 15.75C12.41 15.75 13.25 14.91 13.25 13.875L13.25 5.75C13.25 4.714 12.41 3.875 11.375 3.875L5.75 3.875C4.714 3.875 3.875 4.714 3.875 5.75L3.875 13.875C3.875 14.91 4.714 15.75 5.75 15.75Z"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      />
    </svg>
  )
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

const buttonClass =
  'flex w-full cursor-pointer appearance-none items-center gap-4 rounded-xl border-0 p-4 text-left transition-colors duration-150 hover:bg-surface-4 hover:text-brand focus-visible:bg-surface-4 focus-visible:text-brand focus-visible:outline-none'
