// Elements in the sidebar that should participate in the staggered animation
const STAGGER_SELECTOR =
  "li, h2, h3, .graph, .search, .darkmode, .toc-header, .backlinks-header, .explorer-header"

/**
 * Assigns CSS variables to sidebar items to enable staggered animations.
 * We assign two indices:
 * 1. --stagger-index: 0 at the top, used for Top-to-Bottom expansion.
 * 2. --stagger-index-rev: 0 at the bottom, used for Bottom-to-Top collapse.
 */
function assignStaggerIndices() {
  const sidebars = document.querySelectorAll(".sidebar")
  sidebars.forEach((sidebar) => {
    const el = sidebar as HTMLElement
    const allItems = Array.from(el.querySelectorAll(STAGGER_SELECTOR))
    // Only index items that aren't hidden inside a collapsed folder
    const visibleItems = allItems.filter(
      (item) => !item.closest(".folder-outer:not(.open)"),
    ) as HTMLElement[]

    const total = visibleItems.length
    el.style.setProperty("--stagger-total", total.toString())
    visibleItems.forEach((item, index) => {
      // index: 0 at top, total-1 at bottom (Expansion: Top-to-Bottom)
      item.style.setProperty("--stagger-index", index.toString())
      // index-rev: 0 at bottom, total-1 at top (Collapse: Bottom-to-Top)
      item.style.setProperty("--stagger-index-rev", (total - 1 - index).toString())
    })
  })
}

function togglePane() {
  // Always recalculate indices before animating to catch layout changes
  assignStaggerIndices()
  // Ensure CSS variables are applied by the browser before the class change triggers transitions
  requestAnimationFrame(() => {
    const isCollapsed = document.body.classList.toggle("left-pane-collapsed")
    localStorage.setItem("left-pane-collapsed", isCollapsed ? "true" : "false")
  })
}

function restoreState() {
  const savedState = localStorage.getItem("left-pane-collapsed")
  const isMobile = window.matchMedia("(max-width: 1199px)").matches
  const isCollapsed = savedState === null ? isMobile : savedState === "true"
  document.body.classList.toggle("left-pane-collapsed", isCollapsed)
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === "[" && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const target = e.target as HTMLElement
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
      return
    }
    togglePane()
  }
}

function handleClickOutside(e: MouseEvent) {
  if (!window.matchMedia("(max-width: 1199px)").matches) return

  const sidebar = document.querySelector(".sidebar.left")
  const paneToggle = document.getElementById("pane-toggle")
  const isCollapsed = document.body.classList.contains("left-pane-collapsed")

  if (
    !isCollapsed &&
    sidebar &&
    !sidebar.contains(e.target as Node) &&
    paneToggle &&
    !paneToggle.contains(e.target as Node)
  ) {
    togglePane()
  }
}

// Immediate restoration to prevent flash
restoreState()

// Observe sidebars for changes (like Explorer tree loading) to keep indices up to date
const observer = new MutationObserver(assignStaggerIndices)

document.addEventListener("nav", () => {
  const paneToggle = document.getElementById("pane-toggle")
  paneToggle?.removeEventListener("click", togglePane)
  paneToggle?.addEventListener("click", togglePane)

  document.removeEventListener("keydown", handleKeyDown)
  document.addEventListener("keydown", handleKeyDown)

  document.removeEventListener("click", handleClickOutside)
  document.addEventListener("click", handleClickOutside)

  restoreState()
  assignStaggerIndices()

  // Monitor sidebars for dynamic content updates
  observer.disconnect()
  document
    .querySelectorAll(".sidebar")
    .forEach((s) => observer.observe(s, { childList: true, subtree: true }))
})

// Update indices when folders are toggled manually in the Explorer
document.addEventListener("click", (e) => {
  const target = e.target as HTMLElement
  if (target.closest(".folder-icon") || target.closest(".folder-button")) {
    setTimeout(assignStaggerIndices, 10)
  }
})
