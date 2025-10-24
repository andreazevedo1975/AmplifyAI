import type { PostData } from '../types';

// FIX: Add declarations for google and gapi to inform TypeScript that these global variables are provided by external scripts.
declare const google: any;
declare const gapi: any;

// ATENÇÃO: Para esta funcionalidade, você precisa de um Google Client ID.
// 1. Vá para https://console.cloud.google.com/
// 2. Crie um novo projeto.
// 3. Vá para "APIs & Services" -> "Credentials".
// 4. Crie um "OAuth 2.0 Client ID" do tipo "Web application".
// 5. Adicione a URL do seu aplicativo em "Authorized JavaScript origins".
// 6. Copie o Client ID e cole na variável de ambiente GOOGLE_CLIENT_ID.
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const API_KEY = process.env.API_KEY!;
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let gapiInited = false;
let gisInited = false;
let tokenClient: any; // google.accounts.oauth2.TokenClient

// Promessas para garantir que as bibliotecas sejam carregadas antes do uso
const gapiLoadPromise = new Promise<void>((resolve) => {
  // @ts-ignore
  window.gapiLoaded = () => gapi.load('client:picker', () => { gapiInited = true; resolve(); });
});

const gisLoadPromise = new Promise<void>((resolve) => {
  // @ts-ignore
  window.gisLoaded = () => {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: '', // O callback será tratado pela promessa na chamada
    });
    gisInited = true;
    resolve();
  };
});

async function ensureLibrariesLoaded() {
    await gapiLoadPromise;
    await gisLoadPromise;
}

// Função para solicitar o token de acesso
function requestAccessToken(): Promise<any> {
  return new Promise(async (resolve, reject) => {
    await ensureLibrariesLoaded();
    
    // @ts-ignore
    const gapiToken = gapi.client.getToken();
    if (gapiToken && gapiToken.access_token) {
        return resolve(gapiToken);
    }

    tokenClient.callback = (resp: any) => {
      if (resp.error) {
        return reject(new Error(`Google Auth Error: ${resp.error}`));
      }
      // @ts-ignore
      gapi.client.setToken(resp);
      resolve(resp);
    };

    if (!gapiToken || !gapiToken.access_token) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    }
  });
}

// Função para salvar o histórico no Google Drive
export const saveHistoryToDrive = async (history: PostData[]): Promise<string> => {
    if (!CLIENT_ID) throw new Error("Google Client ID não está configurado.");
    
    const token = await requestAccessToken();
    const historyJson = JSON.stringify(history, null, 2);
    const fileName = 'amplifyai_history.json';

    return new Promise((resolve, reject) => {
        const pickerCallback = async (data: any) => {
            if (data.action === google.picker.Action.PICKED) {
                const folderId = data.docs[0].id;
                
                const boundary = '-------314159265358979323846';
                const delimiter = "\r\n--" + boundary + "\r\n";
                const close_delim = "\r\n--" + boundary + "--";

                const metadata = {
                    name: fileName,
                    mimeType: 'application/json',
                    parents: [folderId]
                };

                const multipartRequestBody =
                    delimiter +
                    'Content-Type: application/json\r\n\r\n' +
                    JSON.stringify(metadata) +
                    delimiter +
                    'Content-Type: application/json\r\n\r\n' +
                    historyJson +
                    close_delim;
                
                try {
                    // @ts-ignore
                    const request = gapi.client.request({
                        path: '/upload/drive/v3/files',
                        method: 'POST',
                        params: { uploadType: 'multipart' },
                        headers: { 'Content-Type': 'multipart/related; boundary="' + boundary + '"' },
                        body: multipartRequestBody
                    });

                    request.execute((file: any, rawResponse: any) => {
                        if (file && file.id) {
                            resolve(file.name);
                        } else {
                            console.error("Drive API response error:", rawResponse);
                            reject(new Error(file.error?.message || "Falha ao fazer upload do arquivo."));
                        }
                    });

                } catch (e) {
                     reject(e);
                }
            } else if (data.action === google.picker.Action.CANCEL) {
                reject(new Error("Seleção de pasta cancelada pelo usuário."));
            }
        };

        const view = new google.picker.View(google.picker.ViewId.FOLDERS);
        view.setMimeTypes("application/vnd.google-apps.folder");

        const picker = new google.picker.PickerBuilder()
            .setAppId(CLIENT_ID.split('-')[0])
            .setOAuthToken(token.access_token)
            .addView(view)
            .setTitle("Selecione uma pasta para salvar o histórico")
            .setDeveloperKey(API_KEY)
            .setCallback(pickerCallback)
            .build();
        picker.setVisible(true);
    });
};

// Função para carregar o histórico do Google Drive
export const loadHistoryFromDrive = async (): Promise<PostData[]> => {
    if (!CLIENT_ID) throw new Error("Google Client ID não está configurado.");
    
    const token = await requestAccessToken();
    
    return new Promise((resolve, reject) => {
        const pickerCallback = async (data: any) => {
            if (data.action === google.picker.Action.PICKED) {
                const fileId = data.docs[0].id;
                try {
                    // @ts-ignore
                     const response = await gapi.client.drive.files.get({
                        fileId: fileId,
                        alt: 'media'
                    });
                    
                    if (response.result) {
                        // O `response.result` já é o objeto JSON parseado
                        if (Array.isArray(response.result) && response.result.every(item => 'id' in item && 'theme' in item)) {
                            resolve(response.result as PostData[]);
                        } else {
                            reject(new Error("O arquivo selecionado não parece ser um backup válido do AmplifyAI."));
                        }
                    } else {
                        // Em alguns casos, o corpo da resposta é uma string que precisa ser parseada
                        const parsed = JSON.parse(response.body);
                        resolve(parsed as PostData[]);
                    }

                } catch (e: any) {
                    console.error("Error fetching/parsing file:", e);
                    const errorMessage = e.result?.error?.message || e.message || "Falha ao ler o conteúdo do arquivo.";
                    reject(new Error(errorMessage));
                }
            } else if (data.action === google.picker.Action.CANCEL) {
                 reject(new Error("Seleção de arquivo cancelada pelo usuário."));
            }
        };

        const view = new google.picker.View(google.picker.ViewId.DOCS);
        view.setMimeTypes("application/json");

        const picker = new google.picker.PickerBuilder()
            .setAppId(CLIENT_ID.split('-')[0])
            .setOAuthToken(token.access_token)
            .addView(view)
            .setTitle("Selecione o arquivo de histórico (amplifyai_history.json)")
            .setDeveloperKey(API_KEY)
            .setCallback(pickerCallback)
            .build();
        picker.setVisible(true);
    });
};