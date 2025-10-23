import React, { useState, useEffect } from 'react';
import type { PostData } from '../types';
import { CopyIcon } from './icons/CopyIcon';
import { SaveIcon } from './icons/SaveIcon';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, ImageRun } from 'docx';
import html2canvas from 'html2canvas';
import { PdfIcon } from './icons/PdfIcon';
import { DocxIcon } from './icons/DocxIcon';
import { ImageIcon } from './icons/ImageIcon';
import { suggestHashtags, generateVideoScript, generateAudioFromScript, generateVideoFromPrompt } from '../services/geminiService';
import { SparklesIcon } from './icons/SparklesIcon';
import JSZip from 'jszip';
import { GoogleDriveIcon } from './icons/GoogleDriveIcon';
import { AudioIcon } from './icons/AudioIcon';
import { VideoIcon } from './icons/VideoIcon';
import { WarningIcon } from './icons/WarningIcon';

// Helper function to decode base64
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper function to decode raw PCM audio data
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Helper function to convert AudioBuffer to a WAV file Blob
function bufferToWav(buffer: AudioBuffer): Blob {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArray = new ArrayBuffer(length);
    const view = new DataView(bufferArray);
    let offset = 0;
    let pos = 0;

    const setUint16 = (data: number) => {
        view.setUint16(pos, data, true);
        pos += 2;
    };
    const setUint32 = (data: number) => {
        view.setUint32(pos, data, true);
        pos += 4;
    };

    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8);
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16);
    setUint16(1); // PCM
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit
    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4);

    const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
    
    while (pos < length) {
        for (let i = 0; i < numOfChan; i++) {
            if (offset < channels[i].length) {
                let sample = Math.max(-1, Math.min(1, channels[i][offset]));
                sample = sample < 0 ? sample * 32768 : sample * 32767;
                view.setInt16(pos, sample, true);
            }
            pos += 2;
        }
        offset++;
    }

    return new Blob([view], { type: 'audio/wav' });
}


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


interface PostOutputProps {
  data: PostData;
}

