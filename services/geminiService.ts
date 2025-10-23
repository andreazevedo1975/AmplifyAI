import { GoogleGenAI, Modality } from "@google/genai";
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
        `,
        hashtagStrategy: `
          - **Quantidade:** Forneça de 15 a 20 hashtags.
          - **Estratégia:** Crie uma mistura estratégica de hashtags de alto volume (>500k posts), médio volume (100k-500k), e de nicho (<100k). Use a busca para encontrar as mais relevantes e populares para o tema.
        `
      };
    case 'Facebook':
       return {
        aspectRatio: '4:3', // Good for mobile feeds
        imagePromptSuffix: 'imagem clara e chamativa que conta uma história, com cores vivas e composição envolvente, proporção 4:3, otimizada para um post de Facebook.',
        contentInstructions: `
          - **Tom de Voz:** Conversacional e informativo. Pode ser um pouco mais longo que no Instagram.
          - **Estrutura:** Conte uma história ou compartilhe informações valiosas. Use listas (bullet points) se aplicável. Inclua um link relevante se houver.
        `,
        hashtagStrategy: `
          - **Quantidade:** Forneça de 3 a 5 hashtags.
          - **Estratégia:** Foque em hashtags altamente relevantes e específicas para o público-alvo. A popularidade é menos importante que a relevância.
        `
      };
    case 'LinkedIn':
       return {
        aspectRatio: '1:1', // Square images work well
        imagePromptSuffix: 'imagem profissional, limpa e corporativa com um toque moderno, paleta de cores sóbria, focada em negócios e tecnologia, proporção 1:1, ideal para o LinkedIn.',
        contentInstructions: `
          - **Tom de Voz:** Profissional, informativo e inspirador. Evite jargões excessivos e emojis.
          - **Estrutura:** Use parágrafos curtos e claros. Utilize bullet points para facilitar a leitura. Termine com uma pergunta para estimular o debate profissional.
        `,
        hashtagStrategy: `
          - **Quantidade:** Forneça de 3 a 5 hashtags.
          - **Estratégia:** Use hashtags estritamente profissionais e de nicho. Pense em tópicos de conferências, habilidades, setores da indústria e jargões conhecidos na área.
        `
      };
    case 'Twitter (X)':
       return {
        aspectRatio: '16:9', // Optimal for in-feed display
        imagePromptSuffix: 'imagem horizontal impactante e de alta resolução, com um ponto focal claro que se destaque em um feed rápido, proporção 16:9, para o Twitter/X.',
        contentInstructions: `
          - **Tom de Voz:** Conciso, direto e espirituoso. O limite é de 280 caracteres.
          - **Estrutura:** Vá direto ao ponto. Use quebras de linha para facilitar a leitura. Faça uma pergunta ou uma declaração ousada.
        `,
        hashtagStrategy: `
          - **Quantidade:** Forneça de 2 a 4 hashtags.
          - **Estratégia:** Use a busca para identificar e incluir pelo menos uma hashtag que esteja atualmente em alta (trending), se for relevante para o tema. Combine com hashtags de evento ou de comunidade.
        `
      };
    case 'TikTok':
       return {
        aspectRatio: '9:16', // Vertical format
        imagePromptSuffix: 'imagem vertical vibrante e que chama a atenção, com cores saturadas e estética moderna, adequada como fundo para um vídeo curto, proporção 9:16, para TikTok.',
        contentInstructions: `
          - **Tom de Voz:** Curto, divertido e na moda. Use gírias e linguagem da plataforma.
          - **Estrutura:** Legenda muito curta e impactante para despertar curiosidade. Faça uma pergunta para gerar comentários.
        `,
        hashtagStrategy: `
          - **Quantidade:** Forneça de 4 a 6 hashtags.
          - **Estratégia:** Priorize hashtags que estão em alta (trending challenges, sons populares). Use a busca para identificar as tendências atuais. É altamente recomendado incluir #fyp, #foryou ou #viral.
        `
      };
    case 'Pinterest':
       return {
        aspectRatio: '4:3', // Simulating a 2:3 ratio
        imagePromptSuffix: 'imagem vertical estética e inspiradora, com composição de alta qualidade e espaço negativo para sobreposição de texto, proporção 4:3 (simulando 2:3), ideal para um Pin do Pinterest.',
        contentInstructions: `
          - **Tom de Voz:** Descritivo, útil e otimizado para busca (SEO). Pense no título e na descrição de um blog.
          - **Estrutura:** Crie um título rico em palavras-chave e uma descrição detalhada explicando o que a imagem representa ou ensina.
        `,
        hashtagStrategy: `
          - **Quantidade:** Forneça de 2 a 5 hashtags, se desejar.
          - **Estratégia:** Hashtags são menos impactantes que palavras-chave na descrição. Use hashtags específicas e baseadas em palavras-chave para ajudar na categorização.
        `
      };
    case 'YouTube':
       return {
        aspectRatio: '16:9', // Standard thumbnail
        imagePromptSuffix: 'thumbnail para YouTube, chamativo e de alta resolução, com texto em destaque e cores vibrantes, proporção 16:9, otimizado para cliques.',
        contentInstructions: `
          - **Estrutura da Legenda:** A legenda deve conter o título do vídeo e a descrição, claramente separados. Formate da seguinte maneira:
          
          **TÍTULO:**
          [Crie um título magnético e otimizado para SEO, com no máximo 70 caracteres aqui]

          **DESCRIÇÃO:**
          [Escreva uma descrição detalhada para o vídeo aqui. A descrição deve:]
          1.  Começar com um parágrafo envolvente que resume o vídeo e inclui as principais palavras-chave.
          2.  Incluir uma seção para "Timestamps" (marcadores de tempo), como "00:00 - Introdução".
          3.  Ter uma chamada para ação (CTA), como "Inscreva-se no canal", "Deixe seu like" e "Comente abaixo".
          4.  Listar links úteis (placeholders) relacionados ao vídeo.
        `,
        hashtagStrategy: `
          - **Quantidade:** Forneça de 5 a 10 hashtags/tags.
          - **Estratégia:** Foque em palavras-chave de cauda longa e curta que os usuários pesquisariam para encontrar este vídeo. Estas serão usadas como tags do vídeo e também podem ser incluídas no final da descrição.
        `
      };
    case 'Reddit':
      return {
        aspectRatio: '16:9',
        imagePromptSuffix: 'imagem informativa, que gere discussão ou que tenha potencial para se tornar um meme, proporção 16:9, ideal para uma comunidade do Reddit.',
        contentInstructions: `
          - **Estrutura:** Crie um TÍTULO e um CORPO para o post, separados por uma quebra de linha clara.
          - **Título:** O título é o mais importante. Deve ser cativante, direto e otimizado para chamar a atenção em um subreddit específico.
          - **Corpo:** O corpo do post (a legenda) deve ser detalhado, bem-estruturado e convidar à discussão. O tom deve ser autêntico e adaptado à cultura de uma comunidade online (evite linguagem corporativa).
        `,
        hashtagStrategy: `
          - **Estratégia:** Hashtags não são usadas no Reddit. Apenas forneça uma string vazia (""). O foco deve ser no título rico em palavras-chave.
        `
      };
    case 'Tumblr':
      return {
        aspectRatio: '4:3', // Good for portrait-style images
        imagePromptSuffix: 'imagem estética, artística ou de nicho, com um toque de humor ou profundidade, proporção 4:3, ideal para um dashboard do Tumblr.',
        contentInstructions: `
          - **Tom de Voz:** Informal, pessoal, espirituoso ou reflexivo.
          - **Estrutura:** A legenda pode variar de uma frase curta e impactante a um parágrafo mais longo (conhecido como "text post"). O estilo é livre.
        `,
        hashtagStrategy: `
          - **Quantidade:** Forneça de 10 a 20 tags.
          - **Estratégia:** Tags são cruciais para descoberta. Misture tags gerais com tags muito específicas, de nicho, de fandom ou estéticas. Tags podem ser frases completas, em minúsculas (ex: "#arte digital #pensamentos aleatórios #isso é incrível"). Use o formato de hashtags (#tag).
        `
      };
    case 'Quora':
      return {
        aspectRatio: '16:9',
        imagePromptSuffix: 'imagem clara e informativa, como um gráfico, diagrama ou fotografia que ilustre um conceito, proporção 16:9, para apoiar uma resposta no Quora.',
        contentInstructions: `
          - **Estrutura:** Formate o conteúdo como uma resposta a uma pergunta implícita no tema.
          1.  **Resposta Direta:** Comece com uma resposta direta e concisa à pergunta.
          2.  **Desenvolvimento:** Elabore a resposta com explicações detalhadas, dados, exemplos ou listas. A clareza e a credibilidade são fundamentais.
          3.  **Conclusão:** Termine com um parágrafo de resumo.
        `,
        hashtagStrategy: `
          - **Estratégia:** Hashtags não são usadas no Quora. Apenas forneça uma string vazia (""). O conteúdo é categorizado por "Tópicos", então foque em usar palavras-chave relevantes na resposta.
        `
      };
    case 'WhatsApp':
      return {
        aspectRatio: '9:16', // Status/Story format
        imagePromptSuffix: 'imagem vertical, simples e impactante, com um ponto focal claro, ideal para um status de WhatsApp, proporção 9:16.',
        contentInstructions: `
          - **Tom de Voz:** Pessoal, direto e muito conciso. Use emojis para expressar emoção.
          - **Estrutura:** Crie uma legenda curta para acompanhar a imagem no status. Idealmente, uma ou duas frases.
        `,
        hashtagStrategy: `
          - **Estratégia:** Hashtags não são usadas no WhatsApp. Forneça uma string vazia ("").
        `
      };
    case 'Telegram':
      return {
        aspectRatio: '4:3', // Flexible, good for channels
        imagePromptSuffix: 'imagem informativa e de alta qualidade, adequada para um canal informativo no Telegram, proporção 4:3.',
        contentInstructions: `
          - **Tom de Voz:** Informativo, claro e bem estruturado.
          - **Estrutura:** Pode ser um post mais longo, como um mini-artigo. Use formatação como **negrito** (envolvendo com **) e *itálico* (envolvendo com *) para destacar pontos importantes e melhorar a legibilidade.
        `,
        hashtagStrategy: `
          - **Quantidade:** Forneça de 3 a 5 hashtags.
          - **Estratégia:** Use hashtags para categorizar o conteúdo dentro de um canal ou grupo. Pense em palavras-chave que ajudem os membros a encontrar posts sobre um tópico específico.
        `
      };
    default:
      return {
        aspectRatio: '1:1',
        imagePromptSuffix: 'imagem de alta qualidade, com boa iluminação e composição.',
        contentInstructions: 'Crie uma legenda cativante.',
        hashtagStrategy: 'Sugira hashtags relevantes e populares.'
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
    const errorString = String(error).toLowerCase();

    if (errorString.includes('resource_exhausted') || errorString.includes('429')) {
      throw new Error("[RESOURCE_EXHAUSTED_ERROR] O serviço de geração de imagem está sobrecarregado. Por favor, tente novamente mais tarde.");
    }

    if (errorString.includes('safety')) {
        throw new Error("[SAFETY_BLOCK] Sua solicitação de imagem foi bloqueada por motivos de segurança.");
    }
    throw new Error("[IMAGE_GEN_ERROR] Falha ao gerar a imagem. Verifique o prompt e tente novamente.");
  }
};

export const generateContentWithSearch = async (theme: string, platform: string, profileUrl: string, isThinkingMode: boolean, isCreativityMode: boolean): Promise<GeneratedContent> => {
  const specifics = getPlatformSpecifics(platform);
  
  let prompt = `Você é um especialista em marketing de mídia social. Sua tarefa é criar um post para a plataforma "${platform}" sobre o tema "${theme}".`;

  if (profileUrl) {
    prompt += `\n\n**Contexto Adicional:** Analise o tom de voz, estilo e tópicos comuns do perfil no seguinte URL: ${profileUrl}. Adapte a legenda e o tom para se alinharem com o conteúdo existente neste perfil. Se não for possível acessar ou analisar o URL, prossiga com seu conhecimento geral de especialista.`;
  }
  
  if (isThinkingMode) {
    prompt += `\n\n**MODO DE PENSAMENTO AVANÇADO ATIVADO:** Utilize suas capacidades de raciocínio profundo para uma análise exaustiva e detalhada do tema. Gere insights únicos e uma perspectiva original.`;
  }

  if (isCreativityMode) {
    prompt += `\n\n**MODO CRIATIVIDADE ATIVADO:** Pense fora da caixa. Gere um conceito ousado, experimental e inesperado. Surpreenda com uma abordagem única e altamente criativa para o tema. Ignore convenções se necessário para criar algo verdadeiramente original.`;
  }

  prompt += `
    
    **Instruções Detalhadas para ${platform}:**
    1.  **Pesquise:** Use a busca para encontrar informações atuais, dados e insights relevantes sobre "${theme}".
    2.  **Crie a Legenda:** Siga estas regras para a legenda:
        ${specifics.contentInstructions}
    3.  **Crie as Hashtags:** Siga estas regras para as hashtags:
        ${specifics.hashtagStrategy}
    
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
            if (parsedContent.caption && typeof parsedContent.hashtags !== 'undefined') { // Check if hashtags property exists
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
    const errorString = String(error).toLowerCase();

    if (errorString.includes('resource_exhausted') || errorString.includes('429')) {
      throw new Error("[RESOURCE_EXHAUSTED_ERROR] O serviço de geração de conteúdo está sobrecarregado. Por favor, tente novamente mais tarde.");
    }

    if (error instanceof Error) {
        if (error.message.includes('[FORMAT_ERROR]')) {
            throw error; // Re-throw the specific format error
        }
        if (error.message.includes('[SAFETY_BLOCK]')) {
             throw new Error("[SAFETY_BLOCK] Sua solicitação foi bloqueada pelas políticas de segurança da IA.");
        }
    }
    
    // Fallback check for safety errors in the error string
    if (errorString.includes('safety')) {
        throw new Error("[SAFETY_BLOCK] Sua solicitação foi bloqueada pelas políticas de segurança da IA.");
    }
    
    // Generic content generation error
    throw new Error("[CONTENT_GEN_ERROR] Falha ao gerar o conteúdo de texto.");
  }
};

