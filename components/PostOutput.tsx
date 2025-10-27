import React, { useState, useEffect } from 'react';
import type { PostData } from '../types';
import { CopyIcon } from './icons/CopyIcon';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, ImageRun } from 'docx';
import { PdfIcon } from './icons/PdfIcon';
import { DocxIcon } from './icons/DocxIcon';
import { suggestHashtags, generateScriptFromPost, generateMultiplePostVariations } from '../services/geminiService';
import { SparklesIcon } from './icons/SparklesIcon';
import { Spinner } from './Spinner';
import { HashtagIcon } from './icons/HashtagIcon';
import { ScriptIcon } from './icons/ScriptIcon';
import { RegenerateIcon } from './icons/RegenerateIcon';
import { UseIcon } from './icons/UseIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ImageIcon } from './icons/ImageIcon';

interface PostOutputProps {
  data: PostData;
  onUpdate: (updatedPost: PostData) => void;
}

export const PostOutput: React.FC<PostOutputProps> = ({ data, onUpdate }) => {
  const [copied, setCopied] = useState('');
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  
  const [suggestedHashtags, setSuggestedHashtags] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  
  const [videoScript, setVideoScript] = useState<string | null>(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);

  const [currentPost, setCurrentPost] = useState<PostData>(data);
  const [variations, setVariations] = useState<{ caption: string; hashtags: string }[] | null>(null);
  const [isGeneratingVariations, setIsGeneratingVariations] = useState<boolean>(false);
  const [variationsError, setVariationsError] = useState<string | null>(null);
  
  useEffect(() => {
    setCurrentPost(data);
    setVariations(null);
    setVariationsError(null);
    setSuggestedHashtags([]);
    setSuggestionError(null);
    setVideoScript(null);
    setScriptError(null);
  }, [data]);

  const getCleanThemeForFilename = () => currentPost.theme.substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase();

  const handleCopy = (textToCopy: string, type: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(type);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleCopyFullText = () => {
    const fullText = `${currentPost.caption}\n\n${currentPost.hashtags}`;
    handleCopy(fullText, 'full_text');
  };

  const handleDownloadImage = async () => {
    if (isDownloadingImage) return;
    setIsDownloadingImage(true);
    try {
        const response = await fetch(currentPost.imageUrl);
        if (!response.ok) {
            throw new Error(`Falha ao buscar imagem: ${response.statusText}`);
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const fileExtension = blob.type.split('/')[1] || 'jpeg';
        link.setAttribute('download', `amplifyai-img-${getCleanThemeForFilename()}.${fileExtension}`);
        
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Erro ao baixar a imagem:', error);
        alert('Não foi possível baixar a imagem. Verifique o console para mais detalhes.');
    } finally {
        setIsDownloadingImage(false);
    }
  };


  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
        const doc = new jsPDF();
        const page_width = doc.internal.pageSize.getWidth();
        const margin = 15;
        const max_width = page_width - margin * 2;
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text("Post Gerado por AmplifyAI", page_width / 2, 20, { align: 'center' });

        doc.setFontSize(14);
        doc.text(`Tema: ${currentPost.theme}`, margin, 35);
        
        const response = await fetch(currentPost.imageUrl);
        const blob = await response.blob();
        const imgData = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
        
        const imgProps = doc.getImageProperties(imgData);
        const imgRatio = imgProps.width / imgProps.height;
        let imgWidth = max_width;
        let imgHeight = imgWidth / imgRatio;

        if (imgHeight > 100) {
            imgHeight = 100;
            imgWidth = imgHeight * imgRatio;
        }

        doc.addImage(imgData, 'JPEG', margin, 45, imgWidth, imgHeight);
        let currentY = 45 + imgHeight + 15;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text("Legenda:", margin, currentY);
        currentY += 7;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        const captionLines = doc.splitTextToSize(currentPost.caption, max_width);
        doc.text(captionLines, margin, currentY);
        currentY += (captionLines.length * 5) + 10;
        
        if (currentPost.hashtags) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text("Hashtags:", margin, currentY);
            currentY += 7;

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 102, 204);
            const hashtagLines = doc.splitTextToSize(currentPost.hashtags, max_width);
            doc.text(hashtagLines, margin, currentY);
        }

        doc.save(`amplifyai-${getCleanThemeForFilename()}.pdf`);

    } catch(e) {
        console.error("Error generating PDF:", e);
        alert("Falha ao gerar o PDF.");
    } finally {
        setIsDownloadingPdf(false);
    }
  };

  const handleDownloadDocx = async () => {
    setIsDownloadingDocx(true);
    try {
      const response = await fetch(currentPost.imageUrl);
      const imageBuffer = await response.arrayBuffer();
      
      const getImageDimensions = (buffer: ArrayBuffer): Promise<{width: number; height: number}> => {
        return new Promise((resolve) => {
          const blob = new Blob([buffer]);
          const img = new Image();
          img.src = URL.createObjectURL(blob);
          img.onload = () => {
            resolve({width: img.width, height: img.height});
            URL.revokeObjectURL(img.src);
          };
        });
      };
      
      const {width, height} = await getImageDimensions(imageBuffer);
      const ratio = width/height;
      const docxWidth = 600;
      const docxHeight = docxWidth / ratio;

      const children = [
          new Paragraph({
            children: [new TextRun({ text: "Post Gerado por AmplifyAI", bold: true, size: 36 })],
            alignment: 'center',
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [new TextRun({ text: "Tema: ", bold: true, size: 28 }), new TextRun({ text: currentPost.theme, size: 28 })],
          }),
           new Paragraph({ text: "" }),
          new Paragraph({
            children: [new ImageRun({
              data: imageBuffer,
              transformation: { width: docxWidth, height: docxHeight },
            })],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({ children: [new TextRun({ text: "Legenda", bold: true, size: 24 })] }),
          ...currentPost.caption.split('\n').map(line => new Paragraph({ text: line })),
      ];

      if (currentPost.hashtags) {
          children.push(new Paragraph({ text: "" }));
          children.push(new Paragraph({ children: [new TextRun({ text: "Hashtags", bold: true, size: 24 })] }));
          children.push(new Paragraph({ children: [new TextRun({ text: currentPost.hashtags, color: "0066CC" })] }));
      }

      const doc = new Document({
        sections: [{ children }],
      });

      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `amplifyai-${getCleanThemeForFilename()}.docx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch(e) {
      console.error("Error generating DOCX:", e);
      alert("Falha ao gerar o DOCX.");
    } finally {
      setIsDownloadingDocx(false);
    }
  };

  const handleSuggestHashtags = async () => {
    setIsSuggesting(true);
    setSuggestionError(null);
    try {
        const suggestions = await suggestHashtags(currentPost.hashtags, currentPost.platform);
        setSuggestedHashtags(suggestions);
    } catch (e) {
        setSuggestionError((e as Error).message || "Falha ao buscar sugestões.");
    } finally {
        setIsSuggesting(false);
    }
  };

  const handleGenerateScriptFromPost = async () => {
      setIsGeneratingScript(true);
      setScriptError(null);
      try {
          const script = await generateScriptFromPost(currentPost.theme, currentPost.caption);
          setVideoScript(script);
      } catch (e) {
          setScriptError((e as Error).message || "Falha ao gerar o roteiro.");
      } finally {
          setIsGeneratingScript(false);
      }
  };

   const handleGenerateVariations = async () => {
    setIsGeneratingVariations(true);
    setVariationsError(null);
    try {
      const result = await generateMultiplePostVariations(currentPost.theme, currentPost.platform, currentPost.tone || 'Envolvente', currentPost.caption);
      setVariations(result);
    } catch (e) {
      setVariationsError((e as Error).message || "Falha ao gerar variações.");
    } finally {
      setIsGeneratingVariations(false);
    }
  };

  const handleUseVariation = (variation: { caption: string; hashtags: string }) => {
    const updatedPost = { ...currentPost, ...variation };
    setCurrentPost(updatedPost);
    onUpdate(updatedPost);
    setVariations(null); // Hide variations after selecting one
  };


  return (
    <div className="bg-slate-900/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl shadow-black/20 border border-slate-100/10 animate-fade-in">
        <h2 className="text-2xl font-bold mb-2 text-center bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-cyan-400">Post Gerado para {currentPost.platform}</h2>
        <p className="text-center text-slate-400 mb-6 text-sm">Tema: {currentPost.theme}</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div id="post-visual" className="aspect-square bg-slate-900 rounded-xl overflow-hidden shadow-lg">
                <img src={currentPost.imageUrl} alt={`Imagem para ${currentPost.theme}`} className="w-full h-full object-cover" />
            </div>

            <div className="flex flex-col space-y-4 h-full">
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Legenda</h3>
                        <button onClick={() => handleCopy(currentPost.caption, 'caption')} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full text-slate-300 bg-slate-700/50 hover:bg-slate-700 hover:text-white transition-all duration-200">
                           <CopyIcon /> {copied === 'caption' ? 'Copiado!' : 'Copiar'}
                        </button>
                    </div>
                    <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-700/50 max-h-60 overflow-y-auto custom-scrollbar">
                        <p className="text-slate-200 whitespace-pre-wrap">{currentPost.caption}</p>
                    </div>
                </div>

                 <div>
                    <div className="flex justify-between items-center mb-2">
                         <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Hashtags</h3>
                         <button onClick={() => handleCopy(currentPost.hashtags, 'hashtags')} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full text-slate-300 bg-slate-700/50 hover:bg-slate-700 hover:text-white transition-all duration-200">
                           <CopyIcon /> {copied === 'hashtags' ? 'Copiado!' : 'Copiar'}
                         </button>
                    </div>
                     <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-700/50">
                        <p className="text-fuchsia-400 break-words">{currentPost.hashtags}</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-slate-700/50">
            <h3 className="text-center font-bold text-slate-300 mb-4">Ações e Otimizações com IA</h3>
            <div className="flex flex-wrap justify-center gap-3">
                 <button onClick={handleSuggestHashtags} disabled={isSuggesting} className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full text-slate-200 bg-slate-700/60 hover:bg-slate-700 transition-colors disabled:opacity-50">
                    {isSuggesting ? <Spinner/> : <HashtagIcon />} Sugerir Hashtags
                </button>
                <button onClick={handleGenerateScriptFromPost} disabled={isGeneratingScript} className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full text-slate-200 bg-slate-700/60 hover:bg-slate-700 transition-colors disabled:opacity-50">
                    {isGeneratingScript ? <Spinner/> : <ScriptIcon />} Gerar Roteiro do Post
                </button>
                 <button onClick={handleGenerateVariations} disabled={isGeneratingVariations} className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full text-slate-200 bg-slate-700/60 hover:bg-slate-700 transition-colors disabled:opacity-50">
                    {isGeneratingVariations ? <Spinner /> : <RegenerateIcon />} Gerar Variações
                </button>
            </div>
        </div>

        {suggestedHashtags.length > 0 && (
            <div className="mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700 animate-fade-in">
                <h4 className="font-bold text-slate-300 mb-3">Hashtags Sugeridas</h4>
                <p className="text-fuchsia-400 text-sm break-words">{suggestedHashtags.join(' ')}</p>
                <div className="flex gap-2 mt-4">
                    <button onClick={() => handleCopy(currentPost.hashtags + ' ' + suggestedHashtags.join(' '), 'all_hashtags')} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full text-slate-300 bg-slate-700/50 hover:bg-slate-700 hover:text-white transition-all duration-200">
                        <CopyIcon /> {copied === 'all_hashtags' ? 'Copiado!' : 'Copiar Todas'}
                    </button>
                    <button onClick={() => handleCopy(suggestedHashtags.join(' '), 'new_hashtags')} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full text-slate-300 bg-slate-700/50 hover:bg-slate-700 hover:text-white transition-all duration-200">
                        <CopyIcon /> {copied === 'new_hashtags' ? 'Copiado!' : 'Copiar Novas'}
                    </button>
                </div>
            </div>
        )}
        {suggestionError && <p className="text-center text-red-400 text-sm mt-2">{suggestionError}</p>}

        {videoScript && (
             <div className="mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700 animate-fade-in">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-slate-300">Roteiro para Vídeo Curto</h4>
                    <button onClick={() => handleCopy(videoScript, 'script')} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full text-slate-300 bg-slate-700/50 hover:bg-slate-700 hover:text-white transition-all duration-200">
                        <CopyIcon /> {copied === 'script' ? 'Copiado!' : 'Copiar Roteiro'}
                    </button>
                </div>
                <div className="bg-slate-900/70 p-3 rounded-lg max-h-60 overflow-y-auto custom-scrollbar">
                    <p className="text-slate-200 text-sm whitespace-pre-wrap">{videoScript}</p>
                </div>
            </div>
        )}
        {scriptError && <p className="text-center text-red-400 text-sm mt-2">{scriptError}</p>}

        {variations && (
          <div className="mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700 animate-fade-in">
            <h4 className="font-bold text-slate-300 mb-3">Variações Sugeridas</h4>
            <div className="space-y-4">
              {variations.map((v, i) => (
                <div key={i} className="bg-slate-900/70 p-3 rounded-lg">
                  <p className="text-slate-200 text-sm whitespace-pre-wrap">{v.caption}</p>
                  <p className="text-fuchsia-400 text-xs break-words mt-2">{v.hashtags}</p>
                  <button onClick={() => handleUseVariation(v)} className="mt-3 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full text-slate-300 bg-slate-700/50 hover:bg-slate-700 hover:text-white transition-all duration-200">
                    <UseIcon /> Usar esta Variação
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {variationsError && <p className="text-center text-red-400 text-sm mt-2">{variationsError}</p>}
        
        <div className="mt-8 pt-6 border-t border-slate-700/50">
            <h3 className="text-center font-bold text-slate-300 mb-4">Opções de Exportação</h3>
            <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={handleCopyFullText}
                  className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full transition-colors ${
                    copied === 'full_text'
                      ? 'bg-green-500/20 text-green-300'
                      : 'text-slate-200 bg-slate-700/60 hover:bg-slate-700'
                  }`}
                >
                  {copied === 'full_text' ? <CheckCircleIcon className="w-5 h-5" /> : <CopyIcon className="w-5 h-5" />}
                  {copied === 'full_text' ? 'Copiado!' : 'Copiar Texto'}
                </button>
                <button onClick={handleDownloadImage} disabled={isDownloadingImage} className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full text-slate-200 bg-slate-700/60 hover:bg-slate-700 transition-colors disabled:opacity-50">
                    {isDownloadingImage ? <Spinner/> : <ImageIcon />} {isDownloadingImage ? 'Baixando...' : 'Baixar Imagem'}
                </button>
                 <button onClick={handleDownloadPdf} disabled={isDownloadingPdf} className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full text-slate-200 bg-slate-700/60 hover:bg-slate-700 transition-colors disabled:opacity-50">
                    {isDownloadingPdf ? <Spinner/> : <PdfIcon />} {isDownloadingPdf ? 'Salvando...' : 'Salvar .pdf'}
                </button>
                <button onClick={handleDownloadDocx} disabled={isDownloadingDocx} className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full text-slate-200 bg-slate-700/60 hover:bg-slate-700 transition-colors disabled:opacity-50">
                    {isDownloadingDocx ? <Spinner/> : <DocxIcon />} {isDownloadingDocx ? 'Salvando...' : 'Salvar .docx'}
                </button>
            </div>
        </div>
    </div>
  );
};