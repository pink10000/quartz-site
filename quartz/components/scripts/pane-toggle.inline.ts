function togglePane() {
  const isCollapsed = document.body.classList.toggle("left-pane-collapsed")
  localStorage.setItem("left-pane-collapsed", isCollapsed ? "true" : "false")
}

function restoreState() {
  const isCollapsed = localStorage.getItem("left-pane-collapsed") === "true"
  if (isCollapsed) {
    document.body.classList.add("left-pane-collapsed")
  } else {
    document.body.classList.remove("left-pane-collapsed")
  }
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === "[" && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const target = e.target as HTMLElement
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      return
    }
    togglePane()
  }
}

// Immediate restoration to prevent flash
restoreState()

document.addEventListener("nav", () => {
  const paneToggle = document.getElementById("pane-toggle")
  paneToggle?.removeEventListener("click", togglePane)
  paneToggle?.addEventListener("click", togglePane)

  // Hotkey listener
  document.removeEventListener("keydown", handleKeyDown)
  document.addEventListener("keydown", handleKeyDown)

  // Restore state on SPA navigation
  restoreState()
})