export const suggestHashtags = async (baseHashtags: string, platform: string): Promise<string[]> => {
  if (['Reddit', 'Quora', 'WhatsApp'].includes(platform) || !baseHashtags) {
    return [];
  }
  const prompt = `
    Você é um especialista em marketing de mídia social e tendências digitais.
    Com base nas seguintes hashtags para a plataforma "${platform}": "${baseHashtags}".

    Sugira 10 hashtags adicionais e relevantes. Sua sugestão deve incluir uma mistura de:
    1. Hashtags de tendência (trending topics) relacionadas ao tema.
    2. Palavras-chave mais específicas ou de nicho para atingir um público focado.
    3. Hashtags de comunidade ou eventos, se aplicável.

    Retorne sua resposta EXCLUSIVAMENTE como um array JSON de strings, sem nenhum texto, explicação ou formatação adicional.
    Cada string no array deve começar com '#'.

    Exemplo de saída:
    [
      "#novatendencia",
      "#dicaespecifica",
      "#comunidadeonline",
      "#evento2024"
    ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text.trim();
    const startIndex = text.indexOf('[');
    const endIndex = text.lastIndexOf(']');

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      const jsonString = text.substring(startIndex, endIndex + 1);
      try {
        const suggestions: string[] = JSON.parse(jsonString);
        return suggestions.filter(tag => typeof tag === 'string' && tag.startsWith('#'));
      } catch (e) {
        console.error("Erro ao fazer parse do JSON de sugestão de hashtag:", e, "String tentada:", jsonString);
        throw new Error("A IA não retornou as sugestões no formato JSON esperado.");
      }
    }
    
    console.error("Resposta de sugestão de hashtag não continha um array JSON válido:", text);
    throw new Error("A IA não retornou as sugestões no formato esperado.");

  } catch (error) {
    console.error("Erro ao sugerir hashtags:", error);
    if (error.toString().toLowerCase().includes('safety')) {
      throw new Error("A solicitação de sugestão foi bloqueada por motivos de segurança.");
    }
    throw new Error("Falha ao gerar sugestões de hashtags.");
  }
};

export const generateVideoScript = async (title: string, description:string): Promise<string> => {
  const prompt = `
    Você é um roteirista de vídeos para o YouTube e especialista em conteúdo digital.
    Sua tarefa é criar um roteiro detalhado e envolvente para um vídeo do YouTube com base no título e na descrição fornecidos.

    **Título do Vídeo:**
    "${title}"

    **Descrição do Vídeo:**
    "${description}"

    **Instruções para o Roteiro:**
    1.  **Estrutura Clara:** Divida o roteiro em seções lógicas:
        -   **Introdução (Gancho):** Comece com uma introdução cativante que prenda a atenção do espectador nos primeiros 15 segundos. Apresente o tema e o que será abordado.
        -   **Conteúdo Principal:** Desenvolva o tópico principal em 2-3 pontos chave. Explique de forma clara e didática. Use uma linguagem conversacional, como se estivesse falando diretamente com a câmera.
        -   **Conclusão e CTA (Chamada para Ação):** Faça um resumo rápido do que foi apresentado e termine com uma chamada para ação clara (ex: "Se você gostou deste vídeo, não se esqueça de se inscrever...", "Deixe seu comentário abaixo...", "Confira o link na descrição...").
    2.  **Linguagem Natural:** Escreva o roteiro em um tom natural e falado. Evite frases muito formais ou complexas.
    3.  **Sugestões Visuais (Opcional):** Se apropriado, pode incluir pequenas sugestões entre parênteses para o criador, como (Mostrar B-roll de...) ou (Exibir gráfico na tela).

    Retorne APENAS o texto do roteiro, pronto para ser lido. Não inclua nenhuma introdução ou formatação extra fora do roteiro em si.
  `;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    if (response.candidates?.length === 0 || response.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error("[SAFETY_BLOCK] A geração do roteiro foi bloqueada por motivos de segurança.");
    }

    return response.text.trim();
  } catch (error) {
    console.error("Erro ao gerar roteiro de vídeo:", error);
    const errorString = String(error).toLowerCase();
    if (errorString.includes('safety')) {
        throw new Error("[SAFETY_BLOCK] A solicitação de roteiro foi bloqueada pelas políticas de segurança da IA.");
    }
    throw new Error("Falha ao gerar o roteiro para o vídeo.");
  }
};

export const generateAudioFromScript = async (script: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: script }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // A calm, clear male voice
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("[AUDIO_GEN_ERROR] A IA não retornou dados de áudio.");
    }
    return base64Audio;
  } catch(error) {
    console.error("Erro ao gerar áudio:", error);
    const errorString = String(error).toLowerCase();
    if (errorString.includes('safety')) {
        throw new Error("[SAFETY_BLOCK] A solicitação de áudio foi bloqueada pelas políticas de segurança da IA.");
    }
    throw new Error("[AUDIO_GEN_ERROR] Falha ao gerar a narração de áudio.");
  }
};

export const generateVideoFromPrompt = async (prompt: string, imageBase64?: string): Promise<Blob> => {
  // Always create a new instance to ensure the latest API key from the dialog is used.
  const localAi = new GoogleGenAI({ apiKey: process.env.API_KEY! });
  try {
    
    const payload: any = {
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    };

    if (imageBase64) {
      payload.image = {
        imageBytes: imageBase64,
        mimeType: 'image/jpeg',
      };
    }

    let operation = await localAi.models.generateVideos(payload);

    // Poll for the result
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
      operation = await localAi.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error("[VIDEO_GEN_ERROR] A geração do vídeo foi concluída, mas nenhum link de download foi encontrado.");
    }

    // Append API key and fetch the video blob
    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!videoResponse.ok) {
        throw new Error(`[VIDEO_DOWNLOAD_ERROR] Falha ao baixar o arquivo de vídeo: ${videoResponse.statusText}`);
    }
    
    return await videoResponse.blob();
  
  } catch(error) {
    console.error("Erro ao gerar vídeo:", error);
    const errorString = String(error).toLowerCase();
    if (errorString.includes('requested entity was not found')) {
      throw new Error("[VEO_KEY_ERROR] A chave de API selecionada não foi encontrada ou não tem permissão. Por favor, selecione uma chave válida.");
    }
    if (errorString.includes('safety')) {
        throw new Error("[SAFETY_BLOCK] A solicitação de vídeo foi bloqueada pelas políticas de segurança da IA.");
    }
    throw new Error("[VIDEO_GEN_ERROR] Falha ao gerar o clipe de vídeo.");
  }
};