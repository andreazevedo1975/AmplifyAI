import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { InputForm } from './components/InputForm';
import { PostOutput } from './components/PostOutput';
import { VideoOutput } from './components/VideoOutput';
import { ScriptOutput } from './components/ScriptOutput';
import { AudioOutput } from './components/AudioOutput';
import { History } from './components/History';
import { WarningIcon } from './components/icons/WarningIcon';
import { generateImage, generateContentWithSearch, generateVideoScript, generateVideoFromPrompt, generateAudioFromText } from './services/geminiService';
import { decodeAndCreateWavBlob } from './services/audioService';
import { addPost, getAllPosts, deletePost, clearPosts, replaceAllPosts } from './services/dbService';
import { saveHistoryToDrive, loadHistoryFromDrive } from './services/googleDriveService';
import type { PostData, AppError, VideoOutputData, AudioOutputData, DriveStatus } from './types';
import { TestModeFooter } from './components/TestModeFooter';

const App: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<AppError | null>(null);
    const [generatedPost, setGeneratedPost] = useState<PostData | null>(null);
    const [generatedVideo, setGeneratedVideo] = useState<VideoOutputData | null>(null);
    const [generatedScript, setGeneratedScript] = useState<{ title: string, script: string } | null>(null);
    const [generatedAudio, setGeneratedAudio] = useState<AudioOutputData | null>(null);
    const [history, setHistory] = useState<PostData[]>([]);
    const [driveStatus, setDriveStatus] = useState<DriveStatus | null>(null);
    
    const outputRef = useRef<HTMLDivElement>(null);
    const driveStatusTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        const loadHistory = async () => {
            const items = await getAllPosts();
            setHistory(items.sort((a, b) => parseInt(b.id) - parseInt(a.id)));
        };
        loadHistory();
    }, []);

    useEffect(() => {
        if (driveStatus) {
            if (driveStatusTimeoutRef.current) {
                clearTimeout(driveStatusTimeoutRef.current);
            }
            if (driveStatus.type !== 'info') {
                 driveStatusTimeoutRef.current = window.setTimeout(() => {
                    setDriveStatus(null);
                }, 5000);
            }
        }
        return () => {
            if (driveStatusTimeoutRef.current) {
                clearTimeout(driveStatusTimeoutRef.current);
            }
        };
    }, [driveStatus]);


    const scrollToOutput = () => {
        setTimeout(() => {
            outputRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleGenerate = async (options: {
        mode: 'post' | 'video' | 'script' | 'audio';
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
        audioText?: string;
        audioVoice?: string;
        audioEmotion?: string;
        audioStyle?: string;
    }) => {
        setIsLoading(true);
        setError(null);
        setGeneratedPost(null);
        setGeneratedVideo(null);
        setGeneratedScript(null);
        setGeneratedAudio(null);

        try {
            if (options.mode === 'post') {
                if (['YouTube', 'TikTok'].includes(options.platform) && !options.imageInput) {
                    setError({
                        title: 'Sugestão de Funcionalidade',
                        message: `Para plataformas como ${options.platform}, que são focadas em vídeo, um post estático pode não ser a melhor opção.`,
                        suggestion: 'Recomendamos usar as abas "Gerar Vídeo" ou "Gerar Roteiro" para criar um conteúdo com maior potencial de engajamento.'
                    });
                    setIsLoading(false);
                    scrollToOutput();
                    return;
                }
                await handleGeneratePost(options);
            } else if (options.mode === 'video') {
                await handleGenerateVideo(options);
            } else if (options.mode === 'script') {
                await handleGenerateScript(options);
            } else if (options.mode === 'audio') {
                await handleGenerateAudio(options);
            }
        } catch (err) {
            console.error("Generation failed:", err);
            const friendlyError = parseError(err as Error);
            setError(friendlyError);
        } finally {
            setIsLoading(false);
            scrollToOutput();
        }
    };

    const handleGeneratePost = async (options: any) => {
        let imageUrl = '';
        if (options.imageInput) {
            try {
                new URL(options.imageInput);
                imageUrl = options.imageInput;
            } catch (_) {
                imageUrl = await generateImage(options.imageInput, options.platform);
            }
        } else {
            imageUrl = await generateImage(options.theme, options.platform);
        }

        const content = await generateContentWithSearch(
            options.theme,
            options.platform,
            options.profileUrl,
            options.thinkingMode,
            options.creativityMode,
            options.tone,
            options.focusMode
        );

        const newPost: PostData = {
            id: Date.now().toString(),
            theme: options.theme,
            imageUrl,
            caption: content.caption,
            hashtags: content.hashtags,
            platform: options.platform,
            profileUrl: options.profileUrl,
            creativityMode: options.creativityMode,
            thinkingMode: options.thinkingMode,
            focusMode: options.focusMode,
            tone: options.tone,
        };

        setGeneratedPost(newPost);
        await addPost(newPost);
        setHistory(prev => [newPost, ...prev]);
    };
    
    const handleGenerateVideo = async (options: any) => {
        let imagePayload: { base64: string, mimeType: string } | undefined = undefined;
        if (options.imageInput) {
            try {
                 // @ts-ignore
                if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
                    // @ts-ignore
                    const hasKey = await window.aistudio.hasSelectedApiKey();
                    if (!hasKey) {
                        setError({
                            title: 'Chave de API Necessária',
                            message: 'Para gerar um vídeo, você precisa primeiro selecionar uma chave de API.',
                            suggestion: 'A janela de seleção de chave será aberta. Por favor, escolha uma chave habilitada para a "Generative AI API" e tente novamente.'
                        });
                        setTimeout(() => {
                             // @ts-ignore
                            window.aistudio.openSelectKey();
                        }, 2500);
                        return;
                    }
                }

                const response = await fetch(options.imageInput);
                if (!response.ok) {
                    throw new Error(`Falha ao buscar a imagem da URL: ${response.statusText}`);
                }
                const blob = await response.blob();
                const mimeType = blob.type;
                if (!mimeType.startsWith('image/')) {
                    throw new Error(`O arquivo na URL não é uma imagem válida. Tipo encontrado: ${mimeType}`);
                }
                const imageBase64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
                imagePayload = { base64: imageBase64, mimeType };
            } catch (e) {
                const errorMessage = (e instanceof Error) ? e.message : String(e);
                throw new Error(`[VIDEO_GEN_ERROR] Falha ao processar a URL da imagem fornecida. Detalhes: ${errorMessage}`);
            }
        }

        const videoBlob = await generateVideoFromPrompt(options.theme, imagePayload);
        const videoUrl = URL.createObjectURL(videoBlob);
        
        const newVideoOutput: VideoOutputData = {
            url: videoUrl,
            theme: options.theme,
            platform: 'YouTube',
        };

        setGeneratedVideo(newVideoOutput);
    };

    const handleGenerateScript = async (options: any) => {
        const script = await generateVideoScript(options.scriptTitle, options.scriptDescription);
        setGeneratedScript({
            title: options.scriptTitle,
            script: script,
        });
    };

    const handleGenerateAudio = async (options: any) => {
        const base64Audio = await generateAudioFromText(options.audioText, options.audioVoice, options.audioEmotion, options.audioStyle);
        const audioBlob = await decodeAndCreateWavBlob(base64Audio);
        const audioUrl = URL.createObjectURL(audioBlob);

        setGeneratedAudio({
            url: audioUrl,
            text: options.audioText,
            voice: options.audioVoice,
            emotion: options.audioEmotion,
            style: options.audioStyle,
            blob: audioBlob,
        });
    };
    
    const parseError = (err: Error): AppError => {
        const message = err.message || "Ocorreu um erro desconhecido.";
        
        if (message.startsWith('[') && message.includes(']')) {
            const tag = message.substring(1, message.indexOf(']'));
            const cleanMessage = message.substring(message.indexOf(']') + 2);
            switch (tag) {
                case 'SAFETY_BLOCK':
                    return { 
                        title: 'Conteúdo Bloqueado por Segurança', 
                        message: 'Sua solicitação não pôde ser processada porque o conteúdo foi sinalizado como potencialmente sensível ou inseguro pela IA.', 
                        suggestion: 'Tente reformular seu pedido com termos diferentes. Evite linguagem que possa ser interpretada como sensível, imprópria ou odiosa.' 
                    };
                case 'RESOURCE_EXHAUSTED_ERROR':
                    return { 
                        title: 'Serviço Sobrecarregado', 
                        message: 'Nossos servidores de IA estão recebendo um grande volume de solicitações no momento.', 
                        suggestion: 'Isso é temporário. Por favor, aguarde alguns instantes e tente gerar seu conteúdo novamente.' 
                    };
                case 'FORMAT_ERROR':
                    return { 
                        title: 'Erro de Formato da Resposta', 
                        message: 'A IA retornou uma resposta em um formato inesperado e não foi possível processá-la.', 
                        suggestion: 'Isso pode acontecer com temas muito complexos. Tente simplificar seu tema ou prompt para ajudar a IA a estruturar a resposta corretamente.' 
                    };
                 case 'VEO_KEY_ERROR':
                    return { 
                        title: 'Chave de API de Vídeo Inválida', 
                        message: 'A chave de API selecionada não foi encontrada ou não tem permissão para usar a geração de vídeo.', 
                        suggestion: 'Por favor, clique no botão para selecionar uma chave de API válida habilitada para a "Generative AI API" em seu projeto e tente novamente.' 
                    };
                case 'IMAGE_GEN_ERROR':
                case 'CONTENT_GEN_ERROR':
                case 'VIDEO_GEN_ERROR':
                case 'AUDIO_GEN_ERROR':
                     return { 
                        title: 'Falha na Geração', 
                        message: cleanMessage || `Ocorreu um erro ao tentar gerar o conteúdo.`, 
                        suggestion: 'Verifique sua conexão com a internet e tente novamente. Se o problema persistir, o serviço pode estar temporariamente indisponível.' 
                     };
                default:
                    return { 
                        title: 'Erro na Geração', 
                        message: cleanMessage, 
                        suggestion: 'Tente novamente. Se o erro persistir, tente uma abordagem diferente para o seu prompt.' 
                    };
            }
        }
        return { 
            title: 'Erro Inesperado', 
            message, 
            suggestion: 'Ocorreu um problema inesperado. Por favor, tente novamente mais tarde.' 
        };
    };

    const handleSelectHistory = (post: PostData) => {
        setGeneratedPost(post);
        setGeneratedVideo(null);
        setGeneratedScript(null);
        setGeneratedAudio(null);
        setError(null);
        scrollToOutput();
    };

    const handleDeleteHistory = async (id: string) => {
        await deletePost(id);
        setHistory(prev => prev.filter(item => item.id !== id));
        if (generatedPost?.id === id) {
            setGeneratedPost(null);
        }
    };

    const handleClearHistory = async () => {
        if (window.confirm('Tem certeza que deseja apagar todo o histórico? Esta ação não pode ser desfeita.')) {
            await clearPosts();
            setHistory([]);
            setGeneratedPost(null);
        }
    };

    const handleRegenerate = (post: PostData) => {
        const options = {
            mode: 'post' as const,
            theme: post.theme,
            imageInput: post.imageUrl,
            platform: post.platform,
            profileUrl: post.profileUrl,
            thinkingMode: post.thinkingMode || false,
            creativityMode: post.creativityMode || false,
            focusMode: post.focusMode || false,
            tone: post.tone || 'Envolvente',
        };
        handleGenerate(options);
    };

    const handleSaveHistoryToDrive = async () => {
        if (history.length === 0) {
            setDriveStatus({ type: 'info', message: 'Seu histórico está vazio. Nada para salvar.' });
            return;
        }
        setDriveStatus({ type: 'info', message: 'Iniciando o salvamento no Google Drive...' });
        try {
            const fileName = await saveHistoryToDrive(history);
            setDriveStatus({ type: 'success', message: `Histórico salvo como "${fileName}" no seu Google Drive!` });
        } catch (error) {
            console.error("Drive save error:", error);
            const errorMessage = (error instanceof Error) ? error.message : 'Ocorreu um erro desconhecido.';
            setDriveStatus({ type: 'error', message: `Falha ao salvar: ${errorMessage}` });
        }
    };

    const handleLoadHistoryFromDrive = async () => {
        setDriveStatus({ type: 'info', message: 'Aguardando seleção de arquivo no Google Drive...' });
        try {
            const loadedHistory = await loadHistoryFromDrive();
            if (loadedHistory && loadedHistory.length > 0) {
                 if (window.confirm(`Arquivo encontrado com ${loadedHistory.length} posts. Deseja substituir seu histórico local com este conteúdo? Esta ação não pode ser desfeita.`)) {
                    await replaceAllPosts(loadedHistory);
                    const sortedHistory = loadedHistory.sort((a, b) => parseInt(b.id) - parseInt(a.id));
                    setHistory(sortedHistory);
                    setGeneratedPost(null);
                    setDriveStatus({ type: 'success', message: 'Histórico carregado e substituído com sucesso!' });
                } else {
                    setDriveStatus({ type: 'info', message: 'Operação de carregamento cancelada pelo usuário.' });
                }
            } else {
                setDriveStatus({ type: 'info', message: 'Nenhum histórico foi carregado.' });
            }
        } catch (error) {
            console.error("Drive load error:", error);
            const errorMessage = (error instanceof Error) ? error.message : 'Ocorreu um erro desconhecido.';
            setDriveStatus({ type: 'error', message: `Falha ao carregar: ${errorMessage}` });
        }
    };

    return (
        <div className="min-h-screen font-sans pb-16 sm:pb-12">
            <Header />
            <main className="container mx-auto px-4 py-8 md:py-12">
                <div className="max-w-4xl mx-auto space-y-12">
                    <InputForm onGenerate={handleGenerate} isLoading={isLoading} />
                    
                    <div ref={outputRef} className="space-y-8">
                         {error && (
                            <div className={`p-6 rounded-2xl flex items-start space-x-4 animate-fade-in ${error.title === 'Sugestão de Funcionalidade' ? 'bg-blue-900/30 border border-blue-500/50' : 'bg-red-900/30 border border-red-500/50'}`}>
                                <div className={`${error.title === 'Sugestão de Funcionalidade' ? 'text-blue-400' : 'text-red-400'} flex-shrink-0 pt-1`}>
                                     {error.title === 'Sugestão de Funcionalidade' ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                    ) : (
                                        <WarningIcon />
                                    )}
                                </div>
                                <div>
                                    <h3 className={`text-xl font-bold ${error.title === 'Sugestão de Funcionalidade' ? 'text-blue-300' : 'text-red-300'}`}>{error.title}</h3>
                                    <p className={`${error.title === 'Sugestão de Funcionalidade' ? 'text-blue-400' : 'text-red-400'} mt-1`}>{error.message}</p>
                                    {error.suggestion && <p className="text-sm text-slate-300 mt-3"><strong className="font-semibold">{error.title === 'Sugestão de Funcionalidade' ? 'Recomendação:' : 'Sugestão:'}</strong> {error.suggestion}</p>}
                                </div>
                            </div>
                        )}
                        {generatedPost && <PostOutput data={generatedPost} />}
                        {generatedVideo && <VideoOutput data={generatedVideo} />}
                        {generatedScript && <ScriptOutput data={generatedScript} />}
                        {generatedAudio && <AudioOutput data={generatedAudio} />}
                    </div>

                    <History 
                        items={history} 
                        onSelect={handleSelectHistory} 
                        onDelete={handleDeleteHistory} 
                        onRegenerate={handleRegenerate}
                        onClear={handleClearHistory}
                        onSaveToDrive={handleSaveHistoryToDrive}
                        onLoadFromDrive={handleLoadHistoryFromDrive}
                        driveStatus={driveStatus}
                    />
                </div>
            </main>
            <TestModeFooter />
        </div>
    );
};

export default App;