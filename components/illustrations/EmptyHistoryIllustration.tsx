import React from 'react';

export const EmptyHistoryIllustration: React.FC = () => (
  <svg
    width="160"
    height="140"
    viewBox="0 0 160 140"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      <linearGradient
        id="empty-history-gradient"
        x1="0"
        y1="0"
        x2="1"
        y2="1"
      >
        <stop offset="0%" stopColor="#D946EF" />
        <stop offset="100%" stopColor="#22D3EE" />
      </linearGradient>
    </defs>

    {/* Main Card */}
    <g transform="rotate(-8 80 70)">
      <rect
        x="25"
        y="20"
        width="110"
        height="100"
        rx="12"
        fill="#1e293b"
        stroke="#334155"
        strokeWidth="2"
      />
      <path
        d="M70 70 H90 M80 60 V80"
        stroke="url(#empty-history-gradient)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />
      <circle cx="80" cy="45" r="8" fill="#334155" />
    </g>
    
    {/* Sparkles */}
    <path
      d="M20 30 L25 35 L20 40 L15 35 Z"
      fill="url(#empty-history-gradient)"
      opacity="0.8"
    >
      <animate
        attributeName="opacity"
        values="0.2;1;0.2"
        dur="2s"
        repeatCount="indefinite"
      />
    </path>
    <path
      d="M140 90 L144 94 L140 98 L136 94 Z"
      fill="url(#empty-history-gradient)"
      opacity="0.6"
    >
        <animate
        attributeName="opacity"
        values="0.6;0.1;0.6"
        dur="2.5s"
        repeatCount="indefinite"
        begin="0.5s"
      />
    </path>
    <path
      d="M135 25 L138 28 L135 31 L132 28 Z"
      fill="url(#empty-history-gradient)"
      opacity="0.9"
    >
        <animate
        attributeName="opacity"
        values="0.9;0.3;0.9"
        dur="1.8s"
        repeatCount="indefinite"
        begin="1s"
      />
    </path>
  </svg>
);
