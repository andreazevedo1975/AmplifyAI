import React, { useState, useEffect } from 'react';
import type { PostData } from '../types';
import { CopyIcon } from './icons/CopyIcon';
import { SaveIcon } from './icons/SaveIcon';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, ImageRun } from 'docx';
import { PdfIcon } from './icons/PdfIcon';
import { DocxIcon } from './icons/DocxIcon';
import { suggestHashtags, generateVideoScript, generateMultiplePostVariations } from '../services/geminiService';
import { SparklesIcon } from './icons/SparklesIcon';
import { Spinner } from './Spinner';

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
  
  useEffect(() => {
    setCurrentPost(data);
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

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl shadow-black/20 border border-slate-100/10 animate-fade-in">
        <h2 className="text-2xl font-bold mb-2 text-center bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-cyan-400">Post Gerado para {data.platform}</h2>
        <p className="text-center text-slate-400 mb-6 text-sm">Tema: {data.theme}</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="aspect-square bg-slate-900 rounded-xl overflow-hidden shadow-lg">
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
            </div>
        </div>

    </div>
  );
};
