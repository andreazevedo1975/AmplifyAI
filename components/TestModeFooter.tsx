import React, { useState, useEffect } from 'react';
import { CopyIcon } from './icons/CopyIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { WarningIcon } from './icons/WarningIcon';
import { InfoIcon } from './icons/InfoIcon';

export const TestModeFooter: React.FC = () => {
    const [testUrl, setTestUrl] = useState('');
    const [isFullyShareable, setIsFullyShareable] = useState(false);
    const [isLocal, setIsLocal] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchShareableUrl = async () => {
            let currentUrl = '';
            try {
                // @ts-ignore - Check for AI Studio specific function to get a clean shareable URL
                if (window.aistudio && typeof window.aistudio.getShareableUrl === 'function') {
                    // @ts-ignore
                    currentUrl = await window.aistudio.getShareableUrl();
                } else {
                    currentUrl = window.location.href;
                }
            } catch (error) {
                console.error("Could not get shareable URL, falling back to window.location.href", error);
                currentUrl = window.location.href;
            }
            
            setTestUrl(currentUrl);

            const isHttp = currentUrl && currentUrl.startsWith('http');
            const isLocalhost = currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1');

            if (isHttp) {
                if (isLocalhost) {
                    setIsLocal(true);
                    setIsFullyShareable(false);
                } else {
                    setIsLocal(false);
                    setIsFullyShareable(true);
                }
            } else {
                setIsLocal(false);
                setIsFullyShareable(false);
            }
        };

        fetchShareableUrl();
    }, []);

    const handleCopy = () => {
        if (!testUrl || (!isFullyShareable && !isLocal)) return;
        navigator.clipboard.writeText(testUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const renderUrlStatus = () => {
        if (isFullyShareable) {
            return (
                <div className="flex items-center gap-2" title="Esta URL é pública e pode ser compartilhada com terceiros.">
                    <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0" />
                    <a 
                        href={testUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-sm text-slate-300 hover:text-white transition-colors truncate max-w-[160px] sm:max-w-xs md:max-w-md"
                    >
                        {testUrl}
                    </a>
                </div>
            );
        }
        if (isLocal) {
            return (
                <div 
                    className="flex items-center gap-2 text-sm text-yellow-400"
                    title="Esta é uma URL de desenvolvimento. Funciona apenas no seu computador. Para compartilhar com outras pessoas, você precisa hospedar (fazer deploy) o aplicativo."
                >
                    <InfoIcon className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                    <a
                        href={testUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate max-w-[160px] sm:max-w-xs md:max-w-md hover:text-yellow-300 transition-colors"
                    >
                        {testUrl} <span className="text-xs">(Apenas local)</span>
                    </a>
                </div>
            );
        }
        return (
             <div 
                className="flex items-center gap-2 text-sm text-red-400"
                title="A URL atual não é compartilhável (pode ser um arquivo local ou de ambiente restrito)."
             >
                <WarningIcon className="h-5 w-5 text-red-400 flex-shrink-0" />
                <span>URL não compartilhável</span>
             </div>
        );
    };

    return (
        <footer className="fixed bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-lg border-t border-slate-700/50 p-3 z-30">
            <div className="container mx-auto flex flex-col sm:flex-row items-center justify-center text-center gap-2 sm:gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-cyan-300 flex-shrink-0">URL de Demonstração:</span>
                    {renderUrlStatus()}
                </div>
                <button 
                    onClick={handleCopy}
                    disabled={!isFullyShareable && !isLocal}
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                        copied 
                        ? 'bg-green-500/20 text-green-300' 
                        : 'text-slate-300 bg-slate-700/50 hover:bg-slate-700 hover:text-white'
                    }`}
                >
                    {copied ? <CheckCircleIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
                    <span className="pr-1">{copied ? 'Copiado!' : 'Copiar URL'}</span>
                </button>
            </div>
        </footer>
    );
};