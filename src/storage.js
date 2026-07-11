const DB_NAME = 'fleek-relist';
const STORE_NAME = 'zustand';
const DB_VERSION = 1;
const fallback = new Map();

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
  });
}

async function runTransaction(mode, action) {
  if (typeof indexedDB === 'undefined') return null;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = action(store);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result ?? null);
    transaction.oncomplete = () => db.close();
  });
}

export const indexedDbStorage = {
  getItem: async (name) => {
    try {
      return (await runTransaction('readonly', (store) => store.get(name))) ?? fallback.get(name) ?? null;
    } catch {
      return fallback.get(name) ?? null;
    }
  },
  setItem: async (name, value) => {
    fallback.set(name, value);
    try {
      await runTransaction('readwrite', (store) => store.put(value, name));
    } catch {
      // In-memory persistence keeps the app usable when IndexedDB is unavailable.
    }
  },
  removeItem: async (name) => {
    fallback.delete(name);
    try {
      await runTransaction('readwrite', (store) => store.delete(name));
    } catch {
      // Nothing else to remove when IndexedDB is unavailable.
    }
  },
};
