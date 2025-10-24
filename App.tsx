import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { InputForm } from './components/InputForm';
import { PostOutput } from './components/PostOutput';
import { Spinner } from './components/Spinner';
import { generateContentWithSearch, generateImage, generateVideoFromPrompt } from './services/geminiService';
import { addPost, getAllPosts, deletePost, clearPosts } from './services/dbService';
import type { PostData, AppError } from './types';
import { WarningIcon } from './components/icons/WarningIcon';
import { History } from './components/History';
import { VideoOutput } from './components/VideoOutput';

// Helper to convert any image URL (including data URLs) to a base64 string without prefix
async function imageUrlToBase64(url: string): Promise<string> {
    if (url.startsWith('data:')) {
        return url.split(',')[1];
    }
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}


const App: React.FC = () => {
  const [postData, setPostData] = useState<PostData | null>(null);
  const [videoOutput, setVideoOutput] = useState<{ url: string; theme: string } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<AppError | null>(null);
  const [history, setHistory] = useState<PostData[]>([]);

  // Load history from IndexedDB on initial render
  useEffect(() => {
    getAllPosts().then(posts => {
      // Reverse to show newest first
      setHistory(posts.reverse());
    }).catch(error => {
      console.error("Failed to load history from DB", error);
      setHistory([]);
    });
  }, []);
  
  const isUrl = (text: string): boolean => {
    try {
      new URL(text);
      return true;
    } catch (_) {
      return false;
    }
  };
  
  const handleError = (err: unknown) => {
    console.error(err);
    const errorObject: AppError = {
        title: "Oops! Algo deu errado.",
        message: "Ocorreu um erro desconhecido. Por favor, tente novamente mais tarde.",
        suggestion: "Verifique sua conexão com a internet ou tente simplificar sua solicitação."
    };

    if (err instanceof Error) {
        const msg = err.message;
        if (msg.includes("[FORMAT_ERROR]")) {
            errorObject.title = "Resposta Inesperada da IA";
            errorObject.message = "A inteligência artificial retornou dados em um formato ou com conteúdo incompleto que o aplicativo não conseguiu entender.";
            errorObject.suggestion = "Isso pode acontecer com temas muito complexos ou ambíguos. Tente refinar ou simplificar o tema do seu post.";
        } else if (msg.includes("[RESOURCE_EXHAUSTED_ERROR]")) {
            errorObject.title = "Serviço Temporariamente Indisponível";
            errorObject.message = "A IA está com alta demanda no momento e não conseguiu processar sua solicitação.";
            errorObject.suggestion = "Isso é temporário. Por favor, aguarde um momento e tente gerar o post novamente.";
        } else if (msg.includes("[IMAGE_GEN_ERROR]")) {
            errorObject.title = "Falha na Geração de Imagem";
            errorObject.message = "Não foi possível criar a imagem solicitada com base no seu prompt ou URL.";
            errorObject.suggestion = "Tente alterar o prompt da imagem. Se o erro persistir, verifique se o conteúdo não viola as políticas de segurança da IA.";
        } else if (msg.includes("[CONTENT_GEN_ERROR]")) {
            errorObject.title = "Falha na Geração de Conteúdo";
            errorObject.message = "Não foi possível criar a legenda e as hashtags para o tema proposto.";
            errorObject.suggestion = "Tente novamente. Se o erro persistir, o serviço da IA pode estar temporariamente indisponível.";
        } else if (msg.includes('[SAFETY_BLOCK]')) {
            errorObject.title = "Conteúdo Bloqueado por Segurança";
            errorObject.message = "Sua solicitação não pôde ser concluída pois o conteúdo foi considerado inadequado pelas políticas de segurança da IA.";
            errorObject.suggestion = "Por favor, reformule seu tema e/ou prompt de imagem para estar de acordo com as diretrizes de uso e evite tópicos sensíveis.";
        } else if (msg.includes('[VEO_KEY_ERROR]')) {
            errorObject.title = "Chave de API Inválida para Vídeo";
            errorObject.message = "A chave de API selecionada não tem permissão para usar o serviço de vídeo ou não foi encontrada.";
            errorObject.suggestion = "A janela de seleção foi reaberta. Por favor, escolha uma chave habilitada para a 'Generative AI API' em seu projeto Google Cloud e tente novamente.";
            // Proactively open the key selection dialog to streamline the user's recovery path.
            // @ts-ignore
            if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
                // @ts-ignore
                window.aistudio.openSelectKey();
            }
        } else if (msg.toLowerCase().includes('api key') || msg.toLowerCase().includes('authentication')) {
            errorObject.title = "Erro de Configuração";
            errorObject.message = "Não foi possível conectar ao serviço de IA devido a um problema de autenticação.";
            errorObject.suggestion = "Este é um problema técnico do aplicativo. Por favor, tente novamente mais tarde. Se o problema persistir, o serviço pode estar em manutenção.";
        } else {
            errorObject.message = err.message;
        }
    }
    setError(errorObject);
  }

  const handleGeneratePost = async (theme: string, imageInput: string, platform: string, profileUrl: string, thinkingMode: boolean, creativityMode: boolean, tone: string) => {
    setIsThinking(thinkingMode);
    setLoadingMessage(thinkingMode
        ? "A IA está em modo de análise profunda... isso pode levar mais tempo."
        : "A IA está gerando sua imagem e texto... isso pode levar um momento."
      );

    try {
      let imageUrl = '';

      if (imageInput && isUrl(imageInput)) {
        imageUrl = imageInput;
      } else {
        // The imageInput is a prompt (either user-provided or the default generated in InputForm).
        // InputForm now guarantees a prompt is provided if a text-to-image generation is intended.
        imageUrl = await generateImage(imageInput, platform);
      }
      
      const content = await generateContentWithSearch(theme, platform, profileUrl, thinkingMode, creativityMode, tone);

      const newPost: PostData = {
        id: Date.now().toString(),
        theme,
        imageUrl,
        caption: content.caption,
        hashtags: content.hashtags,
        platform,
        profileUrl,
        thinkingMode,
        creativityMode,
        tone,
      };

      await addPost(newPost);
      setPostData(newPost);
      setHistory(prevHistory => [newPost, ...prevHistory]);
      
    } catch (err) {
      handleError(err);
    }
  };
  
  const handleGenerateVideo = async (theme: string, imageInput: string) => {
      // @ts-ignore
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        // @ts-ignore
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
            // @ts-ignore
            await window.aistudio.openSelectKey();
        }
    }
    
    setLoadingMessage("IA está gerando seu vídeo... isso pode levar alguns minutos.");

    try {
        let imageBase64: string | undefined = undefined;
        if (imageInput && isUrl(imageInput)) {
            imageBase64 = await imageUrlToBase64(imageInput);
        }

        const videoBlob = await generateVideoFromPrompt(theme, imageBase64);
        const videoUrl = URL.createObjectURL(videoBlob);
        setVideoOutput({ url: videoUrl, theme });

    } catch (err) {
        handleError(err);
    }
  }

  const handleGenerate = async (theme: string, imageInput: string, platform: string, profileUrl: string, thinkingMode: boolean, creativityMode: boolean, tone: string) => {
    setIsLoading(true);
    setError(null);
    setPostData(null);
    setVideoOutput(null);

    if (platform === 'video') {
      await handleGenerateVideo(theme, imageInput);
    } else {
      await handleGeneratePost(theme, imageInput, platform, profileUrl, thinkingMode, creativityMode, tone);
    }
    
    setIsLoading(false);
    setIsThinking(false);
    setLoadingMessage('');
  };

  const handleSelectHistoryItem = (post: PostData) => {
    setPostData(post);
    setError(null);
    setVideoOutput(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteHistoryItem = (idToDelete: string) => {
    deletePost(idToDelete).then(() => {
      setHistory(prevHistory => prevHistory.filter(p => p.id !== idToDelete));
    }).catch(error => {
      console.error("Failed to delete post from DB", error);
    });
  };

  const handleRegenerateHistoryItem = (post: PostData) => {
    handleGenerate(post.theme, '', post.platform, post.profileUrl, post.thinkingMode || false, post.creativityMode || false, post.tone || 'Envolvente');
  };

  const handleClearHistory = () => {
    clearPosts().then(() => {
      setHistory([]);
    }).catch(error => {
      console.error("Failed to clear history from DB", error);
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col">
      <Header />
      <main className="container mx-auto px-4 py-12 flex-grow">
        <div className="max-w-3xl mx-auto">
          <p className="text-center text-lg text-slate-400 mb-8">
            Descreva sua ideia e deixe a IA criar um post completo, com imagem e texto, pronto para viralizar.
          </p>
          <InputForm onGenerate={handleGenerate} isLoading={isLoading} />

          {isLoading && (
            <div className="mt-12 flex flex-col items-center justify-center">
              <Spinner />
              <p className="mt-4 text-slate-300 animate-pulse text-center">
                {loadingMessage}
              </p>
            </div>
          )}

          {error && (
             <div className="mt-12 p-5 bg-red-900/50 border border-red-700 rounded-lg text-red-300 animate-fade-in">
                <div className="flex items-center gap-3">
                    <WarningIcon />
                    <h3 className="font-bold text-lg text-red-200">{error.title}</h3>
                </div>
                <p className="mt-2 pl-9 text-red-300">{error.message}</p>
                {error.suggestion && (
                    <div className="mt-4 pl-9">
                      <div className="bg-red-800/50 p-3 rounded-md border border-red-700/50 text-red-200">
                        <p className="text-sm "><strong className="font-semibold">Sugestão:</strong> {error.suggestion}</p>
                      </div>
                    </div>
                )}
            </div>
          )}

          {postData && !isLoading && (
            <div className="mt-12">
              <PostOutput data={postData} />
            </div>
          )}

          {videoOutput && !isLoading && (
            <div className="mt-12">
              <VideoOutput data={videoOutput} />
            </div>
          )}
        </div>
        
        {/* History section is now outside the max-width container to allow it to be wider */}
        <div className="mt-12">
          <History 
              items={history}
              onSelect={handleSelectHistoryItem}
              onDelete={handleDeleteHistoryItem}
              onRegenerate={handleRegenerateHistoryItem}
              onClear={handleClearHistory}
          />
        </div>

      </main>
      <footer className="text-center py-4 text-sm text-slate-600">
        <p>Copyright © {new Date().getFullYear()} by André Azevedo. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default App;