export const PostOutput: React.FC<PostOutputProps> = ({ data }) => {
  const [copied, setCopied] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const [isSavingAsImage, setIsSavingAsImage] = useState(false);
  const [isSavingToDrive, setIsSavingToDrive] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [saveButtonText, setSaveButtonText] = useState('Salvar Post');
  const [suggestedHashtags, setSuggestedHashtags] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [videoScript, setVideoScript] = useState<string | null>(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [isGeneratingMedia, setIsGeneratingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [isVeoKeySelected, setIsVeoKeySelected] = useState<boolean>(false);
  const isExternalUrl = data.imageUrl.startsWith('http');

  useEffect(() => {
    // Check for VEO key when the component mounts or data changes to a YouTube post
    if (data.platform === 'YouTube') {
      // @ts-ignore
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        // @ts-ignore
        window.aistudio.hasSelectedApiKey().then(setIsVeoKeySelected);
      }
    }
  }, [data.platform]);

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

  const handleSaveAsImage = async () => {
    setIsSavingAsImage(true);

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '1080px';
    container.style.padding = '40px';
    container.style.backgroundColor = '#1e293b'; // slate-800
    container.style.color = '#e2e8f0'; // slate-200
    container.style.fontFamily = 'Inter, sans-serif';
    container.style.boxSizing = 'border-box';

    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = data.imageUrl;
    image.style.width = '100%';
    image.style.height = 'auto';
    image.style.borderRadius = '8px';
    image.style.marginBottom = '20px';
    
    const caption = document.createElement('p');
    caption.innerText = data.caption;
    caption.style.fontSize = '24px';
    caption.style.lineHeight = '1.5';
    caption.style.whiteSpace = 'pre-wrap';
    caption.style.marginBottom = '30px';

    const hashtags = document.createElement('p');
    hashtags.innerText = data.hashtags;
    hashtags.style.fontSize = '20px';
    hashtags.style.color = '#67e8f9'; // cyan-300
    hashtags.style.wordBreak = 'break-word';
    hashtags.style.marginBottom = '40px';
    
    const footer = document.createElement('p');
    footer.innerText = 'Gerado por AmplifyAI';
    footer.style.fontSize = '18px';
    footer.style.textAlign = 'center';
    footer.style.color = '#94a3b8'; // slate-400
    footer.style.opacity = '0.7';

    container.appendChild(image);
    container.appendChild(caption);
    container.appendChild(hashtags);
    container.appendChild(footer);
    
    document.body.appendChild(container);

    const cleanup = () => {
        if(document.body.contains(container)) {
            document.body.removeChild(container);
        }
        setIsSavingAsImage(false);
    };

    image.onload = () => {
        html2canvas(container, {
            useCORS: true,
            scale: 1, 
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = `amplifyai-post-${getCleanThemeForFilename()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            cleanup();
        }).catch(err => {
            console.error('Erro ao gerar imagem com html2canvas:', err);
            alert('Não foi possível gerar a imagem. Verifique o console para mais detalhes.');
            cleanup();
        });
    };

    image.onerror = () => {
        console.error('Erro ao carregar a imagem para o canvas.');
        alert('Não foi possível carregar a imagem original para criar o post. A URL pode estar inacessível.');
        cleanup();
    }
  };

  const handleSaveToDrive = async () => {
    setIsSavingToDrive(true);
    try {
      const zip = new JSZip();
      
      // 1. Fetch and add image
      const imageResponse = await fetch(data.imageUrl);
      const imageBlob = await imageResponse.blob();
      const imageExtension = imageBlob.type.split('/')[1] || 'jpg';
      zip.file(`imagem.${imageExtension}`, imageBlob);
      
      // 2. Add text content
      const textContent = `TEMA:\n${data.theme}\n\nLEGENDA:\n${data.caption}\n\nHASHTAGS:\n${data.hashtags}`;
      zip.file("legenda_e_hashtags.txt", textContent);
      
      // 3. Generate and add composite image (if handleSaveAsImage is adapted)
      // This part is complex to do without re-rendering. We'll skip it for now and add a note.

      // 4. Generate and download zip
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(zipBlob);
      link.download = `amplifyai-post-${getCleanThemeForFilename()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      // 5. Open Google Drive and alert user
      setTimeout(() => {
        window.open('https://drive.google.com', '_blank');
        alert('Seu post foi salvo em um arquivo .zip! \n\nO Google Drive foi aberto em uma nova aba. Agora, basta arrastar o arquivo baixado para a janela do Drive para fazer o upload.');
      }, 500);

    } catch (error) {
      console.error('Erro ao criar arquivo para Google Drive:', error);
      alert('Ocorreu um erro ao preparar seu arquivo para o Google Drive. Por favor, tente novamente.');
    } finally {
      setIsSavingToDrive(false);
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
          'YouTube': 'https://studio.youtube.com/',
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

  const handleSuggestHashtags = async () => {
    setIsSuggesting(true);
    setSuggestionError(null);
    setSuggestedHashtags([]);
    try {
      const suggestions = await suggestHashtags(data.hashtags, data.platform);
      setSuggestedHashtags(suggestions);
    } catch (error) {
      console.error("Error suggesting hashtags:", error);
      setSuggestionError("Não foi possível gerar sugestões. Tente novamente.");
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleGenerateScript = async () => {
    setIsGeneratingScript(true);
    setScriptError(null);
    setVideoScript(null);
    
    try {
      const caption = data.caption;
      const titleMatch = caption.match(/\*\*TÍTULO:\*\*\s*\n([\s\S]*?)\n\n\*\*DESCRIÇÃO:\*\*/);
      const descriptionMatch = caption.match(/\*\*DESCRIÇÃO:\*\*\s*\n([\s\S]*)/);
      
      const title = titleMatch ? titleMatch[1].trim() : data.theme;
      const description = descriptionMatch ? descriptionMatch[1].trim() : data.caption;
  
      if (!title || !description) {
          throw new Error("Não foi possível extrair o título e a descrição do post.");
      }
      
      const script = await generateVideoScript(title, description); 
      setVideoScript(script);
  
    } catch (error) {
      console.error("Error generating video script:", error);
      setScriptError(error instanceof Error ? error.message : "Falha ao gerar roteiro. Tente novamente.");
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleGenerateMedia = async () => {
    if (!videoScript) {
        setMediaError("Gere um roteiro primeiro.");
        return;
    }
    setIsGeneratingMedia(true);
    setMediaError(null);
    setAudioUrl(null);
    setVideoUrl(null);
    setAudioBlob(null);
    setVideoBlob(null);

    try {
        const audioPromise = generateAudioFromScript(videoScript).then(async base64Audio => {
            const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
            const wavBlob = bufferToWav(audioBuffer);
            setAudioBlob(wavBlob);
            setAudioUrl(URL.createObjectURL(wavBlob));
        });

        const videoPromise = imageUrlToBase64(data.imageUrl).then(async imageBase64 => {
            const videoBlob = await generateVideoFromPrompt(data.theme, imageBase64);
            setVideoBlob(videoBlob);
            setVideoUrl(URL.createObjectURL(videoBlob));
        });
        
        await Promise.all([audioPromise, videoPromise]);

    } catch (error) {
        console.error("Error generating media:", error);
        const errorMessage = error instanceof Error ? error.message : "Falha ao gerar mídia. Tente novamente.";
        setMediaError(errorMessage);
        if (errorMessage.includes('[VEO_KEY_ERROR]')) {
          setIsVeoKeySelected(false); // Force re-selection
        }
    } finally {
        setIsGeneratingMedia(false);
    }
  };

  const handleSelectVeoKey = async () => {
    // @ts-ignore
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      try {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        // Assume success to avoid race conditions and allow the user to try generating immediately.
        setIsVeoKeySelected(true);
        setMediaError(null);
      } catch (e) {
        console.error("Error opening API key selection dialog", e);
        setMediaError("Não foi possível abrir a seleção de chave de API.");
      }
    } else {
        setMediaError("Funcionalidade de seleção de chave não disponível.");
    }
  };


  const handleCopyTag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  const SmallSpinner = () => (
    <svg 
      className="animate-spin h-5 w-5 text-cyan-400"
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
              <h3 className="text-lg font-semibold text-slate-300">{data.platform === 'YouTube' ? 'TÍTULO E DESCRIÇÃO' : 'LEGENDA COMPLETA'}</h3>
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
              <h3 className="text-lg font-semibold text-slate-300">{data.platform === 'YouTube' ? 'TAGS DO VÍDEO' : 'BLOCO DE HASHTAGS'}</h3>
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
          
          {/* Hashtag Suggestions Section */}
          <div>
            <h3 className="text-lg font-semibold text-slate-300 mb-2">Sugestões de IA</h3>
            <div className="bg-slate-900/50 p-4 rounded-md border border-slate-700/50 min-h-[58px] flex items-center justify-center">
                {isSuggesting ? (
                    <div className="flex items-center text-slate-400">
                        <SmallSpinner />
                        <span className="ml-2 text-sm">Buscando tendências...</span>
                    </div>
                ) : suggestionError ? (
                    <p className="text-red-400 text-center text-sm">{suggestionError}</p>
                ) : suggestedHashtags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {suggestedHashtags.map((tag, index) => (
                            <button 
                                key={index}
                                onClick={() => handleCopyTag(tag)}
                                className="text-xs font-medium px-2.5 py-1 rounded-full text-cyan-200 bg-cyan-900/50 hover:bg-cyan-800/70 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                title="Copiar hashtag"
                            >
                                {copiedTag === tag ? 'Copiado!' : tag}
                            </button>
                        ))}
                    </div>
                ) : (
                    <button
                        onClick={handleSuggestHashtags}
                        className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-500 transition-all duration-200"
                    >
                        <SparklesIcon />
                        <span>Sugerir Mais Hashtags</span>
                    </button>
                )}
            </div>
          </div>

            {/* Video Script Section */}
            {data.platform === 'YouTube' && (
                <div>
                    <h3 className="text-lg font-semibold text-slate-300 mb-2">Roteiro para Vídeo</h3>
                    <div className="bg-slate-900/50 p-4 rounded-md border border-slate-700/50 min-h-[58px]">
                        {isGeneratingScript ? (
                            <div className="flex items-center justify-center text-slate-400">
                                <SmallSpinner />
                                <span className="ml-2 text-sm">IA está escrevendo o roteiro...</span>
                            </div>
                        ) : scriptError ? (
                            <p className="text-red-400 text-center text-sm">{scriptError}</p>
                        ) : videoScript ? (
                            <div>
                                <div className="flex justify-end mb-2">
                                    <button
                                        onClick={() => handleCopy(videoScript, 'script')}
                                        className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full text-slate-300 bg-slate-700/50 hover:bg-slate-700 hover:text-white transition-all duration-200"
                                        aria-label="Copiar roteiro"
                                    >
                                        <CopyIcon />
                                        <span>{copied === 'script' ? 'Copiado!' : 'Copiar Roteiro'}</span>
                                    </button>
                                </div>
                                <div className="max-h-60 overflow-y-auto custom-scrollbar pr-2">
                                    <p className="text-slate-200 whitespace-pre-wrap">{videoScript}</p>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={handleGenerateScript}
                                className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-fuchsia-600 hover:bg-fuchsia-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-fuchsia-500 transition-all duration-200"
                            >
                                <SparklesIcon />
                                <span>Gerar Roteiro com IA</span>
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
      </div>
      
       {/* Video Production Section */}
       {data.platform === 'YouTube' && videoScript && (
          <div className="mt-8 pt-6 border-t border-slate-700">
            <h3 className="text-lg font-semibold text-slate-300 mb-2">Produção de Vídeo</h3>
            <div className="bg-slate-900/50 p-4 rounded-md border border-slate-700/50">
              {!isVeoKeySelected ? (
                <div className="text-center p-4 bg-amber-900/30 border border-amber-700 rounded-md">
                   <WarningIcon />
                  <p className="text-amber-300 font-semibold mt-2">Ação necessária para gerar vídeo</p>
                  <p className="text-sm text-amber-400 mt-1 mb-4">
                    A geração de vídeo requer uma chave de API específica. Clique no botão abaixo para selecionar sua chave.
                    Verifique o <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-200">guia de faturamento</a> para mais detalhes.
                  </p>
                  <button onClick={handleSelectVeoKey} className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded transition-colors">
                    Selecionar Chave de API
                  </button>
                </div>
              ) : isGeneratingMedia ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col items-center text-slate-400"><SmallSpinner /><span className="mt-2 text-sm">Gerando narração de áudio...</span></div>
                  <div className="flex flex-col items-center text-slate-400"><SmallSpinner /><span className="mt-2 text-sm">Gerando clipe de vídeo (pode levar alguns minutos)...</span></div>
                </div>
              ) : mediaError ? (
                <p className="text-red-400 text-center text-sm">{mediaError}</p>
              ) : audioUrl && videoUrl ? (
                <div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                      <div>
                          <h4 className="font-semibold mb-2">Narração de Áudio</h4>
                          <audio controls src={audioUrl} className="w-full"></audio>
                          <button onClick={() => audioBlob && downloadBlob(audioBlob, `narracao-${getCleanThemeForFilename()}.wav`)} className="mt-2 w-full flex justify-center items-center gap-2 py-2 px-4 border border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-200 bg-slate-700/50 hover:bg-slate-700"><AudioIcon /> Baixar Áudio (WAV)</button>
                      </div>
                      <div>
                          <h4 className="font-semibold mb-2">Clipe de Vídeo (sem som)</h4>
                          <video controls src={videoUrl} className="w-full rounded-md bg-black"></video>
                          <button onClick={() => videoBlob && downloadBlob(videoBlob, `video-${getCleanThemeForFilename()}.mp4`)} className="mt-2 w-full flex justify-center items-center gap-2 py-2 px-4 border border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-200 bg-slate-700/50 hover:bg-slate-700"><VideoIcon /> Baixar Vídeo (MP4)</button>
                      </div>
                   </div>
                   <div className="text-center p-3 bg-cyan-900/30 border border-cyan-700 rounded-md">
                      <p className="text-cyan-200 font-semibold">Passo Final!</p>
                      <p className="text-sm text-cyan-300">Use um editor de vídeo (CapCut, Clipchamp, etc.) para combinar o áudio da narração com o clipe de vídeo.</p>
                   </div>
                </div>
              ) : (
                <button onClick={handleGenerateMedia} className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-cyan-600 to-sky-500 hover:from-cyan-700 hover:to-sky-600">
                  <SparklesIcon />
                  <span>Gerar Mídia para Vídeo (Áudio + Clipe)</span>
                </button>
              )}
            </div>
          </div>
        )}

      <div className="mt-8 pt-6 border-t border-slate-700">
        <div className="flex flex-col gap-4">
            <button
                onClick={handlePost}
                disabled={isSharing}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-fuchsia-600 to-cyan-500 hover:from-fuchsia-700 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fuchsia-500 transition-all duration-300 transform hover:scale-105 disabled:opacity-70 disabled:cursor-wait"
            >
                {isSharing ? 'Preparando...' : `Postar no ${data.platform}`}
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                <button
                    onClick={handleSaveAsImage}
                    disabled={isSavingAsImage}
                    className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-200 bg-slate-700/50 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ImageIcon />
                    <span>{isSavingAsImage ? 'Gerando...' : 'Salvar Imagem'}</span>
                </button>
                <button
                    onClick={handleSaveToDrive}
                    disabled={isSavingToDrive}
                    className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-200 bg-slate-700/50 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <GoogleDriveIcon />
                    <span>{isSavingToDrive ? 'Preparando...' : 'Salvar no Drive'}</span>
                </button>
            </div>
        </div>
        <p className="text-center text-xs text-slate-500 mt-3">
          Use "Postar" para compartilhar ou as outras opções para salvar em diferentes formatos.
        </p>
      </div>
    </div>
  );
};