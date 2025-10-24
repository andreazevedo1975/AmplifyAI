import React, { useState } from 'react';
import { InstagramIcon, FacebookIcon, LinkedInIcon, TwitterXIcon, TikTokIcon, PinterestIcon, YouTubeIcon, RedditIcon, TumblrIcon, QuoraIcon, WhatsAppIcon, TelegramIcon } from './icons/PlatformIcons';
import { WarningIcon } from './icons/WarningIcon';
import { generateImage } from '../services/geminiService';
import { Spinner } from './Spinner';
import { CloseIcon } from './icons/CloseIcon';


interface InputFormProps {
  onGenerate: (options: {
      mode: 'post' | 'video' | 'script';
      theme: string;
      imageInput: string;
      platform: string;
      profileUrl: string;
      thinkingMode: boolean;
      creativityMode: boolean;
      focusMode: boolean;
      tone: string;
      scriptTitle?: string;
      scriptDescription?: string;
  }) => void;
  isLoading: boolean;
}

const platformDetails = [
  { name: 'Facebook', icon: <FacebookIcon /> },
  { name: 'Instagram', icon: <InstagramIcon /> },
  { name: 'LinkedIn', icon: <LinkedInIcon /> },
  { name: 'Pinterest', icon: <PinterestIcon /> },
  { name: 'Quora', icon: <QuoraIcon /> },
  { name: 'Reddit', icon: <RedditIcon /> },
  { name: 'Telegram', icon: <TelegramIcon /> },
  { name: 'TikTok', icon: <TikTokIcon /> },
  { name: 'Tumblr', icon: <TumblrIcon /> },
  { name: 'Twitter (X)', icon: <TwitterXIcon /> },
  { name: 'WhatsApp', icon: <WhatsAppIcon /> },
  { name: 'YouTube', icon: <YouTubeIcon /> },
];

const tones = ['Envolvente', 'Profissional', 'Engraçado', 'Inspirador', 'Informativo', 'Casual'];
const videoStyles = [
    'Abstrato', 
    'Animação', 
    'Aquarela Animada',
    'Arte de Papel', 
    'Cinemático', 
    'Cyberpunk',
    'Documentário',
    'Estilo Vlog',
    'Fantasia Épica', 
    'Filmagem de Drone', 
    'Grão de Filme Vintage',
    'Infográfico Animado', 
    'Minimalista', 
    'Neon Noir',
    'Preto e Branco', 
    'Render 3D', 
    'Retrô', 
    'Slow Motion Dramático',
    'Stop Motion', 
    'Time-lapse', 
    'Vaporwave', 
];


