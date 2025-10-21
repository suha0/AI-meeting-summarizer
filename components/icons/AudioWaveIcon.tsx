import React from 'react';

export const AudioWaveIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8.25 6.75h8.25a.75.75 0 01.75.75v9a.75.75 0 01-.75.75H8.25a.75.75 0 01-.75-.75v-9a.75.75 0 01.75-.75zM2.25 12h1.5M15 3.75V2.25m0 19.5v-1.5m4.5-12h1.5m-1.5 6h1.5m-19.5-6h1.5m0 6h1.5"
    />
  </svg>
);
