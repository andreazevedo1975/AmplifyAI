import React, { useState, useEffect } from 'react';
import { InstagramIcon, FacebookIcon, LinkedInIcon, TwitterXIcon, TikTokIcon, PinterestIcon, YouTubeIcon, RedditIcon, TumblrIcon, QuoraIcon, WhatsAppIcon, TelegramIcon } from './icons/PlatformIcons';
import { WarningIcon } from './icons/WarningIcon';
import { generateInspirationalIdea, generateTrendingTopics } from '../services/geminiService';
import { Spinner } from './Spinner';
import { CloseIcon } from './icons/CloseIcon';
import { Modal } from './Modal';
import { SparklesIcon } from './icons/SparklesIcon';
import { ManageAccountsIcon } from './icons/ManageAccountsIcon';
import { TrashIcon } from './icons/TrashIcon';
import type { ToneProfile, GenerateOptions } from '../types';
import { TrendingUpIcon } from './icons/TrendingUpIcon';


interface InputFormProps {
  onGenerate: (options: GenerateOptions) => void;
  isLoading: boolean;
}

interface SavedProfile {
  name: string;
  url: string;
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

const toneOptions = [
  'Casual', 'Divertido', 'Empático', 'Envolvente', 'Formal', 'Informativo', 
  'Inspirador', 'Minimalista', 'Ousado', 'Profissional', 'Urgente'
];

const voiceOptions = [
  { id: 'erinome', name: 'Beatriz (Feminino, Enérgico)' },
  { id: 'achernar', name: 'Bruno (Masculino, Profundo)' },
  { id: 'callirrhoe', name: 'Camila (Feminino, Neutro)' },
  { id: 'sadachbia', name: 'Daniel (Masculino, Neutro)' },
  { id: 'alnilam', name: 'Fernanda (Feminino, Profundo)' },
  { id: 'puck', name: 'Gustavo (Masculino, Enérgico)' },
  { id: 'kore', name: 'Isabela (Feminino, Calmo)' },
  { id: 'laomedeia', name: 'Larissa (Feminino, Agudo)' },
  { id: 'gacrux', name: 'Lucas (Masculino, Neutro)' },
  { id: 'charon', name: 'Mariana (Feminino, Grave)' },
  { id: 'zephyr', name: 'Mateus (Masculino, Calmo)' },
  { id: 'fenrir', name: 'Ricardo (Masculino, Grave)' },
  { id: 'algenib', name: 'Thiago (Masculino, Agudo)' },
];

const emotionOptions = ['Amigável', 'Feliz', 'Triste', 'Sério', 'Empolgado', 'Calmo'];
const styleOptions = ['Conversacional', 'Narrador', 'Rápido', 'Lento', 'Sussurrado'];

export const InputForm: React.FC<InputFormProps> = ({ onGenerate, isLoading }) => {
  const [mode, setMode] = useState<'post' | 'video' | 'script' | 'audio'>('post');
  const [theme, setTheme] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageOption, setImageOption] = useState<'prompt' | 'url' | 'none'>('prompt');
  const [imageUrl, setImageUrl] = useState('');
  const [platform, setPlatform] = useState(platformDetails[0].name);
  const [selectedProfileUrl, setSelectedProfileUrl] = useState('');
  const [thinkingMode, setThinkingMode] = useState(false);
  const [creativityMode, setCreativityMode] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [selectedTone, setSelectedTone] = useState('Casual');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const [scriptTitle, setScriptTitle] = useState('');
  const [scriptDescription, setScriptDescription] = useState('');

  const [audioText, setAudioText] = useState('');
  const [audioVoice, setAudioVoice] = useState(voiceOptions[0].id);
  const [audioEmotion, setAudioEmotion] = useState('Amigável');
  const [audioStyle, setAudioStyle] = useState('Conversacional');
  