export const InputForm: React.FC<InputFormProps> = ({ onGenerate, isLoading }) => {
  const [mode, setMode] = useState<'post' | 'video' | 'script'>('post');
  const [theme, setTheme] = useState('');
  const [imageInput, setImageInput] = useState('');
  const [platform, setPlatform] = useState(platformDetails[0].name);
  const [profileUrl, setProfileUrl] = useState('');
  const [thinkingMode, setThinkingMode] = useState(false);
  const [creativityMode, setCreativityMode] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [tone, setTone] = useState('Envolvente');
  const [videoStyle, setVideoStyle] = useState(videoStyles[0]);
  const [videoLength, setVideoLength] = useState('');
  const [scriptTitle, setScriptTitle] = useState('');
  const [scriptDescription, setScriptDescription] = useState('');
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isAutoGeneratingImage, setIsAutoGeneratingImage] = useState(false);

  const [profileUrlState, setProfileUrlState] = useState<{
    status: 'idle' | 'valid' | 'invalid' | 'warning';
    message: string | null;
  }>({ status: 'idle', message: null });

  const isUrl = (text: string): boolean => {
    try {
      new URL(text);
      return text.startsWith('http');
    } catch (_) {
      return false;
    }
  };

  const handleRemovePreview = () => {
    setPreviewUrl(null);
    setImageInput('');
    setPreviewError(null);
    setIsPreviewLoading(false);
  };
  
  const handleGeneratePreview = async () => {
      if (!imageInput.trim() || isUrl(imageInput)) return;
      setIsPreviewLoading(true);
      setPreviewError(null);
      setPreviewUrl(null);
      try {
        const imageUrl = await generateImage(imageInput, platform);
        setPreviewUrl(imageUrl);
      } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Falha ao gerar a pré-visualização.";
          if (errorMessage.includes('[SAFETY_BLOCK]')) {
             setPreviewError("A imagem foi bloqueada por segurança. Tente um prompt diferente.");
          } else {
             setPreviewError("Não foi possível gerar a pré-visualização. Tente novamente.");
          }
          console.error(error);
      } finally {
          setIsPreviewLoading(false);
      }
  };

  const handleUrlBlur = () => {
    if (imageInput && isUrl(imageInput)) {
      setPreviewUrl(imageInput);
      setPreviewError(null);
      // We don't set loading true here, the browser handles it.
      // Error handling is done on the <img> tag itself.
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const baseOptions = {
        theme,
        imageInput,
        platform,
        profileUrl,
        thinkingMode,
        creativityMode,
        focusMode,
        tone,
        scriptTitle,
        scriptDescription
    };

    if (mode === 'video') {
      if (!theme.trim()) return;
      const videoPrompt = `${theme}. Estilo: ${videoStyle}. ${videoLength ? `Duração desejada: ${videoLength}.` : ''}`.trim();
      onGenerate({ ...baseOptions, mode: 'video', theme: videoPrompt });

    } else if (mode === 'post') {
        if (!theme.trim() || profileUrlState.status === 'invalid') return;
        
        let imageUrl = previewUrl;
        
        // If user entered a valid URL, it's already set as previewUrl on blur.
        // If we don't have a URL, we must generate one from a prompt (or empty input).
        if (!imageUrl) {
            setIsAutoGeneratingImage(true);
            setPreviewError(null);
            try {
                const prompt = imageInput.trim()
                    ? imageInput
                    : `Gere uma imagem para um post de ${platform} com o tema "${theme}". O tom de voz da legenda será "${tone}", então a imagem deve refletir esse sentimento. Por exemplo, para 'Inspirador', a imagem deve ser motivacional. Para 'Profissional', algo mais sóbrio e corporativo. Para 'Engraçado', algo divertido.`;
                
                imageUrl = await generateImage(prompt, platform);
            } catch (error) {
                console.error("Error auto-generating image:", error);
                const errorMessage = error instanceof Error ? error.message : "Falha ao gerar a imagem.";
                if (errorMessage.includes('[SAFETY_BLOCK]')) {
                    setPreviewError("A imagem foi bloqueada por segurança. Tente um prompt diferente.");
                } else {
                    setPreviewError("Não foi possível gerar a imagem automaticamente. Tente novamente.");
                }
                setIsAutoGeneratingImage(false);
                return; // Stop submission on image generation failure
            } finally {
                setIsAutoGeneratingImage(false);
            }
        }
        
        onGenerate({ ...baseOptions, mode: 'post', imageInput: imageUrl || '' });

    } else if (mode === 'script') {
        if (!scriptTitle.trim()) return;
        onGenerate({ ...baseOptions, mode: 'script' });
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileUrl(e.target.value);
    if (profileUrlState.status !== 'idle') {
      setProfileUrlState({ status: 'idle', message: null });
    }
  };

  const validateUrlOnBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const url = e.target.value.trim();
    if (!url) {
      setProfileUrlState({ status: 'idle', message: null });
      return;
    }

    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname.toLowerCase();
      
      if (['linkedin.com', 'www.linkedin.com', 'facebook.com', 'www.facebook.com', 'instagram.com', 'www.instagram.com'].includes(hostname)) {
        setProfileUrlState({
          status: 'warning',
          message: 'A IA pode não conseguir analisar este link. A personalização de tom de voz pode ser limitada.',
        });
      } else {
        setProfileUrlState({ status: 'valid', message: null });
      }

    } catch (error) {
      setProfileUrlState({
        status: 'invalid',
        message: 'Formato de URL inválido. Insira um link completo (ex: https://site.com).',
      });
    }
  };


  return (
    <form onSubmit={handleSubmit} className="bg-slate-800/60 p-6 rounded-lg shadow-lg space-y-6 border border-slate-700">
      
      <div>
        <div className="flex justify-center mb-6">
            <div className="bg-slate-900/50 border border-slate-700 rounded-full p-1 flex space-x-1">
                <button
                    type="button"
                    onClick={() => setMode('post')}
                    className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors ${mode === 'post' ? 'bg-fuchsia-600 text-white' : 'text-slate-300 hover:bg-slate-700/50'}`}
                >
                    Gerar Post
                </button>
                <button
                    type="button"
                    onClick={() => setMode('video')}
                    className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors ${mode === 'video' ? 'bg-cyan-500 text-white' : 'text-slate-300 hover:bg-slate-700/50'}`}
                >
                    Gerar Vídeo
                </button>
                 <button
                    type="button"
                    onClick={() => setMode('script')}
                    className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors ${mode === 'script' ? 'bg-amber-500 text-white' : 'text-slate-300 hover:bg-slate-700/50'}`}
                >
                    Gerar Roteiro
                </button>
            </div>
        </div>
      </div>
      
      {mode === 'script' ? (
        <>
            <div>
                <label htmlFor="script-title" className="block text-sm font-semibold text-slate-300 mb-2">
                  1. Título do Vídeo
                </label>
                <input
                  id="script-title"
                  type="text"
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 text-slate-200 placeholder-slate-500 p-3 transition"
                  placeholder="Ex: Como a IA está revolucionando a música"
                  value={scriptTitle}
                  onChange={(e) => setScriptTitle(e.target.value)}
                  required
                />
            </div>
            <div>
                <label htmlFor="script-description" className="block text-sm font-semibold text-slate-300 mb-2">
                  2. Descrição / Tópicos (Opcional)
                </label>
                <textarea
                  id="script-description"
                  rows={3}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 text-slate-200 placeholder-slate-500 p-3 transition"
                  placeholder="Ex: Abordar o uso de IA na composição, produção e o futuro dos artistas."
                  value={scriptDescription}
                  onChange={(e) => setScriptDescription(e.target.value)}
                />
            </div>
        </>
      ) : (
      <>
        <div>
          <label htmlFor="theme" className="block text-sm font-semibold text-slate-300 mb-2">
            1. {mode === 'post' ? 'Descreva a ideia para a IA' : 'Descreva a cena principal e os elementos'}
          </label>
          <textarea
            id="theme"
            rows={3}
            className="w-full bg-slate-900/50 border border-slate-600 rounded-md shadow-sm focus:ring-fuchsia-500 focus:border-fuchsia-500 text-slate-200 placeholder-slate-500 p-3 transition"
            placeholder={mode === 'post' ? "Ex: Os benefícios da inteligência artificial para pequenas empresas" : "Ex: Um astronauta surfando em um anel de Saturno, com nebulosas coloridas ao fundo"}
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="image-input" className="block text-sm font-semibold text-slate-300 mb-2">
            2. {mode === 'post' ? 'Imagem (Opcional)' : 'Imagem de Referência (Opcional)'}
          </label>
          <div className="flex items-center gap-3">
              <input
                type="text"
                id="image-input"
                className="w-full bg-slate-900/50 border border-slate-600 rounded-md shadow-sm focus:ring-fuchsia-500 focus:border-fuchsia-500 text-slate-200 placeholder-slate-500 p-3 transition disabled:bg-slate-800/50 disabled:cursor-not-allowed"
                placeholder={mode === 'post' ? "Deixe em branco, insira um prompt ou URL" : "Insira o URL de uma imagem para guiar a IA"}
                value={imageInput}
                onChange={(e) => setImageInput(e.target.value)}
                onBlur={handleUrlBlur}
                disabled={!!previewUrl || isPreviewLoading}
              />
              {mode === 'post' && !isUrl(imageInput) && (
                <button 
                  type="button"
                  onClick={handleGeneratePreview}
                  disabled={!imageInput.trim() || !!previewUrl || isPreviewLoading}
                  className="py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                  >
                    Pré-visualizar
                </button>
              )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {mode === 'post' ? 'Forneça um prompt para a IA ou o URL de uma imagem existente.' : 'Forneça o URL de uma imagem para servir de ponto de partida para o vídeo.'}
          </p>

          {(isPreviewLoading || previewError || previewUrl) && (
              <div className="mt-4 p-3 bg-slate-900/50 border border-slate-700 rounded-lg">
                  {isPreviewLoading && (
                      <div className="flex items-center justify-center text-slate-400">
                          <Spinner />
                          <span className="ml-2">Gerando pré-visualização...</span>
                      </div>
                  )}
                  {previewError && (
                       <p className="text-sm text-red-400 text-center flex items-center justify-center gap-1.5"><WarningIcon /> {previewError}</p>
                  )}
                  {previewUrl && !previewError && (
                      <div className="relative group w-full aspect-video">
                          <img 
                              src={previewUrl} 
                              alt="Pré-visualização da imagem" 
                              className="rounded-md object-contain w-full h-full"
                              onLoad={() => { setIsPreviewLoading(false); setPreviewError(null); }}
                              onError={() => { setPreviewError("Não foi possível carregar a imagem do URL."); setPreviewUrl(null); }}
                          />
                           <button 
                              type="button" 
                              onClick={handleRemovePreview}
                              className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-white transition-opacity opacity-0 group-hover:opacity-100"
                              aria-label="Remover pré-visualização"
                          >
                              <CloseIcon />
                          </button>
                      </div>
                  )}
              </div>
          )}
        </div>
      </>
      )}

      {mode === 'post' ? (
        <>
            <div>
              <label htmlFor="profile-url" className="block text-sm font-semibold text-slate-300 mb-2">
                3. URL do Perfil (Opcional)
              </label>
              <input
                type="url"
                id="profile-url"
                className={`w-full bg-slate-900/50 border rounded-md shadow-sm text-slate-200 placeholder-slate-500 p-3 transition ${
                  profileUrlState.status === 'invalid' 
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                    : 'border-slate-600 focus:ring-fuchsia-500 focus:border-fuchsia-500'
                }`}
                placeholder="https://www.linkedin.com/in/seu-perfil/"
                value={profileUrl}
                onChange={handleUrlChange}
                onBlur={validateUrlOnBlur}
                aria-invalid={profileUrlState.status === 'invalid'}
                aria-describedby="profile-url-feedback"
              />
              <div id="profile-url-feedback" aria-live="polite" className="mt-2 min-h-[20px]">
                  {profileUrlState.status === 'invalid' ? (
                      <p className="text-sm text-red-400 flex items-center gap-1.5"><WarningIcon /> {profileUrlState.message}</p>
                  ) : profileUrlState.status === 'warning' ? (
                      <p className="text-sm text-amber-400 flex items-center gap-1.5"><WarningIcon /> {profileUrlState.message}</p>
                  ) : (
                      <p className="text-xs text-slate-500">
                          Forneça um link para que a IA possa analisar e adaptar o tom de voz.
                      </p>
                  )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                4. Tom de Voz da Legenda
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {tones.map((t) => (
                  <div key={t}>
                    <input
                      type="radio"
                      id={`tone-${t}`}
                      name="tone"
                      value={t}
                      checked={tone === t}
                      onChange={(e) => setTone(e.target.value)}
                      className="sr-only peer"
                    />
                    <label
                      htmlFor={`tone-${t}`}
                      className="w-full flex items-center justify-center p-3 text-slate-300 bg-slate-700/50 rounded-lg cursor-pointer transition-all duration-200 border-2 border-transparent peer-checked:border-fuchsia-500 peer-checked:text-fuchsia-300 peer-checked:bg-fuchsia-900/30 hover:bg-slate-700"
                    >
                      <span className="text-sm font-medium text-center">{t}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                5. Modos de Geração (Opcional)
              </label>
              <div className="space-y-4">
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
                <div className="flex items-center justify-between bg-slate-900/50 border border-slate-600 rounded-md p-3">
                  <div>
                    <h4 className="font-semibold text-slate-200">Ativar Modo Criatividade</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      Ideal para brainstorm e ideias inovadoras. A IA irá gerar conteúdo mais ousado e experimental.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreativityMode(!creativityMode)}
                    className={`${
                      creativityMode ? 'bg-cyan-500' : 'bg-slate-700'
                    } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-800`}
                    role="switch"
                    aria-checked={creativityMode}
                  >
                    <span
                      aria-hidden="true"
                      className={`${
                        creativityMode ? 'translate-x-5' : 'translate-x-0'
                      } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between bg-slate-900/50 border border-slate-600 rounded-md p-3">
                  <div>
                    <h4 className="font-semibold text-slate-200">Ativar Modo de Foco Profundo</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      Instrui a IA a se ater estritamente ao tema, evitando criatividade e tangentes, para uma resposta mais direta e específica.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFocusMode(!focusMode)}
                    className={`${
                      focusMode ? 'bg-amber-500' : 'bg-slate-700'
                    } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-800`}
                    role="switch"
                    aria-checked={focusMode}
                  >
                    <span
                      aria-hidden="true"
                      className={`${
                        focusMode ? 'translate-x-5' : 'translate-x-0'
                      } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                    />
                  </button>
                </div>
              </div>
            </div>


            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                6. Plataforma de Destino
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
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
                      <span className="text-sm font-medium text-center">{p.name}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
        </>
      ) : mode === 'video' ? (
        <>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                3. Estilo do Vídeo
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {videoStyles.map((style) => (
                  <div key={style}>
                    <input
                      type="radio"
                      id={`style-${style}`}
                      name="video-style"
                      value={style}
                      checked={videoStyle === style}
                      onChange={(e) => setVideoStyle(e.target.value)}
                      className="sr-only peer"
                    />
                    <label
                      htmlFor={`style-${style}`}
                      className="w-full flex items-center justify-center p-3 text-slate-300 bg-slate-700/50 rounded-lg cursor-pointer transition-all duration-200 border-2 border-transparent peer-checked:border-cyan-500 peer-checked:text-cyan-300 peer-checked:bg-cyan-900/30 hover:bg-slate-700"
                    >
                      <span className="text-sm font-medium text-center">{style}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="video-length" className="block text-sm font-semibold text-slate-300 mb-2">
                4. Duração Desejada (Opcional)
              </label>
              <input
                type="text"
                id="video-length"
                className="w-full bg-slate-900/50 border border-slate-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-slate-200 placeholder-slate-500 p-3 transition"
                placeholder="Ex: 5 segundos, clipe curto"
                value={videoLength}
                onChange={(e) => setVideoLength(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1">
                A IA tentará seguir a duração sugerida.
              </p>
            </div>
        </>
      ) : null}

      <button
        type="submit"
        disabled={isLoading || isAutoGeneratingImage || (mode === 'post' && !theme.trim()) || (mode === 'video' && !theme.trim()) || (mode === 'script' && !scriptTitle.trim()) || (mode === 'post' && profileUrlState.status === 'invalid')}
        className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] disabled:scale-100 ${
            mode === 'post' 
            ? 'bg-fuchsia-600 hover:bg-fuchsia-700 focus:ring-fuchsia-500 disabled:bg-slate-600'
            : mode === 'video'
            ? 'bg-cyan-600 hover:bg-cyan-700 focus:ring-cyan-500 disabled:bg-slate-600'
            : 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 disabled:bg-slate-600'
        }`}
      >
        {isAutoGeneratingImage ? 'Gerando Imagem...' : isLoading ? 'Gerando...' : 
            mode === 'post' ? 'Gerar Post com IA ✨' : 
            mode === 'video' ? 'Gerar Vídeo com IA 🎬' : 
            'Gerar Roteiro com IA 📝'}
      </button>
    </form>
  );
};