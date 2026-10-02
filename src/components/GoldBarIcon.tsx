interface GoldBarIconProps {
  className?: string;
}

/**
 * Simple Gold Bullion / Bar Silhouette
 * Minimal, flat 2D geometric ingot shape.
 */
export function GoldBarIcon({ className = "w-4 h-4" }: GoldBarIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Top facet */}
      <path
        d="M6 7.5C6.3 6.6 7 6 7.9 6H16.1C17 6 17.7 6.6 18 7.5L20 12H4L6 7.5Z"
        fill="currentColor"
        fillOpacity="0.82"
      />
      {/* Front facet */}
      <path
        d="M4 12H20L18.4 16.8C18.1 17.5 17.4 18 16.6 18H7.4C6.6 18 5.9 17.5 5.6 16.8L4 12Z"
        fill="currentColor"
      />
    </svg>
  );
}
