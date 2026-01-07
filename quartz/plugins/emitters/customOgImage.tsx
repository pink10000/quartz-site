import { SocialImageOptions } from "../../util/og"
import { JSX } from "preact/jsx-runtime"

export const customOgImage: SocialImageOptions["imageStructure"] = ({
  cfg,
  userOpts: _userOpts,
  title,
  description: _description,
  fileData,
}) => {
  const slug = fileData.slug ?? ""
  
  // Extract top-level folder from path (e.g., "notes/graph_theory/topic" -> "graph_theory")
  const segments = slug.split("/").filter(s => s.length > 0)
  const meaningfulSegments = segments.filter(s => s !== "notes" && s !== "index")
  const topLevelFolder = meaningfulSegments.length > 0 ? meaningfulSegments[0] : segments[0] || "notes"
  
  // Format folder name for display (e.g., "graph_theory" -> "Graph Theory")
  const folderTitle = topLevelFolder
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
  
  // Use colors from the Quartz config
  const colors = cfg.theme.colors.lightMode
  const accent = colors.secondary // Pink accent color
  const text = colors.dark // Dark text color
  const bgLight = colors.light // Background color
  
  const iconMap: Record<string, JSX.Element> = {
    default: (
      <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
        <path d="M12 17h.01"/>
      </svg>
    ),
    "computer_security": (
      <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
        <path d="m9 12 2 2 4-4"/>
      </svg>
    ),
    "cryptography": (
      <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7.5" cy="15.5" r="5.5"/>
        <path d="m21 2-9.6 9.6"/>
        <path d="m15.5 7.5 3 3L22 7l-3-3"/>
      </svg>
    ),
    "graph_theory": (
        <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" preserveAspectRatio="xMidYMid meet">
          <path d="M12 4 L19.5 9.5 L16.5 19 L7.5 19 L4.5 9.5 Z"/>
          <path d="M12 4 L16.5 19"/>
          <path d="M12 4 L7.5 19"/>
          <path d="M19.5 9.5 L7.5 19"/>
          <path d="M19.5 9.5 L4.5 9.5"/>
          <path d="M16.5 19 L4.5 9.5"/>
          <circle cx="12" cy="4" r="2.5" fill="#faf8f8"/>
          <circle cx="19.5" cy="9.5" r="2.5" fill="#faf8f8"/>
          <circle cx="16.5" cy="19" r="2.5" fill="#faf8f8"/>
          <circle cx="7.5" cy="19" r="2.5" fill="#faf8f8"/>
          <circle cx="4.5" cy="9.5" r="2.5" fill="#faf8f8"/>
        </svg>
      ),
    "probability": (
      <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect width="12" height="12" x="2" y="10" rx="2" ry="2"/>
        <path d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6"/>
        <path d="M6 18h.01"/>
        <path d="M10 14h.01"/>
        <path d="M15 6h.01"/>
        <path d="M18 9h.01"/>
      </svg>
    ),
    "topology": (
      <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" preserveAspectRatio="xMidYMid meet">
        {/* Large outer set */}
        <ellipse cx="12" cy="12" rx="10" ry="8" />
        
        {/* Subset 1 */}
        <ellipse cx="8" cy="12" rx="4" ry="3" />
        
        {/* Subset 2 (overlapping) */}
        <ellipse cx="16" cy="12" rx="4" ry="4" />
        
        {/* Nested subset in Subset 2 */}
        <circle cx="16" cy="12" r="2" />
        
        {/* Small isolated element */}
        <circle cx="12" cy="7" r="0.5" fill="currentColor" />
        <circle cx="9" cy="12" r="0.5" fill="currentColor" />
      </svg>
    ),
    "real_analysis": (
      <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18"/>
        <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
      </svg>
    )
  }

  
  const selectedIcon = iconMap[topLevelFolder] || iconMap["default"]
  
  // Create a slightly darker version of bgLight for gradient
  const bgGradient = colors.lightgray
  
  return (
    <div style={{ display: "flex", height: "100%", width: "100%", alignItems: "center", justifyContent: "center", flexDirection: "column", backgroundColor: bgLight, backgroundImage: `linear-gradient(to bottom, ${bgLight}, ${bgGradient})`, fontFamily: "serif", padding: "60px" }}>
      <div style={{ display: "flex", flexDirection: "row", width: "100%", height: "100%", backgroundColor: "rgba(255, 255, 255, 0.5)", border: "1px solid rgba(0, 0, 0, 0.1)", borderRadius: "12px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)", overflow: "hidden" }}>
        <div style={{ display: "flex", width: "35%", height: "100%", padding: "60px", backgroundColor: "rgba(0,0,0,0.03)", borderRight: "1px solid rgba(0, 0, 0, 0.1)", justifyContent: "center", alignItems: "center", color: accent }}>
          <div style={{ display: "flex", width: "240px", height: "240px" }}>
            {selectedIcon}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", width: "65%", padding: "50px", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ display: "flex", width: "12px", height: "12px", borderRadius: "50%", backgroundColor: accent }}></div>
            <div style={{ display: "flex", fontSize: "24px", color: text, opacity: 0.5 }}>{folderTitle}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start" }}>
            <div style={{ display: "flex", fontSize: "72px", color: text, margin: 0, lineHeight: 1.1, fontWeight: 700, letterSpacing: "-1px", fontFamily: "sans-serif" }}>
              {title}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-end", borderTop: "1px solid rgba(0, 0, 0, 0.1)", paddingTop: "20px" }}>
            <div style={{ display: "flex", fontSize: "20px", color: text, opacity: 0.6 }}>kytrinh.me</div>
          </div>
        </div>
      </div>
    </div>
  )
}
