import React from 'react';
import { DownloadIcon } from './icons/DownloadIcon';

interface VideoOutputProps {
  data: {
    url: string;
    theme: string;
  };
}

export const VideoOutput: React.FC<VideoOutputProps> = ({ data }) => {

  const getCleanThemeForFilename = () => data.theme.substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase();

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
        <a
          href={data.url}
          download={`amplifyai-video-${getCleanThemeForFilename()}.mp4`}
          className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-semibold text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-500 transition-all duration-300 transform hover:scale-[1.02]"
        >
          <DownloadIcon />
          Salvar Vídeo (.mp4)
        </a>
      </div>
    </div>
  );
};