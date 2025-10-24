import React, { useState, useEffect } from 'react';
import type { PostData } from '../types';
import { CopyIcon } from './icons/CopyIcon';
import { SaveIcon } from './icons/SaveIcon';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, ImageRun } from 'docx';
import { PdfIcon } from './icons/PdfIcon';
import { DocxIcon } from './icons/DocxIcon';
import { generateScriptFromPost, suggestImageOptimization } from '../services/geminiService';
import { Spinner } from './Spinner';
import { ScriptIcon } from './icons/ScriptIcon';
import { FilterIcon } from './icons/FilterIcon';


interface PostOutputProps {
  data: PostData;
}

export const PostOutput: React.FC<PostOutputProps> = ({ data }) => {
  const [copied, setCopied] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const [saveButtonText, setSaveButtonText] = useState('Salvar Post');
  const [currentPost, setCurrentPost] = useState<PostData>(data);
  
  // State for script generation
  const [videoScript, setVideoScript] = useState<string | null>(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);

  // State for image filter suggestion
  const [isSuggestingFilter, setIsSuggestingFilter] = useState(false);
  const [filterSuggestion, setFilterSuggestion] = useState<{name: string; description: string} | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [appliedFilter, setAppliedFilter] = useState<string | null>(null);
  
  useEffect(() => {
    setCurrentPost(data);
    // Reset states when new data comes in
    setVideoScript(null);
    setScriptError(null);
    setAppliedFilter(null);
    setFilterSuggestion(null);
    setFilterError(null);
  }, [data]);

  const getCleanThemeForFilename = () => currentPost.theme.substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase();

  const handleCopy = (textToCopy: string, type: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(type);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleSavePost = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveButtonText('Salvando...');

    const fullText = `${currentPost.caption}\n\n${currentPost.hashtags}`;

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
      link.setAttribute('download', `amplifyai-${getCleanThemeForFilename()}.${fileExtension}`);
      
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      await navigator.clipboard.writeText(fullText);

      setSaveButtonText('Salvo! Texto copiado.');

    } catch (error) {
      console.error('Erro ao salvar o post:', error);
      alert('Não foi possível salvar o post. Verifique o console para mais detalhes.');
      setSaveButtonText('Erro ao Salvar');
    } finally {
      setTimeout(() => {
        setIsSaving(false);
        setSaveButtonText('Salvar Post');
      }, 3000);
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
  
  const handleGenerateScript = async () => {
    setIsGeneratingScript(true);
    setScriptError(null);
    setVideoScript(null);
    try {
      const script = await generateScriptFromPost(currentPost.theme, currentPost.caption);
      setVideoScript(script);
    } catch (err) {
      console.error("Script generation from post failed:", err);
      const errorMessage = (err as Error).message.replace(/\[.*?\]\s*/, '');
      setScriptError(errorMessage || "Ocorreu um erro desconhecido ao gerar o roteiro.");
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const filterDescriptions: { [key: string]: string } = {
      vintage: 'Sugestão da IA: aplicar um filtro **Vintage** para um toque nostálgico.',
      vibrant: 'Sugestão da IA: aplicar um filtro **Vibrante** para realçar as cores.',
      cinematic: 'Sugestão da IA: aplicar um filtro **Cinemático** para um visual mais dramático.',
      bw: 'Sugestão da IA: aplicar um filtro **Preto e Branco** para um estilo clássico.',
      dramatic: 'Sugestão da IA: aplicar um filtro **Dramático** com alto contraste.',
      none: 'A IA analisou e concluiu que a imagem já está ótima sem filtros!',
  };

  const handleSuggestFilter = async () => {
    setIsSuggestingFilter(true);
    setFilterError(null);
    setFilterSuggestion(null);
    setAppliedFilter(null);
    try {
      const suggestedFilterName = await suggestImageOptimization(currentPost.theme);
      setFilterSuggestion({
          name: suggestedFilterName,
          description: filterDescriptions[suggestedFilterName] || `Aplicar filtro ${suggestedFilterName}`
      });
    } catch (err) {
      setFilterError((err as Error).message.replace(/\[.*?\]\s*/, ''));
    } finally {
      setIsSuggestingFilter(false);
    }
  };

  const handleApplyFilter = () => {
      if (filterSuggestion) {
          setAppliedFilter(filterSuggestion.name);
          setFilterSuggestion(null);
      }
  };

  const handleRemoveFilter = () => {
      setAppliedFilter(null);
  };

  return (
    <>
        <div className="bg-slate-900/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl shadow-black/20 border border-slate-100/10 animate-fade-in">
            <h2 className="text-2xl font-bold mb-2 text-center bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-cyan-400">Post Gerado para {data.platform}</h2>
            <p className="text-center text-slate-400 mb-6 text-sm">Tema: {data.theme}</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="aspect-square bg-slate-900 rounded-xl overflow-hidden shadow-lg">
                    <img src={currentPost.imageUrl} alt={`Imagem para ${currentPost.theme}`} className={`w-full h-full object-cover image-filter-transition ${appliedFilter ? `filter-${appliedFilter}` : ''}`} />
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
                <h3 className="text-center font-bold text-slate-300 mb-4">Opções de Exportação e Ações</h3>
                <div className="flex flex-wrap justify-center gap-3">
                    <button onClick={handleSavePost} disabled={isSaving} className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full text-slate-200 bg-slate-700/60 hover:bg-slate-700 transition-colors disabled:opacity-50">
                        <SaveIcon /> {saveButtonText}
                    </button>
                     <button onClick={handleDownloadPdf} disabled={isDownloadingPdf} className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full text-slate-200 bg-slate-700/60 hover:bg-slate-700 transition-colors disabled:opacity-50">
                        {isDownloadingPdf ? <Spinner/> : <PdfIcon />} Salvar .pdf
                    </button>
                    <button onClick={handleDownloadDocx} disabled={isDownloadingDocx} className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full text-slate-200 bg-slate-700/60 hover:bg-slate-700 transition-colors disabled:opacity-50">
                        {isDownloadingDocx ? <Spinner/> : <DocxIcon />} Salvar .docx
                    </button>
                     <button
                        onClick={handleGenerateScript}
                        disabled={isGeneratingScript}
                        className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full text-slate-200 bg-yellow-600/30 hover:bg-yellow-600/50 transition-colors disabled:opacity-50 disabled:cursor-wait"
                      >
                        {isGeneratingScript ? <Spinner /> : <ScriptIcon />}
                        {isGeneratingScript ? 'Gerando...' : 'Gerar Roteiro do Post'}
                    </button>
                    {appliedFilter ? (
                      <button onClick={handleRemoveFilter} className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full text-slate-200 bg-red-600/30 hover:bg-red-600/50 transition-colors">
                        <FilterIcon /> Remover Filtro
                      </button>
                    ) : (
                      <button onClick={handleSuggestFilter} disabled={isSuggestingFilter} className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full text-slate-200 bg-cyan-600/30 hover:bg-cyan-600/50 transition-colors disabled:opacity-50 disabled:cursor-wait">
                        {isSuggestingFilter ? <Spinner /> : <FilterIcon />}
                        {isSuggestingFilter ? 'Analisando...' : 'Sugerir Filtro'}
                      </button>
                    )}
                </div>

                {filterSuggestion && (
                  <div className="mt-4 p-4 bg-slate-800 rounded-xl text-center animate-fade-in border border-slate-700">
                      <p className="text-sm text-slate-300" dangerouslySetInnerHTML={{ __html: filterSuggestion.description }} />
                      {filterSuggestion.name !== 'none' && (
                        <div className="flex gap-2 justify-center mt-3">
                            <button onClick={handleApplyFilter} className="text-xs font-semibold px-4 py-2 rounded-full bg-cyan-500 hover:bg-cyan-600 text-white transition-colors">Aplicar Filtro</button>
                            <button onClick={() => setFilterSuggestion(null)} className="text-xs font-semibold px-4 py-2 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors">Cancelar</button>
                        </div>
                      )}
                  </div>
                )}
                 {filterError && (
                    <div className="mt-4 p-3 bg-red-900/30 border border-red-500/50 rounded-xl text-center animate-fade-in">
                        <p className="text-sm text-red-400">{filterError}</p>
                    </div>
                )}
            </div>
        </div>
        
        {isGeneratingScript && (
          <div className="mt-8 text-center animate-fade-in">
            <div className="flex justify-center"><Spinner /></div>
            <p className="text-slate-400 mt-2">Gerando roteiro de vídeo, por favor aguarde...</p>
          </div>
        )}
        {scriptError && (
            <div className="mt-8 p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-center animate-fade-in">
                <p className="font-bold text-red-300">Erro ao Gerar Roteiro</p>
                <p className="text-sm text-red-400 mt-1">{scriptError}</p>
            </div>
        )}
        {videoScript && (
            <div className="mt-8 bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-yellow-300">Roteiro de Vídeo Gerado</h3>
                    <button
                        onClick={() => handleCopy(videoScript, 'script')}
                        className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full text-slate-300 bg-slate-700/50 hover:bg-slate-700 hover:text-white transition-all duration-200"
                    >
                        <CopyIcon />
                        <span>{copied === 'script' ? 'Copiado!' : 'Copiar Roteiro'}</span>
                    </button>
                </div>
                <div className="bg-slate-900/70 p-4 rounded-xl max-h-80 overflow-y-auto custom-scrollbar">
                    <p className="text-slate-200 whitespace-pre-wrap">{videoScript}</p>
                </div>
            </div>
        )}
    </>
  );
};