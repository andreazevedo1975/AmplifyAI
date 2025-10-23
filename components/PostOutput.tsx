import React, { useState } from 'react';
import type { PostData } from '../types';
import { CopyIcon } from './icons/CopyIcon';
import { SaveIcon } from './icons/SaveIcon';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, ImageRun } from 'docx';
import { PdfIcon } from './icons/PdfIcon';
import { DocxIcon } from './icons/DocxIcon';


interface PostOutputProps {
  data: PostData;
}

export const PostOutput: React.FC<PostOutputProps> = ({ data }) => {
  const [copied, setCopied] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [saveButtonText, setSaveButtonText] = useState('Salvar Post');
  const isExternalUrl = data.imageUrl.startsWith('http');

  const getCleanThemeForFilename = () => data.theme.substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase();

  const handleCopy = (textToCopy: string, type: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(type);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleSavePost = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveButtonText('Salvando...');

    const fullText = `${data.caption}\n\n${data.hashtags}`;

    try {
      // 1. Download Image
      const response = await fetch(data.imageUrl);
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

      // 2. Copy Text
      await navigator.clipboard.writeText(fullText);

      // 3. Update UI
      setSaveButtonText('Salvo! Texto copiado.');

    } catch (error) {
      console.error('Erro ao salvar o post:', error);
      alert('Não foi possível salvar o post. Verifique o console para mais detalhes.');
      setSaveButtonText('Erro ao Salvar');
    } finally {
       // 4. Reset button after a delay
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
        
        // --- Title ---
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text("Post Gerado por AmplifyAI", page_width / 2, 20, { align: 'center' });

        // --- Theme ---
        doc.setFontSize(14);
        doc.text(`Tema: ${data.theme}`, margin, 35);
        
        // --- Image ---
        const response = await fetch(data.imageUrl);
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

        // --- Caption ---
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text("Legenda:", margin, currentY);
        currentY += 7;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        const captionLines = doc.splitTextToSize(data.caption, max_width);
        doc.text(captionLines, margin, currentY);
        currentY += (captionLines.length * 5) + 10;
        
        // --- Hashtags ---
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text("Hashtags:", margin, currentY);
        currentY += 7;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 102, 204); // Blue color for hashtags
        const hashtagLines = doc.splitTextToSize(data.hashtags, max_width);
        doc.text(hashtagLines, margin, currentY);

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
      const response = await fetch(data.imageUrl);
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


      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Post Gerado por AmplifyAI", bold: true, size: 36 })],
              alignment: 'center',
            }),
            new Paragraph({ text: "" }), // spacing
            new Paragraph({
              children: [new TextRun({ text: "Tema: ", bold: true, size: 28 }), new TextRun({ text: data.theme, size: 28 })],
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
            ...data.caption.split('\n').map(line => new Paragraph({ text: line })),
            new Paragraph({ text: "" }),
            new Paragraph({ children: [new TextRun({ text: "Hashtags", bold: true, size: 24 })] }),
            new Paragraph({ children: [new TextRun({ text: data.hashtags, color: "0066CC" })] }),
          ],
        }],
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

  const handlePost = () => {
    if (isSharing) return;
    setIsSharing(true);
  
    const textToShare = `${data.caption}\n\n${data.hashtags}`;
  
    // Inner async function to handle the core logic and return a status
    const attemptShare = async (): Promise<'SHARED' | 'CANCELLED' | 'FALLBACK'> => {
      try {
        const response = await fetch(data.imageUrl);
        if (!response.ok) throw new Error('Image fetch failed');
        const blob = await response.blob();
        const file = new File([blob], `amplifyai-image.${blob.type.split('/')[1] || 'jpg'}`, { type: blob.type });
  
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: data.theme,
            text: textToShare,
          });
          return 'SHARED'; // Share was successful
        }
        return 'FALLBACK'; // Share API not supported
      } catch (err) {
        if (err.name === 'AbortError') {
          console.log('Share was cancelled by the user.');
          return 'CANCELLED'; // User explicitly cancelled the share
        }
        console.error('Web Share API failed:', err);
        return 'FALLBACK'; // Any other error should trigger the fallback
      }
    };
  
    attemptShare().then(status => {
      if (status === 'FALLBACK') {
        // Inform user and copy text before redirecting
        navigator.clipboard.writeText(textToShare);
        alert(`Seu navegador não suporta compartilhamento direto ou ocorreu um erro.\n\nO texto do post foi copiado para sua área de transferência para facilitar!\n\nRedirecionando para ${data.platform}...`);
  
        const platformUrls: { [key: string]: string } = {
          'Instagram': 'https://www.instagram.com/',
          'Facebook': 'https://www.facebook.com/',
          'LinkedIn': 'https://www.linkedin.com/feed/',
          'Twitter (X)': 'https://twitter.com/intent/tweet',
          'TikTok': 'https://www.tiktok.com/',
          'Pinterest': 'https://www.pinterest.com/',
        };
        let url = data.profileUrl || platformUrls[data.platform] || '#';
        if (data.platform === 'Twitter (X)') {
          url = `${platformUrls['Twitter (X)']}?text=${encodeURIComponent(textToShare)}`;
        }
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      
      // For 'SHARED' or 'CANCELLED', the process is complete.
      setIsSharing(false);
    });
  };

  return (
    <div className="bg-slate-800/60 p-6 rounded-lg shadow-lg border border-slate-700 animate-fade-in">
      <h2 className="text-xl font-bold mb-6 text-fuchsia-300 text-center">Seu post para {data.platform} está pronto para ser amplificado!</h2>
      
      {/* Theme Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-300 mb-2">TEMA PROPOSTO</h3>
        <div className="bg-slate-900/50 p-4 rounded-md border border-slate-700/50">
          <p className="text-slate-200">{data.theme}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Image Column */}
        <div className="flex flex-col">
          <h3 className="text-lg font-semibold mb-2 text-slate-300">IMAGEM / LINK</h3>
          {isExternalUrl ? (
            <a href={data.imageUrl} target="_blank" rel="noopener noreferrer" aria-label="Abrir link da imagem externa" title="Ver imagem original">
              <div className="aspect-square bg-slate-900 rounded-md overflow-hidden shadow-inner relative group cursor-pointer">
                <img 
                  src={data.imageUrl} 
                  alt={`Pré-visualização da imagem externa para o tema: ${data.theme}`}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="text-white text-sm font-semibold">Ver Imagem Original</span>
                </div>
              </div>
            </a>
          ) : (
            <div className="aspect-square bg-slate-900 rounded-md overflow-hidden shadow-inner">
              <img 
                src={data.imageUrl} 
                alt={`Imagem gerada por IA para o tema: ${data.theme}`}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>


        {/* Text Column */}
        <div className="flex flex-col space-y-6">
          {/* Caption Section */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-slate-300">LEGENDA COMPLETA</h3>
              <button
                onClick={() => handleCopy(data.caption, 'caption')}
                className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full text-slate-300 bg-slate-700/50 hover:bg-slate-700 hover:text-white transition-all duration-200"
                aria-label="Copiar legenda"
              >
                <CopyIcon />
                <span>{copied === 'caption' ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-md border border-slate-700/50 max-h-48 overflow-y-auto custom-scrollbar">
              <p className="text-slate-200 whitespace-pre-wrap">{data.caption}</p>
            </div>
          </div>

          {/* Hashtags Section */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-slate-300">BLOCO DE HASHTAGS</h3>
               <button
                onClick={() => handleCopy(data.hashtags, 'hashtags')}
                className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full text-slate-300 bg-slate-700/50 hover:bg-slate-700 hover:text-white transition-all duration-200"
                aria-label="Copiar hashtags"
              >
                <CopyIcon />
                <span>{copied === 'hashtags' ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-md border border-slate-700/50">
              <p className="text-cyan-300 break-words">{data.hashtags}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-8 pt-6 border-t border-slate-700">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
              onClick={handlePost}
              disabled={isSharing}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-fuchsia-600 to-cyan-500 hover:from-fuchsia-700 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fuchsia-500 transition-all duration-300 transform hover:scale-105 disabled:opacity-70 disabled:cursor-wait"
            >
              {isSharing ? 'Preparando...' : `Postar no ${data.platform}`}
          </button>
          <div className="w-full flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleSavePost}
                disabled={isSaving}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-200 bg-slate-700/50 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SaveIcon />
                <span>{saveButtonText}</span>
              </button>
               <button
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-200 bg-slate-700/50 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                <PdfIcon />
                <span>{isDownloadingPdf ? 'Gerando...' : 'Salvar PDF'}</span>
              </button>
              <button
                onClick={handleDownloadDocx}
                disabled={isDownloadingDocx}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-200 bg-slate-700/50 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                <DocxIcon />
                <span>{isDownloadingDocx ? 'Gerando...' : 'Salvar DOCX'}</span>
              </button>
          </div>
        </div>
        <p className="text-center text-xs text-slate-500 mt-3">
          Use "Postar" para compartilhar via menu nativo ou ser redirecionado. Use "Salvar" para baixar a imagem e copiar o texto.
        </p>
      </div>
    </div>
  );
};