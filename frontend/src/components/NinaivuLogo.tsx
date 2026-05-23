interface NinaivuLogoProps {
  height?: number
  className?: string
  showText?: boolean
}

export function NinaivuLogo({
  height = 48,
  showText = true,
  className = "",
}: NinaivuLogoProps) {
  const iconSize = height
  const textSize = Math.round(height * 0.48)
  const gap = Math.round(height * 0.25)

  return (
    <div className={`flex items-center ${className}`} style={{ gap }}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        {/* Connection lines */}
        <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <line x1="8"  y1="18" x2="20" y2="24" opacity="0.35" />
          <line x1="8"  y1="24" x2="20" y2="24" opacity="0.50" />
          <line x1="8"  y1="30" x2="20" y2="24" opacity="0.35" />
          <line x1="20" y1="24" x2="28" y2="18" opacity="0.35" />
          <line x1="20" y1="24" x2="28" y2="24" opacity="0.50" />
          <line x1="20" y1="24" x2="28" y2="30" opacity="0.35" />
          <line x1="28" y1="18" x2="40" y2="24" opacity="0.35" />
          <line x1="28" y1="24" x2="40" y2="24" opacity="0.50" />
          <line x1="28" y1="30" x2="40" y2="24" opacity="0.35" />
        </g>
        {/* Nodes */}
        <g fill="currentColor">
          <circle cx="8"  cy="18" r="2.5" opacity="0.8" />
          <circle cx="8"  cy="24" r="2.5" opacity="0.8" />
          <circle cx="8"  cy="30" r="2.5" opacity="0.8" />
          <circle cx="20" cy="24" r="3.2" />
          <circle cx="28" cy="18" r="2.5" opacity="0.8" />
          <circle cx="28" cy="24" r="2.5" opacity="0.8" />
          <circle cx="28" cy="30" r="2.5" opacity="0.8" />
          <circle cx="40" cy="24" r="3.2" />
        </g>
      </svg>

      {showText && (
        <span
          style={{
            fontSize: textSize,
            fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif",
            fontWeight: 700,
            letterSpacing: "-0.01em",
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          ninaivu
        </span>
      )}
    </div>
  )
}
