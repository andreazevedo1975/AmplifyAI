
import React, { useState } from 'react';
import type { AudioOutputData } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';
import { ShareIcon } from './icons/ShareIcon';

interface AudioOutputProps {
  data: AudioOutputData;
}

const voiceNameMap: { [key: string]: string } = {
  // Masculino
  'gacrux': 'Gacrux (Masculino, Neutro)',
  'algenib': 'Algenib (Masculino, Agudo)',
  'fenrir': 'Fenrir (Masculino, Grave)',
  'achernar': 'Achernar (Masculino, Profundo)',
  'sadachbia': 'Sadachbia (Masculino, Neutro)',
  'puck': 'Puck (Masculino, Enérgico)',
  'zephyr': 'Zephyr (Masculino, Calmo)',
  // Feminino
  'callirrhoe': 'Callirrhoe (Feminino, Neutro)',
  'charon': 'Charon (Feminino, Grave)',
  'erinome': 'Erinome (Feminino, Enérgico)',
  'kore': 'Kore (Feminino, Calmo)',
  'laomedeia': 'Laomedeia (Feminino, Agudo)',
  'alnilam': 'Alnilam (Feminino, Profundo)',
};


export const AudioOutput: React.FC<AudioOutputProps> = ({ data }) => {
  const [isSharing, setIsSharing] = useState(false);

  const getCleanTextForFilename = () => data.text.substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase();

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);

    const title = `Áudio gerado por IA: ${data.text.substring(0, 50)}...`;
    const textToShare = `Ouça este áudio que criei com AmplifyAI.`;

    try {
      const audioFile = new File([data.blob], `amplifyai-audio-${getCleanTextForFilename()}.wav`, { type: 'audio/wav' });

      if (navigator.canShare && navigator.canShare({ files: [audioFile] })) {
        await navigator.share({
          files: [audioFile],
          title: title,
          text: textToShare,
        });
      } else {
        throw new Error('Web Share API for files not supported.');
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Falha na Web Share API:', err);
        navigator.clipboard.writeText(textToShare);
        alert('Seu navegador não suporta compartilhamento direto de áudio.\n\nUma mensagem sobre o áudio foi copiada para seu clipboard.');
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl shadow-black/20 border border-slate-100/10 animate-fade-in">
      <h2 className="text-2xl font-bold mb-6 text-fuchsia-300 text-center">Seu áudio gerado por IA está pronto!</h2>
      
      <div className="mb-6">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">TEXTO NARRADO</h3>
        <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-700/50">
          <p className="text-slate-200">{data.text}</p>
        </div>
      </div>
      
       <div className="flex justify-center gap-6 mb-6 text-center">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Voz</h3>
          <p className="font-semibold text-slate-200">{voiceNameMap[data.voice] || data.voice}</p>
        </div>
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Emoção</h3>
          <p className="font-semibold text-slate-200">{data.emotion}</p>
        </div>
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estilo</h3>
          <p className="font-semibold text-slate-200">{data.style}</p>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl p-4 shadow-inner mb-6">
        <audio 
          src={data.url} 
          controls 
          className="w-full"
        >
          Seu navegador não suporta o elemento de áudio.
        </audio>
      </div>
      
      <div className="mt-8 pt-6 border-t border-slate-700/50">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href={data.url}
              download={`amplifyai-audio-${getCleanTextForFilename()}.wav`}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-semibold text-white bg-fuchsia-600 hover:bg-fuchsia-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-fuchsia-500 transition-all duration-300 transform hover:scale-[1.02]"
            >
              <DownloadIcon />
              Salvar Áudio (.wav)
            </a>
            <button
              onClick={handleShare}
              disabled={isSharing}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-semibold text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-purple-500 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-wait"
            >
              <ShareIcon />
              {isSharing ? 'Compartilhando...' : 'Compartilhar Áudio'}
            </button>
        </div>
      </div>
    </div>
  );
};
