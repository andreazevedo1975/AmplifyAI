import type { PostData } from '../types';

const DB_NAME = 'AmplifyAIDB';
const DB_VERSION = 1;
const STORE_NAME = 'posts';

let db: IDBDatabase;

function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('Database error:', request.error);
      reject('Error opening database');
    };

    request.onsuccess = (event) => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function addPost(post: PostData): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(post);

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
        console.error('Error adding post:', transaction.error);
        reject('Could not add post to the database.');
    };
  });
}

export async function getAllPosts(): Promise<PostData[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    transaction.onerror = () => {
        console.error('Error getting all posts:', transaction.error);
        reject('Could not retrieve posts from the database.');
    };
    
    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

export async function deletePost(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(id);
    
    transaction.oncomplete = () => {
        resolve();
    };

    transaction.onerror = () => {
        console.error('Error deleting post:', transaction.error);
        reject('Could not delete post from the database.');
    };
  });
}

export async function clearPosts(): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.clear();

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
        console.error('Error clearing posts:', transaction.error);
        reject('Could not clear the database.');
    };
  });
}
