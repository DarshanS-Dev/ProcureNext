/**
 * The ProcureNext wordmark: "Procure" in ink, "Next" reversed out of a pill.
 *
 * Inline SVG (not an <img>) so it renders instantly and never 404s. The
 * viewBox is cropped to the artwork, so `className` height alone sizes it.
 */

import React from 'react';

export const Logo: React.FC<{ className?: string; title?: string }> = ({
  className = 'h-8 w-auto',
  title = 'ProcureNext',
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="88 34 612 128"
    className={className}
    role="img"
    aria-label={title}
  >
    <g
      transform="translate(100, 50)"
      fontFamily='-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      fontWeight={900}
      fontSize={82}
      letterSpacing={-2}
    >
      <text x="0" y="80" fill="#000000">
        Procure
      </text>
      <rect x="316" y="2" width="272" height="100" rx="50" fill="#000000" />
      <text x="348" y="80" fill="#FFFFFF">
        Next
      </text>
    </g>
  </svg>
);
