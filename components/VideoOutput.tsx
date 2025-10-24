import React, { useState } from 'react';
import type { VideoOutputData } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';
import { ShareIcon } from './icons/ShareIcon';


interface VideoOutputProps {
  data: VideoOutputData;
}

export const VideoOutput: React.FC<VideoOutputProps> = ({ data }) => {
  const [isPublishing, setIsPublishing] = useState(false);

  const getCleanThemeForFilename = () => data.theme.substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase();

  const handlePublish = async () => {
    if (isPublishing) return;
    setIsPublishing(true);

    const title = data.theme;
    const textToShare = `Confira este vídeo que criei com IA sobre: ${title}`;

    const attemptShare = async (): Promise<'SHARED' | 'CANCELLED' | 'FALLBACK'> => {
      try {
        const response = await fetch(data.url);
        if (!response.ok) throw new Error('Falha ao buscar o vídeo');
        const blob = await response.blob();
        const file = new File([blob], `amplifyai-video-${getCleanThemeForFilename()}.mp4`, { type: 'video/mp4' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: title,
            text: textToShare,
          });
          return 'SHARED';
        }
        return 'FALLBACK';
      } catch (err) {
        if (err.name === 'AbortError') {
          console.log('Compartilhamento cancelado pelo usuário.');
          return 'CANCELLED';
        }
        console.error('Falha na Web Share API:', err);
        return 'FALLBACK';
      }
    };
    
    attemptShare().then(status => {
      if (status === 'FALLBACK') {
        navigator.clipboard.writeText(textToShare);
        alert(`Seu navegador não suporta compartilhamento direto de vídeo.\n\nUma mensagem sobre o vídeo foi copiada para facilitar. Redirecionando para ${data.platform}...`);
        
        const platformUrls: { [key: string]: string } = {
          'Instagram': 'https://www.instagram.com/',
          'Facebook': 'https://www.facebook.com/',
          'LinkedIn': 'https://www.linkedin.com/feed/',
          'Twitter (X)': 'https://twitter.com/intent/tweet',
          'TikTok': 'https://www.tiktok.com/',
          'Pinterest': 'https://www.pinterest.com/',
          'YouTube': 'https://studio.youtube.com/',
          'Reddit': 'https://www.reddit.com/submit',
          'Tumblr': 'https://www.tumblr.com/new/text',
          'Quora': 'https://www.quora.com/',
          'WhatsApp': 'https://web.whatsapp.com/',
          'Telegram': 'https://t.me/',
        };
        const url = platformUrls[data.platform] || '#';
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      setIsPublishing(false);
    });
  };

  return (
    <div className="bg-slate-800/60 p-6 rounded-lg shadow-lg border border-slate-700 animate-fade-in">
      <h2 className="text-xl font-bold mb-6 text-cyan-300 text-center">Seu vídeo gerado por IA está pronto!</h2>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-300 mb-2">PROMPT UTILIZADO</h3>
        <div className="bg-slate-900/50 p-4 rounded-md border border-slate-700/50">
          <p className="text-slate-200">{data.theme}</p>
        </div>
      </div>

      <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-inner mb-6">
        <video 
          src={data.url} 
          controls 
          className="w-full h-full object-contain"
        >
          Seu navegador não suporta a tag de vídeo.
        </video>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-700">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href={data.url}
              download={`amplifyai-video-${getCleanThemeForFilename()}.mp4`}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-semibold text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-500 transition-all duration-300 transform hover:scale-[1.02]"
            >
              <DownloadIcon />
              Salvar Vídeo (.mp4)
            </a>
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-semibold text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-500 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-wait"
            >
              <ShareIcon />
              {isPublishing ? 'Publicando...' : 'Publicar Vídeo'}
            </button>
        </div>
      </div>
    </div>
  );
};
