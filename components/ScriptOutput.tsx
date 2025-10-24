import React, { useState } from 'react';
import { CopyIcon } from './icons/CopyIcon';

interface ScriptOutputProps {
  data: {
    title: string;
    script: string;
  };
}

export const ScriptOutput: React.FC<ScriptOutputProps> = ({ data }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(data.script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl shadow-black/20 border border-slate-100/10 animate-fade-in">
      <h2 className="text-2xl font-bold mb-6 text-yellow-300 text-center">Seu roteiro de vídeo está pronto!</h2>
      
      <div className="mb-6">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">TEMA DO ROTEIRO</h3>
        <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-700/50">
          <p className="text-slate-200">{data.title}</p>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">ROTEIRO GERADO</h3>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full text-slate-300 bg-slate-700/50 hover:bg-slate-700 hover:text-white transition-all duration-200"
            aria-label="Copiar roteiro"
          >
            <CopyIcon />
            <span>{copied ? 'Copiado!' : 'Copiar Roteiro'}</span>
          </button>
        </div>
        <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-700/50 max-h-96 overflow-y-auto custom-scrollbar">
          <p className="text-slate-200 whitespace-pre-wrap">{data.script}</p>
        </div>
      </div>
    </div>
  );
};