  const [isGeneratingIdea, setIsGeneratingIdea] = useState(false);
  const [ideaError, setIdeaError] = useState<string | null>(null);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([]);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileUrl, setNewProfileUrl] = useState('');
  const [profileError, setProfileError] = useState<string | null>(null);
  
  // State for Tone Profiles
  const [isToneModalOpen, setIsToneModalOpen] = useState(false);
  const [savedToneProfiles, setSavedToneProfiles] = useState<ToneProfile[]>([]);
  const [editingToneProfile, setEditingToneProfile] = useState<ToneProfile | null>(null);
  const [toneFormName, setToneFormName] = useState('');
  const [toneFormDescription, setToneFormDescription] = useState('');
  const [toneFormExamples, setToneFormExamples] = useState('');
  const [toneFormError, setToneFormError] = useState<string | null>(null);

  // State for Trend Hunter
  const [isTrendModalOpen, setIsTrendModalOpen] = useState(false);
  const [trendKeyword, setTrendKeyword] = useState('');
  const [trendingTopics, setTrendingTopics] = useState<string[]>([]);
  const [isSearchingTrends, setIsSearchingTrends] = useState(false);
  const [trendSearchError, setTrendSearchError] = useState<string | null>(null);

  const exampleProfiles = [
    { name: 'NASA (Educacional)', url: 'https://www.instagram.com/nasa/' },
    { name: 'Nike (Motivacional)', url: 'https://www.instagram.com/nike/' },
    { name: 'The Verge (Tecnológico)', url: 'https://www.theverge.com/' },
    { name: "Wendy's (Humor Ousado)", url: 'https://twitter.com/wendys' },
  ];
  
  // Load profiles from localStorage on mount
  useEffect(() => {
    try {
      const storedProfiles = localStorage.getItem('amplifyai_profiles');
      if (storedProfiles) {
        setSavedProfiles(JSON.parse(storedProfiles));
      }
      const storedTones = localStorage.getItem('amplifyai_tone_profiles');
      if (storedTones) {
        setSavedToneProfiles(JSON.parse(storedTones));
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
    }
  }, []);

  // Save profiles to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('amplifyai_profiles', JSON.stringify(savedProfiles));
    } catch (error) {
      console.error("Failed to save profiles to localStorage", error);
    }
  }, [savedProfiles]);
  
  useEffect(() => {
    try {
      localStorage.setItem('amplifyai_tone_profiles', JSON.stringify(savedToneProfiles));
    } catch (error) {
      console.error("Failed to save tone profiles to localStorage", error);
    }
  }, [savedToneProfiles]);

  const handleAddProfile = () => {
    setProfileError(null);
    if (!newProfileName.trim() || !newProfileUrl.trim()) {
      setProfileError("Nome e URL do perfil são obrigatórios.");
      return;
    }
    try {
      new URL(newProfileUrl);
    } catch (_) {
      setProfileError("Por favor, insira uma URL válida.");
      return;
    }
    setSavedProfiles([...savedProfiles, { name: newProfileName, url: newProfileUrl }]);
    setNewProfileName('');
    setNewProfileUrl('');
  };

  const handleDeleteProfile = (urlToDelete: string) => {
    setSavedProfiles(savedProfiles.filter(p => p.url !== urlToDelete));
    if (selectedProfileUrl === urlToDelete) {
      setSelectedProfileUrl('');
    }
  };

  const handleEditToneProfile = (profile: ToneProfile) => {
    setEditingToneProfile(profile);
    setToneFormName(profile.name);
    setToneFormDescription(profile.description);
    setToneFormExamples(profile.examples);
    setToneFormError(null);
  };
  
  const handleSaveToneProfile = () => {
    setToneFormError(null);
    if (!toneFormName.trim() || !toneFormDescription.trim()) {
      setToneFormError("Nome e Descrição do tom são obrigatórios.");
      return;
    }

    if (editingToneProfile) {
      setSavedToneProfiles(savedToneProfiles.map(p => 
        p.id === editingToneProfile.id 
        ? { ...p, name: toneFormName, description: toneFormDescription, examples: toneFormExamples } 
        : p
      ));
    } else {
      const newProfile: ToneProfile = {
        id: crypto.randomUUID(),
        name: toneFormName,
        description: toneFormDescription,
        examples: toneFormExamples,
      };
      setSavedToneProfiles([...savedToneProfiles, newProfile]);
    }
    
    // Reset form
    setEditingToneProfile(null);
    setToneFormName('');
    setToneFormDescription('');
    setToneFormExamples('');
  };
  
  const handleDeleteToneProfile = (idToDelete: string) => {
      setSavedToneProfiles(savedToneProfiles.filter(p => p.id !== idToDelete));
      if (selectedTone === idToDelete) {
        setSelectedTone('Envolvente'); // Reset to default if deleted
      }
  };


  const isUrl = (text: string): boolean => {
    try {
      new URL(text);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleGenerateIdea = async (category: 'quote' | 'story' | 'reflection') => {
    setIsGeneratingIdea(true);
    setIdeaError(null);
    try {
      const idea = await generateInspirationalIdea(category);
      if (mode === 'audio') {
        setAudioText(idea);
      } else {
        setTheme(idea);
      }
    } catch (error) {
      console.error("Error generating idea:", error);
      setIdeaError("Não foi possível gerar a ideia. Tente novamente.");
    } finally {
      setIsGeneratingIdea(false);
    }
  };

  const handleSearchTrends = async () => {
      if (!trendKeyword.trim()) {
          setTrendSearchError("Por favor, insira uma palavra-chave para buscar.");
          return;
      }
      setIsSearchingTrends(true);
      setTrendSearchError(null);
      setTrendingTopics([]);
      try {
          const topics = await generateTrendingTopics(trendKeyword);
          setTrendingTopics(topics);
      } catch (error) {
          setTrendSearchError((error as Error).message || "Ocorreu um erro ao buscar as tendências.");
      } finally {
          setIsSearchingTrends(false);
      }
  };

  const handleSelectTrend = (topic: string) => {
      setTheme(topic);
      setIsTrendModalOpen(false);
      // Reset modal state
      setTrendKeyword('');
      setTrendingTopics([]);
      setTrendSearchError(null);
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let imageInput = '';
    if (imageOption === 'url') {
      imageInput = imageUrl;
    } else if (imageOption === 'prompt') {
      imageInput = imagePrompt.trim() || theme.trim();
    }

    let tonePayload = selectedTone;
    const customToneProfile = savedToneProfiles.find(p => p.id === selectedTone);
    if (customToneProfile) {
      tonePayload = `[INSTRUÇÃO DE TOM PERSONALIZADO]\n- **Nome do Tom:** ${customToneProfile.name}\n- **Descrição:** ${customToneProfile.description}${customToneProfile.examples ? `\n- **Exemplos de Frases:**\n${customToneProfile.examples.split('\n').map(ex => `  - ${ex}`).join('\n')}` : ''}`;
    }

    onGenerate({
      mode,
      theme, 
      imageInput, 
      platform,
      profileUrl: selectedProfileUrl, 
      thinkingMode,
      creativityMode,
      focusMode,
      tone: tonePayload,
      scriptTitle,
      scriptDescription,
      audioText,
      audioVoice,
      audioEmotion,
      audioStyle,
    });
  };

  const isFormValid = () => {
    if (isLoading) return false;
    if (mode === 'script') {
        return scriptTitle.trim() !== '' && scriptDescription.trim() !== '';
    }
    if (mode === 'audio') {
        return audioText.trim() !== '';
    }
    if (theme.trim() === '') return false;
    if (imageOption === 'url' && (!imageUrl.trim() || !isUrl(imageUrl))) return false;
    return true;
  };
  
  const renderModeSpecificFields = () => {
    switch(mode) {
      case 'audio':
        return (
          <>
            <div className="mb-6">
              <label htmlFor="audioText" className="block text-sm font-medium text-slate-300 mb-2">
                Texto para Narração
              </label>
              <textarea
                id="audioText"
                value={audioText}
                onChange={(e) => setAudioText(e.target.value)}
                placeholder="Ex: Descubra como a inteligência artificial pode transformar suas ideias em conteúdo viral..."
                className="w-full bg-slate-900/70 border-2 border-slate-700 rounded-xl shadow-sm p-3 focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition"
                rows={5}
                required
              />
               <div className="mt-3 text-center">
                 <p className="text-sm text-slate-400 mb-2">Sem ideias? Deixe a IA te inspirar!</p>
                 <div className="flex justify-center items-center gap-2 flex-wrap">
                    {isGeneratingIdea ? <Spinner /> : (
                      <>
                        <button type="button" onClick={() => handleGenerateIdea('quote')} className="text-xs font-semibold px-4 py-2 rounded-full bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-transform hover:scale-105">Gerar Citação</button>
                        <button type="button" onClick={() => handleGenerateIdea('reflection')} className="text-xs font-semibold px-4 py-2 rounded-full bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-transform hover:scale-105">Gerar Reflexão</button>
                      </>
                    )}
                 </div>
                 {ideaError && <p className="text-xs text-red-400 mt-2">{ideaError}</p>}
              </div>
            </div>
             <div className="mb-6">
                <label htmlFor="audioVoice" className="block text-sm font-medium text-slate-300 mb-2">
                    Voz da IA (Ator)
                </label>
                <select
                    id="audioVoice"
                    value={audioVoice}
                    onChange={(e) => setAudioVoice(e.target.value)}
                    className="w-full bg-slate-900/70 border-2 border-slate-700 rounded-xl shadow-sm p-3 focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition"
                >
                    {voiceOptions.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                    <label htmlFor="audioEmotion" className="block text-sm font-medium text-slate-300 mb-2">
                        Tom Emocional
                    </label>
                    <select
                        id="audioEmotion"
                        value={audioEmotion}
                        onChange={(e) => setAudioEmotion(e.target.value)}
                        className="w-full bg-slate-900/70 border-2 border-slate-700 rounded-xl shadow-sm p-3 focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition"
                    >
                        {emotionOptions.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="audioStyle" className="block text-sm font-medium text-slate-300 mb-2">
                        Estilo da Fala
                    </label>
                    <select
                        id="audioStyle"
                        value={audioStyle}
                        onChange={(e) => setAudioStyle(e.target.value)}
                        className="w-full bg-slate-900/70 border-2 border-slate-700 rounded-xl shadow-sm p-3 focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition"
                    >
                        {styleOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>
          </>
        );
      case 'video':
        return (
          <>
            <div className="mb-6">
              <label htmlFor="theme" className="block text-sm font-medium text-slate-300 mb-2">
                Prompt para o Vídeo
              </label>
              <textarea
                id="theme"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="Ex: Um astronauta surfando em uma onda cósmica em estilo neon."
                className="w-full bg-slate-900/70 border-2 border-slate-700 rounded-xl shadow-sm p-3 focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition"
                rows={3}
                required
              />
               <p className="text-xs text-slate-400 mt-1">Descreva a cena que você quer gerar. Seja criativo!</p>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Imagem Inicial (Opcional)
              </label>
              <div className="flex items-center space-x-4 mb-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" name="imageOption" value="none" checked={imageOption === 'none'} onChange={() => setImageOption('none')} className="form-radio h-4 w-4 text-fuchsia-500 bg-slate-700 border-slate-500 focus:ring-fuchsia-500" />
                  <span>Nenhuma</span>
                </label>
                 <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" name="imageOption" value="url" checked={imageOption === 'url'} onChange={() => setImageOption('url')} className="form-radio h-4 w-4 text-fuchsia-500 bg-slate-700 border-slate-500 focus:ring-fuchsia-500" />
                  <span>URL da Imagem</span>
                </label>
              </div>
               {imageOption === 'url' && (
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://exemplo.com/imagem.jpg"
                  className="w-full bg-slate-900/70 border-2 border-slate-700 rounded-xl shadow-sm p-3 focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition"
                />
              )}
               <p className="text-xs text-slate-400 mt-1">Você pode fornecer uma imagem como ponto de partida para o vídeo.</p>
            </div>
          </>
        );
      case 'script':
         return (
           <>
            <div className="mb-6">
              <label htmlFor="scriptTitle" className="block text-sm font-medium text-slate-300 mb-2">
                Título do Vídeo
              </label>
              <input
                id="scriptTitle"
                type="text"
                value={scriptTitle}
                onChange={(e) => setScriptTitle(e.target.value)}
                placeholder="Ex: 5 Dicas Incríveis para Edição de Vídeo"
                className="w-full bg-slate-900/70 border-2 border-slate-700 rounded-xl shadow-sm p-3 focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition"
                required
              />
            </div>
            <div className="mb-6">
              <label htmlFor="scriptDescription" className="block text-sm font-medium text-slate-300 mb-2">
                Breve Descrição do Conteúdo
              </label>
              <textarea
                id="scriptDescription"
                value={scriptDescription}
                onChange={(e) => setScriptDescription(e.target.value)}
                placeholder="Ex: Neste vídeo, vamos cobrir as melhores técnicas de corte, color grading, uso de trilha sonora, e mais."
                className="w-full bg-slate-900/70 border-2 border-slate-700 rounded-xl shadow-sm p-3 focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition"
                rows={3}
                required
              />
            </div>
          </>
         );
      case 'post':
      default:
        return (
          <>
            <div className="mb-6">
              <label htmlFor="theme" className="block text-sm font-medium text-slate-300 mb-2">
                Tema Central do Post
              </label>
               <div className="relative">
                <textarea
                  id="theme"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="Ex: Os benefícios da meditação guiada para reduzir o estresse."
                  className="w-full bg-slate-900/70 border-2 border-slate-700 rounded-xl shadow-sm p-3 pr-10 focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition"
                  rows={3}
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setTheme('')} 
                  className={`absolute top-2.5 right-2.5 p-1 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-opacity ${theme ? 'opacity-100' : 'opacity-0'}`}
                  aria-label="Limpar tema"
                >
                  <CloseIcon />
                </button>
              </div>
              
              <div className="mt-3 text-center">
                 <p className="text-sm text-slate-400 mb-2">Sem ideias? Deixe a IA te inspirar!</p>
                 <div className="flex justify-center items-center gap-2 flex-wrap">
                    {isGeneratingIdea ? <Spinner /> : (
                      <>
                        <button type="button" onClick={() => handleGenerateIdea('quote')} className="text-xs font-semibold px-4 py-2 rounded-full bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-transform hover:scale-105">Gerar Citação</button>
                        <button type="button" onClick={() => handleGenerateIdea('story')} className="text-xs font-semibold px-4 py-2 rounded-full bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-transform hover:scale-105">Gerar Ideia</button>
                        <button type="button" onClick={() => handleGenerateIdea('reflection')} className="text-xs font-semibold px-4 py-2 rounded-full bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-transform hover:scale-105">Gerar Reflexão</button>
                        <button type="button" onClick={() => { setIsTrendModalOpen(true); setTrendSearchError(null); setTrendingTopics([]); setTrendKeyword(''); }} className="text-xs font-semibold px-4 py-2 rounded-full bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 hover:text-white transition-all hover:scale-105 flex items-center gap-1.5">
                            <TrendingUpIcon /> Buscar Tendências
                        </button>
                      </>
                    )}
                 </div>
                 {ideaError && <p className="text-xs text-red-400 mt-2">{ideaError}</p>}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Fonte da Imagem
              </label>
              <div className="flex items-center space-x-4 mb-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" name="imageOption" value="prompt" checked={imageOption === 'prompt'} onChange={() => setImageOption('prompt')} className="form-radio h-4 w-4 text-fuchsia-500 bg-slate-700 border-slate-500 focus:ring-fuchsia-500" />
                  <span>Gerar com IA</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" name="imageOption" value="url" checked={imageOption === 'url'} onChange={() => setImageOption('url')} className="form-radio h-4 w-4 text-fuchsia-500 bg-slate-700 border-slate-500 focus:ring-fuchsia-500" />
                  <span>Usar URL</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" name="imageOption" value="none" checked={imageOption === 'none'} onChange={() => setImageOption('none')} className="form-radio h-4 w-4 text-fuchsia-500 bg-slate-700 border-slate-500 focus:ring-fuchsia-500" />
                  <span>Apenas Texto</span>
                </label>
              </div>

              {imageOption === 'prompt' && (
                <input
                  type="text"
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Opcional: Descreva a imagem. Ex: Um robô escrevendo em um laptop."
                  className="w-full bg-slate-900/70 border-2 border-slate-700 rounded-xl shadow-sm p-3 focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition"
                />
              )}
              {imageOption === 'url' && (
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://exemplo.com/imagem.jpg"
                  className="w-full bg-slate-900/70 border-2 border-slate-700 rounded-xl shadow-sm p-3 focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition"
                  required
                />
              )}
               {imageOption === 'url' && imageUrl && !isUrl(imageUrl) && (
                  <p className="text-xs text-red-400 mt-1 flex items-center"><WarningIcon /> URL inválida.</p>
               )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Plataforma de Destino
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {platformDetails.map(({ name, icon }) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setPlatform(name)}
                    className={`p-3 rounded-xl flex flex-col items-center justify-center space-y-2 transition-all duration-200 border-2 ${
                      platform === name ? 'bg-slate-700/50 border-fuchsia-500 shadow-lg shadow-fuchsia-500/10' : 'bg-slate-800/80 border-slate-700 hover:border-slate-500 hover:bg-slate-700/50'
                    }`}
                    aria-pressed={platform === name}
                  >
                    <span className={platform === name ? 'text-white' : 'text-slate-400'}>{icon}</span>
                    <span className={`text-xs font-semibold ${platform === name ? 'text-white' : 'text-slate-400'}`}>{name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
                <button type="button" onClick={() => setIsAdvancedOpen(!isAdvancedOpen)} className="font-semibold text-fuchsia-400 hover:text-fuchsia-300 transition-colors">
                    Opções Avançadas {isAdvancedOpen ? '▾' : '▸'}
                </button>
            </div>

            {isAdvancedOpen && (
              <div className="p-5 bg-slate-900/50 border border-slate-700 rounded-xl mb-6 animate-fade-in space-y-6">
                <div>
                  <label htmlFor="profileUrl" className="block text-sm font-medium text-slate-300 mb-2">
                    Análise de Tom de Voz (URL do Perfil)
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                        id="profileUrl"
                        value={selectedProfileUrl}
                        onChange={(e) => setSelectedProfileUrl(e.target.value)}
                        className="flex-grow w-full bg-slate-800 border-2 border-slate-600 rounded-xl shadow-sm p-3 focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition"
                    >
                        <option value="">Nenhum perfil selecionado</option>
                        {savedProfiles.length > 0 && (
                            <optgroup label="Seus Perfis Salvos">
                                {savedProfiles.map(profile => (
                                    <option key={profile.url} value={profile.url}>{profile.name}</option>
                                ))}
                            </optgroup>
                        )}
                         <optgroup label="Exemplos Prontos">
                            {exampleProfiles.map(profile => (
                                <option key={profile.url} value={profile.url}>{profile.name}</option>
                            ))}
                        </optgroup>
                    </select>
                    <button type="button" onClick={() => setIsProfileModalOpen(true)} className="p-3 rounded-xl bg-slate-700 hover:bg-slate-600 transition-colors" aria-label="Gerenciar Perfis Salvos" title="Gerenciar Perfis Salvos">
                        <ManageAccountsIcon />
                    </button>
                  </div>
                </div>

                <div>
                    <label htmlFor="tone" className="block text-sm font-medium text-slate-300 mb-2">
                        Tom de Voz Principal
                    </label>
                    <div className="flex items-center gap-2">
                        <select
                            id="tone"
                            value={selectedTone}
                            onChange={(e) => setSelectedTone(e.target.value)}
                            className="flex-grow w-full bg-slate-800 border-2 border-slate-600 rounded-xl shadow-sm p-3 focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition"
                        >
                            <optgroup label="Padrão">
                                {toneOptions.map(t => <option key={t} value={t}>{t}</option>)}
                            </optgroup>
                            {savedToneProfiles.length > 0 && (
                                <optgroup label="Personalizados">
                                    {savedToneProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </optgroup>
                            )}
                        </select>
                         <button type="button" onClick={() => setIsToneModalOpen(true)} className="p-3 rounded-xl bg-slate-700 hover:bg-slate-600 transition-colors" aria-label="Gerenciar Tons de Voz" title="Gerenciar Tons de Voz">
                            <ManageAccountsIcon />
                        </button>
                    </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Modos da IA</label>
                  <div className="space-y-3">
                    <div className="relative flex items-start">
                      <div className="flex items-center h-5">
                          <input id="thinkingMode" type="checkbox" checked={thinkingMode} onChange={(e) => setThinkingMode(e.target.checked)} className="focus:ring-fuchsia-500 h-4 w-4 text-fuchsia-600 border-slate-500 rounded bg-slate-700" />
                      </div>
                      <div className="ml-3 text-sm">
                          <label htmlFor="thinkingMode" className="font-medium text-slate-200">Análise Profunda</label>
                          <p className="text-slate-400 text-xs">Ativa um modelo de IA avançado para análises profundas e complexas. A geração pode levar mais tempo.</p>
                      </div>
                    </div>
                     <div className="relative flex items-start">
                      <div className="flex items-center h-5">
                          <input id="creativityMode" type="checkbox" checked={creativityMode} onChange={(e) => setCreativityMode(e.target.checked)} className="form-radio h-4 w-4 text-fuchsia-600 border-slate-500 rounded bg-slate-700 focus:ring-fuchsia-500" />
                      </div>
                      <div className="ml-3 text-sm">
                          <label htmlFor="creativityMode" className="font-medium text-slate-200">Criatividade Aumentada</label>
                          <p className="text-slate-400 text-xs">Incentiva a IA a gerar ideias mais ousadas e menos convencionais.</p>
                      </div>
                    </div>
                     <div className="relative flex items-start">
                      <div className="flex items-center h-5">
                          <input id="focusMode" type="checkbox" checked={focusMode} onChange={(e) => setFocusMode(e.target.checked)} className="focus:ring-fuchsia-500 h-4 w-4 text-fuchsia-600 border-slate-500 rounded bg-slate-700" />
                      </div>
                      <div className="ml-3 text-sm">
                          <label htmlFor="focusMode" className="font-medium text-slate-200">Foco no Tema</label>
                          <p className="text-slate-400 text-xs">Instrui a IA a se ater estritamente ao tema, sem adicionar informações extras.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        );
    }
  }


  return (
    <form onSubmit={handleSubmit} className="bg-slate-900/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl shadow-black/20 border border-slate-100/10">
      <div className="flex justify-center mb-8 border-b border-slate-700">
          <button type="button" onClick={() => setMode('post')} className={`px-4 py-2 text-sm font-medium transition-colors ${mode === 'post' ? 'border-b-2 border-fuchsia-500 text-white' : 'text-slate-400 hover:text-white'}`}>
              Gerar Post
          </button>
          <button type="button" onClick={() => setMode('video')} className={`px-4 py-2 text-sm font-medium transition-colors ${mode === 'video' ? 'border-b-2 border-fuchsia-500 text-white' : 'text-slate-400 hover:text-white'}`}>
              Gerar Vídeo
          </button>
          <button type="button" onClick={() => setMode('script')} className={`px-4 py-2 text-sm font-medium transition-colors ${mode === 'script' ? 'border-b-2 border-fuchsia-500 text-white' : 'text-slate-400 hover:text-white'}`}>
              Gerar Roteiro
          </button>
           <button type="button" onClick={() => setMode('audio')} className={`px-4 py-2 text-sm font-medium transition-colors ${mode === 'audio' ? 'border-b-2 border-fuchsia-500 text-white' : 'text-slate-400 hover:text-white'}`}>
              Gerar Áudio
          </button>
      </div>

      {renderModeSpecificFields()}

      <div>
        <button
          type="submit"
          disabled={!isFormValid()}
          className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-lg text-base font-bold text-white bg-gradient-to-r from-fuchsia-500 to-cyan-500 hover:from-fuchsia-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-fuchsia-500 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-fuchsia-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
        >
          {isLoading ? <Spinner /> : <SparklesIcon />}
          <span className="ml-2">{isLoading ? 'Gerando...' : 'Amplificar Conteúdo'}</span>
        </button>
      </div>

       <Modal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} title="Gerenciar Perfis de Análise">
        <div className="space-y-6">
            <div>
                <h3 className="text-md font-semibold text-slate-300 mb-3">Perfis Salvos</h3>
                {savedProfiles.length > 0 ? (
                    <ul className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                        {savedProfiles.map(profile => (
                            <li key={profile.url} className="flex items-center justify-between bg-slate-700/50 p-3 rounded-md">
                                <div>
                                    <p className="font-semibold text-slate-200">{profile.name}</p>
                                    <p className="text-xs text-slate-400 truncate max-w-xs">{profile.url}</p>
                                </div>
                                <button
                                    onClick={() => handleDeleteProfile(profile.url)}
                                    className="p-2 rounded-full text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-colors"
                                    aria-label={`Excluir perfil ${profile.name}`}
                                >
                                    <TrashIcon />
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-slate-400 text-center py-4 bg-slate-900/50 rounded-md">Nenhum perfil salvo ainda.</p>
                )}
            </div>

            <div className="pt-6 border-t border-slate-700">
                <h3 className="text-md font-semibold text-slate-300 mb-3">Adicionar Novo Perfil</h3>
                <div className="space-y-4">
                    <input
                        type="text"
                        value={newProfileName}
                        onChange={(e) => setNewProfileName(e.target.value)}
                        placeholder="Nome do Perfil (Ex: Meu Blog)"
                        className="w-full bg-slate-900 border-2 border-slate-600 rounded-xl shadow-sm p-3 focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition"
                    />
                    <input
                        type="url"
                        value={newProfileUrl}
                        onChange={(e) => setNewProfileUrl(e.target.value)}
                        placeholder="URL do Perfil (Ex: https://meublog.com)"
                        className="w-full bg-slate-900 border-2 border-slate-600 rounded-xl shadow-sm p-3 focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition"
                    />
                    {profileError && <p className="text-sm text-red-400">{profileError}</p>}
                    <button
                        onClick={handleAddProfile}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-fuchsia-600 hover:bg-fuchsia-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-fuchsia-500"
                    >
                        Salvar Perfil
                    </button>
                </div>
            </div>
        </div>
    </Modal>
    
     <Modal isOpen={isToneModalOpen} onClose={() => setIsToneModalOpen(false)} title="Gerenciar Perfis de Tom de Voz">
        <div className="space-y-6">
            <div>
                <h3 className="text-md font-semibold text-slate-300 mb-3">Tons de Voz Salvos</h3>
                {savedToneProfiles.length > 0 ? (
                     <ul className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                        {savedToneProfiles.map(profile => (
                            <li key={profile.id} className="flex items-center justify-between bg-slate-700/50 p-3 rounded-md">
                                <div>
                                    <p className="font-semibold text-slate-200">{profile.name}</p>
                                    <p className="text-xs text-slate-400 truncate max-w-xs">{profile.description}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button onClick={() => handleEditToneProfile(profile)} className="text-xs font-semibold text-cyan-400 hover:text-cyan-300">EDITAR</button>
                                    <button
                                        onClick={() => handleDeleteToneProfile(profile.id)}
                                        className="p-2 rounded-full text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-colors"
                                        aria-label={`Excluir tom ${profile.name}`}
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-slate-400 text-center py-4 bg-slate-900/50 rounded-md">Nenhum perfil de tom de voz salvo.</p>
                )}
            </div>

            <div className="pt-6 border-t border-slate-700">
                <h3 className="text-md font-semibold text-slate-300 mb-3">{editingToneProfile ? `Editando "${editingToneProfile.name}"` : 'Adicionar Novo Tom de Voz'}</h3>
                <div className="space-y-4">
                    <input
                        type="text"
                        value={toneFormName}
                        onChange={(e) => setToneFormName(e.target.value)}
                        placeholder="Nome do Tom (Ex: Cético Engraçado)"
                        className="w-full bg-slate-900 border-2 border-slate-600 rounded-xl shadow-sm p-3 focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition"
                    />
                    <textarea
                        value={toneFormDescription}
                        onChange={(e) => setToneFormDescription(e.target.value)}
                        placeholder="Descrição (Ex: Um tom que mistura humor sarcástico com uma visão cética sobre tendências.)"
                        rows={3}
                        className="w-full bg-slate-900 border-2 border-slate-600 rounded-xl shadow-sm p-3 focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition"
                    />
                     <textarea
                        value={toneFormExamples}
                        onChange={(e) => setToneFormExamples(e.target.value)}
                        placeholder={"Exemplos de Frases (uma por linha):\n- 'Sério que essa é a nova moda?'\n- 'Minhas meias velhas têm mais personalidade.'"}
                        rows={4}
                        className="w-full bg-slate-900 border-2 border-slate-600 rounded-xl shadow-sm p-3 focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition"
                    />
                    {toneFormError && <p className="text-sm text-red-400">{toneFormError}</p>}
                    <div className="flex gap-4">
                        {editingToneProfile && (
                            <button
                                type="button"
                                onClick={() => {setEditingToneProfile(null); setToneFormName(''); setToneFormDescription(''); setToneFormExamples('');}}
                                className="w-full flex justify-center py-2 px-4 border border-slate-600 rounded-xl shadow-sm text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 focus:outline-none"
                            >
                                Cancelar Edição
                            </button>
                        )}
                        <button
                            onClick={handleSaveToneProfile}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-fuchsia-600 hover:bg-fuchsia-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-fuchsia-500"
                        >
                            {editingToneProfile ? 'Salvar Alterações' : 'Salvar Novo Tom'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </Modal>
    <Modal isOpen={isTrendModalOpen} onClose={() => setIsTrendModalOpen(false)} title="Caçador de Tendências">
        <div className="space-y-6">
            <div>
                <label htmlFor="trend-keyword" className="block text-sm font-medium text-slate-300 mb-2">
                    Palavra-chave ou Tópico de Interesse
                </label>
                <div className="flex gap-2">
                    <input
                        id="trend-keyword"
                        type="text"
                        value={trendKeyword}
                        onChange={(e) => setTrendKeyword(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSearchTrends(); }}
                        placeholder="Ex: Marketing Digital, IA, Receitas"
                        className="w-full bg-slate-900 border-2 border-slate-600 rounded-xl shadow-sm p-3 focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition"
                    />
                    <button
                        onClick={handleSearchTrends}
                        disabled={isSearchingTrends}
                        className="flex-shrink-0 flex justify-center items-center py-3 px-5 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-fuchsia-600 hover:bg-fuchsia-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-fuchsia-500 disabled:opacity-50"
                    >
                        {isSearchingTrends ? <Spinner /> : 'Buscar'}
                    </button>
                </div>
            </div>

            {isSearchingTrends && (
                <div className="text-center py-8">
                    <Spinner />
                    <p className="mt-2 text-slate-400">Analisando tendências atuais...</p>
                </div>
            )}
            
            {trendSearchError && <p className="text-sm text-red-400">{trendSearchError}</p>}

            {trendingTopics.length > 0 && (
                <div>
                    <h3 className="text-md font-semibold text-slate-300 mb-3">Tópicos em Alta Sugeridos</h3>
                    <ul className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                        {trendingTopics.map((topic, index) => (
                            <li key={index}>
                                <button
                                    onClick={() => handleSelectTrend(topic)}
                                    className="w-full text-left bg-slate-700/50 p-3 rounded-md hover:bg-slate-700 transition-colors text-slate-200"
                                >
                                    {topic}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    </Modal>
    </form>
  );
};