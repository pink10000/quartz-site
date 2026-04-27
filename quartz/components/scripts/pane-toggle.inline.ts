function togglePane() {
  const isCollapsed = document.body.classList.toggle("left-pane-collapsed")
  localStorage.setItem("left-pane-collapsed", isCollapsed ? "true" : "false")
}

function restoreState() {
  const savedState = localStorage.getItem("left-pane-collapsed")
  const isMobile = window.matchMedia("(max-width: 1199px)").matches
  const isCollapsed = savedState === null ? isMobile : savedState === "true"
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

function handleClickOutside(e: MouseEvent) {
  const isMobile = window.matchMedia("(max-width: 1199px)").matches
  if (!isMobile) return

  const sidebar = document.querySelector(".sidebar.left")
  const paneToggle = document.getElementById("pane-toggle")
  const isCollapsed = document.body.classList.contains("left-pane-collapsed")

  if (!isCollapsed && sidebar && !sidebar.contains(e.target as Node) && paneToggle && !paneToggle.contains(e.target as Node)) {
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

  // Outside click listener
  document.removeEventListener("click", handleClickOutside)
  document.addEventListener("click", handleClickOutside)

  // Restore state on SPA navigation
  restoreState()
})
