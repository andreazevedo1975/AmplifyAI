import React, { useState, useEffect } from 'react';
import { CopyIcon } from './icons/CopyIcon';

export const TestModeFooter: React.FC = () => {
    const [testUrl, setTestUrl] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setTestUrl(window.location.href);
    }, []);

    const handleCopy = () => {
        if (!testUrl) return;
        navigator.clipboard.writeText(testUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <footer className="fixed bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-lg border-t border-slate-700/50 p-3 z-30">
            <div className="container mx-auto flex flex-col sm:flex-row items-center justify-center text-center gap-2 sm:gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-cyan-300">URL para Teste:</span>
                    <a 
                        href={testUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-sm text-slate-300 hover:text-white transition-colors truncate max-w-[200px] sm:max-w-xs md:max-w-md"
                        title={testUrl}
                    >
                        {testUrl}
                    </a>
                </div>
                <button 
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full text-slate-300 bg-slate-700/50 hover:bg-slate-700 hover:text-white transition-all duration-200"
                >
                    <CopyIcon />
                    {copied ? 'Copiado!' : 'Copiar URL'}
                </button>
            </div>
        </footer>
    );
};