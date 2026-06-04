// @ts-expect-error - inline script import handled by Quartz bundler
import tikzScript from "./scripts/tikz.inline.ts"
import tikzStyle from "./styles/tikz.scss"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const Body: QuartzComponent = ({ children }: QuartzComponentProps) => {
  return <div id="quartz-body">{children}</div>
}

Body.afterDOMLoaded = tikzScript
Body.css = tikzStyle

export default (() => Body) satisfies QuartzComponentConstructor
