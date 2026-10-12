import React from 'react';

interface GoldAppIconProps {
  size?: number;
  className?: string;
  /** Kept for call-site compatibility; the mark is always flat and never glows. */
  hasGlow?: boolean;
}

/** A flat gold G monogram for the app's dashboard and sign-in chrome. */
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
