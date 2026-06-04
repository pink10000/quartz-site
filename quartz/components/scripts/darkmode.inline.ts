const userPref = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
const currentTheme = localStorage.getItem("theme") ?? userPref
document.documentElement.setAttribute("saved-theme", currentTheme)

const syncBodyThemeClass = (theme: "light" | "dark") => {
  document.body?.classList.remove("theme-dark", "theme-light")
  document.body?.classList.add(`theme-${theme}`)
}

const emitThemeChangeEvent = (theme: "light" | "dark") => {
  const event: CustomEventMap["themechange"] = new CustomEvent("themechange", {
    detail: { theme },
  })
  document.dispatchEvent(event)
}

const switchTheme = () => {
  const newTheme = document.documentElement.getAttribute("saved-theme") === "dark" ? "light" : "dark"
  document.documentElement.setAttribute("saved-theme", newTheme)
  localStorage.setItem("theme", newTheme)
  syncBodyThemeClass(newTheme)
  emitThemeChangeEvent(newTheme)
}

const themeChange = (e: MediaQueryListEvent) => {
  const newTheme = e.matches ? "dark" : "light"
  document.documentElement.setAttribute("saved-theme", newTheme)
  localStorage.setItem("theme", newTheme)
  syncBodyThemeClass(newTheme)
  emitThemeChangeEvent(newTheme)
}

// Global hotkey
const hotkeyHandler = (e: KeyboardEvent) => {
  if (e.key === "]" && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName ?? "")) {
    switchTheme()
  }
}

// Ensure we only add the global listener once
if (!(window as any).darkmodeHotkeyRegistered) {
  document.addEventListener("keydown", hotkeyHandler)
  ;(window as any).darkmodeHotkeyRegistered = true
}

const setupDarkmode = () => {
  // Sync body class with current theme on setup (runs after DOM is ready)
  const currentSavedTheme =
    (document.documentElement.getAttribute("saved-theme") as "light" | "dark") ?? "light"
  syncBodyThemeClass(currentSavedTheme)

  for (const darkmodeButton of document.getElementsByClassName("darkmode")) {
    darkmodeButton.addEventListener("click", switchTheme)
    window.addCleanup(() => darkmodeButton.removeEventListener("click", switchTheme))
  }

  // Listen for changes in prefers-color-scheme
  const colorSchemeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
  colorSchemeMediaQuery.addEventListener("change", themeChange)
  window.addCleanup(() => colorSchemeMediaQuery.removeEventListener("change", themeChange))
}

document.addEventListener("nav", setupDarkmode)
document.addEventListener("render", setupDarkmode)
