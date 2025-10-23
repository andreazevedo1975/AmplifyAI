import { GoogleGenAI } from "@google/genai";
import type { GeneratedContent } from '../types';

// FIX: Initialize GoogleGenAI with API key from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const getPlatformSpecifics = (platform: string) => {
  switch (platform) {
    case 'Instagram':
      return {
        aspectRatio: '4:3', // Closest to 4:5 portrait
        imagePromptSuffix: 'fotografia cinematográfica vibrante e de alta qualidade, proporção 4:3, com iluminação dramática, rica em detalhes, perfeita para um feed do Instagram.',
        contentInstructions: `
          - **Tom de Voz:** Envolvente, amigável e autêntico. Use emojis para adicionar personalidade.
          - **Estrutura:** Comece com uma frase que chame a atenção. Use parágrafos curtos e quebras de linha. Faça uma pergunta para incentivar comentários.
          - **Hashtags:** Forneça de 10 a 15 hashtags, misturando populares e de nicho.
        `
      };
    case 'Facebook':
       return {
        aspectRatio: '4:3', // Good for mobile feeds
        imagePromptSuffix: 'imagem clara e chamativa que conta uma história, com cores vivas e composição envolvente, proporção 4:3, otimizada para um post de Facebook.',
        contentInstructions: `
          - **Tom de Voz:** Conversacional e informativo. Pode ser um pouco mais longo que no Instagram.
          - **Estrutura:** Conte uma história ou compartilhe informações valiosas. Use listas (bullet points) se aplicável. Inclua um link relevante se houver.
          - **Hashtags:** Forneça de 3 a 5 hashtags relevantes.
        `
      };
    case 'LinkedIn':
       return {
        aspectRatio: '1:1', // Square images work well
        imagePromptSuffix: 'imagem profissional, limpa e corporativa com um toque moderno, paleta de cores sóbria, focada em negócios e tecnologia, proporção 1:1, ideal para o LinkedIn.',
        contentInstructions: `
          - **Tom de Voz:** Profissional, informativo e inspirador. Evite jargões excessivos e emojis.
          - **Estrutura:** Use parágrafos curtos e claros. Utilize bullet points para facilitar a leitura. Termine com uma pergunta para estimular o debate profissional.
          - **Hashtags:** Forneça de 3 a 5 hashtags de nicho e profissionais.
        `
      };
    case 'Twitter (X)':
       return {
        aspectRatio: '16:9', // Optimal for in-feed display
        imagePromptSuffix: 'imagem horizontal impactante e de alta resolução, com um ponto focal claro que se destaque em um feed rápido, proporção 16:9, para o Twitter/X.',
        contentInstructions: `
          - **Tom de Voz:** Conciso, direto e espirituoso. O limite é de 280 caracteres.
          - **Estrutura:** Vá direto ao ponto. Use quebras de linha para facilitar a leitura. Faça uma pergunta ou uma declaração ousada.
          - **Hashtags:** Forneça de 1 a 3 hashtags altamente relevantes.
        `
      };
    case 'TikTok':
       return {
        aspectRatio: '9:16', // Vertical format
        imagePromptSuffix: 'imagem vertical vibrante e que chama a atenção, com cores saturadas e estética moderna, adequada como fundo para um vídeo curto, proporção 9:16, para TikTok.',
        contentInstructions: `
          - **Tom de Voz:** Curto, divertido e na moda. Use gírias e linguagem da plataforma.
          - **Estrutura:** Legenda muito curta e impactante para despertar curiosidade. Faça uma pergunta para gerar comentários.
          - **Hashtags:** Forneça de 3 a 5 hashtags, incluindo as que estão em alta (trending).
        `
      };
    case 'Pinterest':
       return {
        aspectRatio: '4:3', // Simulating a 2:3 ratio
        imagePromptSuffix: 'imagem vertical estética e inspiradora, com composição de alta qualidade e espaço negativo para sobreposição de texto, proporção 4:3 (simulando 2:3), ideal para um Pin do Pinterest.',
        contentInstructions: `
          - **Tom de Voz:** Descritivo, útil e otimizado para busca (SEO). Pense no título e na descrição de um blog.
          - **Estrutura:** Crie um título rico em palavras-chave e uma descrição detalhada explicando o que a imagem representa ou ensina.
          - **Hashtags:** O uso de hashtags é menos impactante; foque em uma descrição rica em palavras-chave. Inclua 2 a 3 hashtags se desejar.
        `
      };
    default:
      return {
        aspectRatio: '1:1',
        imagePromptSuffix: 'imagem de alta qualidade, com boa iluminação e composição.',
        contentInstructions: 'Crie uma legenda cativante e sugira hashtags relevantes.'
      };
  }
}

