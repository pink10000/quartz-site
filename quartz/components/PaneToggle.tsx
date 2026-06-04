import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-expect-error - inline script import handled by Quartz bundler
import script from "./scripts/pane-toggle.inline.ts"

const PaneToggle: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <button type="button" id="pane-toggle" class={displayClass} aria-label="Toggle left pane">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="lucide lucide-panel-left"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M9 3v18" />
      </svg>
    </button>
  )
}

PaneToggle.afterDOMLoaded = script

export default (() => PaneToggle) satisfies QuartzComponentConstructor
