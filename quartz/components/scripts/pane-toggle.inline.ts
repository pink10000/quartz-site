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

// Immediate restoration to prevent flash
restoreState()

document.addEventListener("nav", () => {
  const paneToggle = document.getElementById("pane-toggle")
  paneToggle?.removeEventListener("click", togglePane)
  paneToggle?.addEventListener("click", togglePane)

  // Restore state on SPA navigation
  restoreState()
})
