import type { PostData } from '../types';

// FIX: Add declarations for google and gapi to inform TypeScript that these global variables are provided by external scripts.
declare const google: any;
declare const gapi: any;

// Add type declarations for the promises we're adding to the window object in index.html
declare global {
  interface Window {
    gapiLoadedPromise: Promise<void>;
    gisLoadedPromise: Promise<void>;
    windowGapiLoaded: () => void;
    windowGisLoaded: () => void;
  }
}

// Configuração do Google Client ID e API Key.
// Em um ambiente de produção real, estes valores NUNCA devem ser expostos diretamente no código.
// Eles devem ser carregados a partir de variáveis de ambiente seguras.
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const API_KEY = process.env.API_KEY;
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

// A integração com o Drive só é considerada configurada se AMBAS as chaves estiverem presentes.
export const isGoogleDriveConfigured = !!CLIENT_ID && !!API_KEY;

let tokenClient: any;

// Use the promise from index.html, then load the 'client' module.
const gapiLoadPromise = window.gapiLoadedPromise.then(() => {
    return new Promise<void>((resolve, reject) => {
        gapi.load('client', {
            callback: resolve,
            onerror: reject,
            timeout: 5000, // 5 seconds
            ontimeout: () => reject(new Error("Timeout: O módulo cliente GAPI não carregou a tempo.")),
        });
    });
});

// Use the promise from index.html, then initialize the token client.
const gisLoadPromise = window.gisLoadedPromise.then(() => {
    if (isGoogleDriveConfigured) {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: '', // Handled by promise in requestAccessToken
        });
    }
});


// Singleton promise to manage the GAPI client initialization.
// This ensures gapi.client.init is called only once and prevents race conditions.
let gapiClientInitPromise: Promise<void> | null = null;

function initializeGapiClient(): Promise<void> {
    if (gapiClientInitPromise) {
        return gapiClientInitPromise;
    }

    // Centraliza a verificação de configuração antes de qualquer chamada de API.
    // Isso evita erros obscuros da biblioteca do Google se as chaves não estiverem definidas.
    if (!isGoogleDriveConfigured) {
        const error = new Error("Google Client ID ou API Key não estão configurados no ambiente. A integração com o Drive está desabilitada.");
        console.error(error.message);
        // Retorna uma promise rejeitada para que as chamadas falhem de forma previsível.
        gapiClientInitPromise = Promise.reject(error);
        return gapiClientInitPromise;
    }

    gapiClientInitPromise = (async () => {
        try {
            // Wait for both external scripts to load and their respective clients to initialize.
            await Promise.all([gapiLoadPromise, gisLoadPromise]);
            
            // This is the crucial step that makes `gapi.client` available.
            await gapi.client.init({
                apiKey: API_KEY,
                discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
            });
        } catch (error) {
            // On failure, reset the promise to allow a future call to retry the initialization.
            gapiClientInitPromise = null;
            console.error("Falha ao inicializar o cliente GAPI:", error);
            throw error; // Propagate the error to the calling function.
        }
    })();
    
    return gapiClientInitPromise;
}

export function requestAccessToken(): Promise<any> {
  return new Promise(async (resolve, reject) => {
    try {
        await initializeGapiClient();
        
        // @ts-ignore
        const gapiToken = gapi.client.getToken();
        if (gapiToken && gapiToken.access_token) {
            return resolve(gapiToken);
        }

        if (!tokenClient) {
            return reject(new Error("Cliente de token do Google não está pronto. A configuração do Client ID pode estar ausente."));
        }

        tokenClient.callback = (resp: any) => {
          if (resp.error) {
            return reject(new Error(`Erro de Autenticação do Google: ${resp.error}`));
          }
          // @ts-ignore
          gapi.client.setToken(resp);
          resolve(resp);
        };
        
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch(err) {
        reject(err);
    }
  });
}

const HISTORY_FILE_NAME = 'amplifyai_history.json';
let fileIdCache: string | null = null;

async function findOrCreateHistoryFile(): Promise<string> {
    if (fileIdCache) return fileIdCache;

    // A verificação de configuração agora é tratada de forma centralizada em initializeGapiClient.
    await initializeGapiClient(); // Garante que gapi.client está pronto e a configuração foi verificada.
    
    // @ts-ignore
    const gapiToken = gapi.client.getToken();
    if (!gapiToken) await requestAccessToken();

    const query = `name = '${HISTORY_FILE_NAME}' and trashed = false`;
    const response = await gapi.client.drive.files.list({
        q: query,
        spaces: 'drive',
        fields: 'files(id, name)'
    });

    if (response.result.files && response.result.files.length > 0) {
        fileIdCache = response.result.files[0].id!;
        return fileIdCache;
    } else {
        const metadata = { name: HISTORY_FILE_NAME, mimeType: 'application/json' };
        const file = await gapi.client.drive.files.create({
            resource: metadata,
            fields: 'id'
        });
        const newFileId = file.result.id!;
        fileIdCache = newFileId;
        // Upload initial empty content
        await saveHistory([], newFileId);
        return newFileId;
    }
}

export async function getHistory(): Promise<PostData[]> {
    await initializeGapiClient(); // Garante que gapi.client está pronto.
    const fileId = await findOrCreateHistoryFile();
    
    const response = await gapi.client.drive.files.get({ fileId: fileId, alt: 'media' });
    if (response.body && response.body.length > 0) {
        try {
            return JSON.parse(response.body) as PostData[];
        } catch (e) {
            console.error("Failed to parse history file, returning empty.", e);
            return []; // Return empty array if file content is corrupt
        }
    }
    return [];
}

export async function saveHistory(history: PostData[], fileIdOverride?: string): Promise<void> {
    await initializeGapiClient(); // Garante que gapi.client está pronto.
    const token = await requestAccessToken();
    const fileId = fileIdOverride ?? await findOrCreateHistoryFile();
    const historyJson = JSON.stringify(history, null, 2);

    const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token.access_token}`,
            'Content-Type': 'application/json',
        },
        body: historyJson,
    });

    if (!response.ok) {
        const errorBody = await response.json();
        console.error("Drive save error:", errorBody);
        throw new Error("Falha ao salvar o histórico no Google Drive.");
    }
}