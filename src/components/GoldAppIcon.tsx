import React from 'react';

interface GoldAppIconProps {
  size?: number;
  className?: string;
  /** Kept for call-site compatibility; the shared icon artwork carries its own restrained highlight. */
  hasGlow?: boolean;
}

/** Shared glass-gold G mark for the app's dashboard, sign-in chrome, and favicon. */
export const GoldAppIcon: React.FC<GoldAppIconProps> = ({
  size = 40,
  className = '',
}) => (
  <span
    aria-hidden="true"
    className={`relative inline-flex items-center justify-center flex-shrink-0 select-none ${className}`}
    style={{ width: size, height: size }}
  >
    <img
      src="/favicon.svg"
      alt=""
      className="w-full h-full"
      draggable={false}
    />
  </span>
);