export const generateImage = async (prompt: string, platform: string): Promise<string> => {
  const specifics = getPlatformSpecifics(platform);
  const finalPrompt = `${prompt}, ${specifics.imagePromptSuffix}`;

  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: finalPrompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: specifics.aspectRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9",
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    } else {
      // This case might be triggered by safety policies as well
      throw new Error("[IMAGE_GEN_ERROR] Nenhuma imagem foi gerada. Isso pode ocorrer devido a políticas de segurança.");
    }
  } catch (error) {
    console.error("Erro ao gerar imagem:", error);
    if (error.toString().toLowerCase().includes('safety')) {
        throw new Error("[SAFETY_BLOCK] Sua solicitação de imagem foi bloqueada por motivos de segurança.");
    }
    throw new Error("[IMAGE_GEN_ERROR] Falha ao gerar a imagem. Verifique o prompt e tente novamente.");
  }
};

export const generateContentWithSearch = async (theme: string, platform: string, profileUrl: string, isThinkingMode: boolean): Promise<GeneratedContent> => {
  const specifics = getPlatformSpecifics(platform);
  
  let prompt = `Você é um especialista em marketing de mídia social. Sua tarefa é criar um post para a plataforma "${platform}" sobre o tema "${theme}".`;

  if (profileUrl) {
    prompt += `\n\n**Contexto Adicional:** Analise o tom de voz, estilo e tópicos comuns do perfil no seguinte URL: ${profileUrl}. Adapte a legenda e o tom para se alinharem com o conteúdo existente neste perfil. Se não for possível acessar ou analisar o URL, prossiga com seu conhecimento geral de especialista.`;
  }
  
  if (isThinkingMode) {
    prompt += `\n\n**MODO DE PENSAMENTO AVANÇADO ATIVADO:** Utilize suas capacidades de raciocínio profundo para uma análise exaustiva e detalhada do tema. Gere insights únicos e uma perspectiva original.`;
  }

  prompt += `
    
    **Instruções Detalhadas para ${platform}:**
    1.  **Pesquise:** Use a busca para encontrar informações atuais, dados e insights relevantes sobre "${theme}".
    2.  **Crie a Legenda e Hashtags seguindo estas regras:**
        ${specifics.contentInstructions}
    
    Por favor, estruture sua resposta EXATAMENTE como um objeto JSON, sem nenhum texto adicional antes ou depois. O objeto JSON deve ter as seguintes chaves:
    -   "caption": (string) O texto da legenda, formatado com quebras de linha (\\n) para parágrafos.
    -   "hashtags": (string) Uma única string contendo todas as hashtags separadas por espaços (ex: "#marketing #socialmedia #conteudo").

    Exemplo de saída JSON:
    {
      "caption": "Aqui está uma legenda incrível sobre o seu tema...",
      "hashtags": "#tema #exemplo #marketingdigital"
    }
  `;
  
  const modelName = isThinkingMode ? "gemini-2.5-pro" : "gemini-2.5-flash";
  const modelConfig: { tools: any[]; thinkingConfig?: object } = {
    tools: [{ googleSearch: {} }],
  };

  if (isThinkingMode) {
    modelConfig.thinkingConfig = { thinkingBudget: 32768 };
  }

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: modelConfig,
    });

    // Primary check for safety blocks based on the API response
    if (response.candidates?.length === 0 || response.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error("[SAFETY_BLOCK] A resposta foi bloqueada devido às configurações de segurança.");
    }

    const text = response.text.trim();
    
    // More robust JSON extraction
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        const jsonString = text.substring(startIndex, endIndex + 1);
        try {
            const parsedContent: GeneratedContent = JSON.parse(jsonString);
            if (parsedContent.caption && parsedContent.hashtags) {
                return parsedContent;
            } else {
                 // The JSON is valid, but missing required fields.
                 throw new Error("[FORMAT_ERROR] O conteúdo gerado pela IA está incompleto (faltam legendas ou hashtags).");
            }
        } catch (e) {
            console.error("Erro ao fazer parse do JSON da resposta:", e, "String tentada:", jsonString);
            // The string is not valid JSON
            throw new Error("[FORMAT_ERROR] A IA não retornou o conteúdo no formato JSON esperado.");
        }
    }
    
    // If no JSON block is found
    console.error("Resposta da IA não continha um bloco JSON válido:", text);
    throw new Error("[FORMAT_ERROR] A IA não retornou o conteúdo no formato esperado. Tente refinar seu tema.");

  } catch (error) {
    console.error("Erro ao gerar conteúdo:", error);
    // Fallback check for safety errors in the thrown error message (e.g., for prompt blocking)
    if (error.toString().toLowerCase().includes('safety') || error.message.includes('[SAFETY_BLOCK]')) {
        throw new Error("[SAFETY_BLOCK] Sua solicitação foi bloqueada pelas políticas de segurança da IA.");
    }
    if (error.message.includes('[FORMAT_ERROR]')) {
        // Re-throw the specific format error
        throw error;
    }
    // Generic content generation error
    throw new Error("[CONTENT_GEN_ERROR] Falha ao gerar o conteúdo de texto.");
  }
};