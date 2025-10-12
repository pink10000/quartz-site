// @ts-ignore
import clipboardScript from "./scripts/clipboard.inline"
import clipboardStyle from "./styles/clipboard.scss"
// @ts-ignore
import tikzScript from "./scripts/tikz.inline"
import tikzStyle from "./styles/tikz.scss"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const Body: QuartzComponent = ({ children }: QuartzComponentProps) => {
  return <div id="quartz-body">{children}</div>
}

Body.afterDOMLoaded = clipboardScript + "\n" + tikzScript
Body.css = clipboardStyle + "\n" + tikzStyle

export default (() => Body) satisfies QuartzComponentConstructor
