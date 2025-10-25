import React from 'react';

export const Spinner: React.FC = () => {
  return (
    <svg 
      className="subtle-spinner h-5 w-5 text-fuchsia-400"
      viewBox="0 0 50 50"
      role="status"
    >
        <title>Carregando...</title>
        <circle 
            className="subtle-spinner-path"
            cx="25" 
            cy="25" 
            r="20" 
            fill="none" 
            strokeWidth="5"
            stroke="currentColor"
        ></circle>
    </svg>
  );
};