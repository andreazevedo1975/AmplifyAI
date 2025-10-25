import type { PostData } from '../types';

// FIX: Add declarations for google and gapi to inform TypeScript that these global variables are provided by external scripts.
declare const google: any;
declare const gapi: any;

// Configuração do Google Client ID.
// Em um ambiente de produção real, este valor NUNCA deve ser exposto diretamente no código.
// Ele deve ser carregado a partir de variáveis de ambiente seguras.
// Exemplo: const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_ID = "82041213131-033rkl1lclirgv3j2jn1a49n3tppc32k.apps.googleusercontent.com";
const API_KEY = process.env.API_KEY!;
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

export const isGoogleDriveConfigured = !!CLIENT_ID;

let gapiInited = false;
let gisInited = false;
let tokenClient: any;

const gapiLoadPromise = new Promise<void>((resolve, reject) => {
  // @ts-ignore
  window.gapiLoaded = () => gapi.load('client', () => { gapiInited = true; resolve(); });
  setTimeout(() => reject(new Error("Timeout: gapi.js não carregou a tempo.")), 10000);
});

const gisLoadPromise = new Promise<void>((resolve, reject) => {
  // @ts-ignore
  window.gisLoaded = () => {
    if (!isGoogleDriveConfigured) {
      // If not configured, we can consider it "loaded" for flow control, as no token client is needed.
      gisInited = true;
      return resolve();
    }
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: '', // Callback is handled by the promise
    });
    gisInited = true;
    resolve();
  };
  setTimeout(() => reject(new Error("Timeout: GSI client não carregou a tempo.")), 10000);
});

// Singleton promise to manage the GAPI client initialization.
// This ensures gapi.client.init is called only once and prevents race conditions.
let gapiClientInitPromise: Promise<void> | null = null;

function initializeGapiClient(): Promise<void> {
    if (gapiClientInitPromise) {
        return gapiClientInitPromise;
    }

    gapiClientInitPromise = (async () => {
        try {
            // Wait for both external scripts to load via their onload callbacks.
            await Promise.all([gapiLoadPromise, gisLoadPromise]);
            
            if (!gapiInited || !gisInited) {
                throw new Error("As bibliotecas do Google não foram inicializadas corretamente.");
            }
            
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

    if (!CLIENT_ID) throw new Error("Google Client ID não está configurado. A integração com o Drive está desabilitada.");
    
    await initializeGapiClient(); // Ensures gapi.client is ready.
    
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
    await initializeGapiClient(); // Ensures gapi.client is ready.
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
    await initializeGapiClient(); // Ensures gapi.client is ready.
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