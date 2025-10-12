document.addEventListener("nav", () => {
  const tikzFigures = document.querySelectorAll("figure.tikz")
  
  for (const figure of tikzFigures) {
    const button = figure.querySelector("button.source-code-button") as HTMLButtonElement
    if (!button) continue
    
    // Extract source code from the annotation element
    const annotation = figure.querySelector(".tikz-mathml annotation") as HTMLElement
    if (!annotation) continue
    
    const sourceCode = JSON.parse(annotation.textContent || '""')
    const sourceIcon = button.querySelector(".source-icon") as SVGElement
    const checkIcon = button.querySelector(".check-icon") as SVGElement
    
    function onClick() {
      navigator.clipboard.writeText(sourceCode).then(
        () => {
          button.blur()
          sourceIcon.style.display = "none"
          checkIcon.style.display = "inline"
          setTimeout(() => {
            sourceIcon.style.display = "inline"
            checkIcon.style.display = "none"
          }, 2000)
        },
        (error) => console.error(error),
      )
    }
    
    button.addEventListener("click", onClick)
    window.addCleanup(() => button.removeEventListener("click", onClick))
  }
})

