import React from 'react';
import { HomeIcon } from './icons/HomeIcon';

const AmplifyAILogo: React.FC = () => (
  <svg width="36" height="36" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="logoGradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#F472B6" /> 
        <stop offset="100%" stopColor="#22D3EE" />
      </linearGradient>
    </defs>
    <path 
      d="M16 4L2 28H7.5L9.625 22.75H22.375L24.5 28H30L16 4ZM11.5 18.25L16 8.5L20.5 18.25H11.5Z" 
      fill="url(#logoGradient)"
    />
     <path
      d="M16 11.5L14 14.5H18L16 11.5Z"
      fill="url(#logoGradient)"
    />
  </svg>
);


export const Header: React.FC = () => {
  const handleHomeClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="bg-slate-900/50 backdrop-blur-lg sticky top-0 z-20 border-b border-slate-100/10">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <button
          onClick={handleHomeClick}
          className="p-2 rounded-full text-slate-400 hover:bg-slate-700/50 hover:text-white transition-colors"
          aria-label="Voltar para o início"
        >
          <HomeIcon />
        </button>
        
        <div className="flex items-center space-x-3 cursor-pointer" onClick={handleHomeClick}>
          <AmplifyAILogo />
          <h1 className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-cyan-400">
            AmplifyAI
          </h1>
        </div>

        {/* Placeholder to keep title centered */}
        <div className="w-10 h-10" />
      </div>
    </header>
  );
};