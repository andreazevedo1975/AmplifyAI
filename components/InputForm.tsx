import React, { useState } from 'react';
import { InstagramIcon, FacebookIcon, LinkedInIcon, TwitterXIcon, TikTokIcon, PinterestIcon } from './icons/PlatformIcons';

interface InputFormProps {
  onGenerate: (theme: string, imageInput: string, platform: string, profileUrl: string, thinkingMode: boolean) => void;
  isLoading: boolean;
}

const platformDetails = [
  { name: 'Instagram', icon: <InstagramIcon /> },
  { name: 'Facebook', icon: <FacebookIcon /> },
  { name: 'LinkedIn', icon: <LinkedInIcon /> },
  { name: 'Twitter (X)', icon: <TwitterXIcon /> },
  { name: 'TikTok', icon: <TikTokIcon /> },
  { name: 'Pinterest', icon: <PinterestIcon /> },
];

export const InputForm: React.FC<InputFormProps> = ({ onGenerate, isLoading }) => {
  const [theme, setTheme] = useState('');
  const [imageInput, setImageInput] = useState('');
  const [platform, setPlatform] = useState('Instagram');
  const [profileUrl, setProfileUrl] = useState('');
  const [thinkingMode, setThinkingMode] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (theme.trim()) {
      onGenerate(theme, imageInput, platform, profileUrl, thinkingMode);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800/60 p-6 rounded-lg shadow-lg space-y-6 border border-slate-700">
      <div>
        <label htmlFor="theme" className="block text-sm font-semibold text-slate-300 mb-2">
          1. Descreva a ideia para a IA
        </label>
        <textarea
          id="theme"
          rows={3}
          className="w-full bg-slate-900/50 border border-slate-600 rounded-md shadow-sm focus:ring-fuchsia-500 focus:border-fuchsia-500 text-slate-200 placeholder-slate-500 p-3 transition"
          placeholder="Ex: Os benefícios da inteligência artificial para pequenas empresas"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="image-input" className="block text-sm font-semibold text-slate-300 mb-2">
          2. Imagem (Opcional)
        </label>
        <input
          type="text"
          id="image-input"
          className="w-full bg-slate-900/50 border border-slate-600 rounded-md shadow-sm focus:ring-fuchsia-500 focus:border-fuchsia-500 text-slate-200 placeholder-slate-500 p-3 transition"
          placeholder="Deixe em branco para a IA criar, ou insira um prompt/URL"
          value={imageInput}
          onChange={(e) => setImageInput(e.target.value)}
        />
        <p className="text-xs text-slate-500 mt-1">
          Forneça um prompt para a IA ou o URL de uma imagem existente.
        </p>
      </div>

      <div>
        <label htmlFor="profile-url" className="block text-sm font-semibold text-slate-300 mb-2">
          3. URL do Perfil (Opcional)
        </label>
        <input
          type="url"
          id="profile-url"
          className="w-full bg-slate-900/50 border border-slate-600 rounded-md shadow-sm focus:ring-fuchsia-500 focus:border-fuchsia-500 text-slate-200 placeholder-slate-500 p-3 transition"
          placeholder="https://www.linkedin.com/in/seu-perfil/"
          value={profileUrl}
          onChange={(e) => setProfileUrl(e.target.value)}
        />
        <p className="text-xs text-slate-500 mt-1">
          Forneça um link para que a IA possa analisar e adaptar o tom de voz.
        </p>
      </div>
      
      <div>
        <label className="block text-sm font-semibold text-slate-300 mb-2">
          4. Modo de Pensamento (Opcional)
        </label>
        <div className="flex items-center justify-between bg-slate-900/50 border border-slate-600 rounded-md p-3">
          <div>
            <h4 className="font-semibold text-slate-200">Ativar Análise Profunda</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Ideal para temas complexos. A IA usará um modelo mais potente para uma análise aprofundada. A geração pode levar mais tempo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setThinkingMode(!thinkingMode)}
            className={`${
              thinkingMode ? 'bg-fuchsia-600' : 'bg-slate-700'
            } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:ring-offset-2 focus:ring-offset-slate-800`}
            role="switch"
            aria-checked={thinkingMode}
          >
            <span
              aria-hidden="true"
              className={`${
                thinkingMode ? 'translate-x-5' : 'translate-x-0'
              } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
            />
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-300 mb-2">
          5. Plataforma de Destino
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {platformDetails.map((p) => (
            <div key={p.name}>
              <input
                type="radio"
                id={p.name}
                name="platform"
                value={p.name}
                checked={platform === p.name}
                onChange={(e) => setPlatform(e.target.value)}
                className="sr-only peer"
              />
              <label
                htmlFor={p.name}
                className="w-full flex flex-col items-center justify-center gap-2 p-4 text-slate-300 bg-slate-700/50 rounded-lg cursor-pointer transition-all duration-200 border-2 border-transparent peer-checked:border-fuchsia-500 peer-checked:text-fuchsia-300 peer-checked:bg-fuchsia-900/30 hover:bg-slate-700"
              >
                {p.icon}
                <span className="text-sm font-medium">{p.name}</span>
              </label>
            </div>
          ))}
        </div>
      </div>


      <button
        type="submit"
        disabled={isLoading || !theme.trim()}
        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-semibold text-white bg-fuchsia-600 hover:bg-fuchsia-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-fuchsia-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] disabled:scale-100"
      >
        {isLoading ? 'Gerando...' : 'Gerar Post com IA ✨'}
      </button>
    </form>
  );
};