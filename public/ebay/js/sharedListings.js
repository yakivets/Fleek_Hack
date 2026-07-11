const DATABASE_NAME = 'ebay-clone-shared-listings';
const DATABASE_VERSION = 1;
const STORE_NAME = 'shared-listings';

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error('IndexedDB is not available in this browser'));
      return;
    }

    const request = globalThis.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    let blocked = false;

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
    request.onblocked = () => {
      blocked = true;
      reject(new Error('IndexedDB upgrade was blocked'));
    };
    request.onsuccess = () => {
      if (blocked) {
        request.result.close();
        return;
      }
      resolve(request.result);
    };
  });
}

function validateListings(listings) {
  if (!Array.isArray(listings)) {
    throw new TypeError('Shared listings must be an array');
  }

  listings.forEach((listing, index) => {
    if (
      !listing ||
      typeof listing !== 'object' ||
      typeof listing.id !== 'string' ||
      !listing.id.trim()
    ) {
      throw new TypeError(`Shared listing at index ${index} must have a non-empty string id`);
    }
  });
}

function runTransaction(database, mode, operation) {
  return new Promise((resolve, reject) => {
    let result;
    let settled = false;
    let transaction;

    const fail = (error) => {
      if (settled) return;
      settled = true;
      database.close();
      reject(error ?? new Error('IndexedDB transaction failed'));
    };

    try {
      transaction = database.transaction(STORE_NAME, mode);
    } catch (error) {
      fail(error);
      return;
    }

    const store = transaction.objectStore(STORE_NAME);
    transaction.onabort = () =>
      fail(transaction.error ?? new Error('IndexedDB transaction was aborted'));
    transaction.onerror = () =>
      fail(transaction.error ?? new Error('IndexedDB transaction failed'));
    transaction.oncomplete = () => {
      if (settled) return;
      settled = true;
      database.close();
      resolve(result);
    };

    try {
      result = operation(store, fail);
    } catch (error) {
      try {
        transaction.abort();
      } catch {
        // The transaction may already have become inactive.
      }
      fail(error);
    }
  });
}

export async function upsertSharedListings(listings) {
  validateListings(listings);
  if (listings.length === 0) return [];

  const database = await openDatabase();
  await runTransaction(database, 'readwrite', (store, fail) => {
    for (const listing of listings) {
      const request = store.put(listing);
      request.onerror = () =>
        fail(request.error ?? new Error(`Failed to store shared listing ${listing.id}`));
    }
  });

  return listings;
}

export async function getAllSharedListings() {
  const database = await openDatabase();
  return runTransaction(database, 'readonly', (store, fail) => {
    const request = store.getAll();
    const result = [];

    request.onsuccess = () => {
      result.push(...request.result);
    };
    request.onerror = () =>
      fail(request.error ?? new Error('Failed to read shared listings'));

    return result;
  });
}

export async function getSharedListingById(id) {
  if (typeof id !== 'string' || !id.trim()) {
    return Promise.reject(new TypeError('Shared listing id must be a non-empty string'));
  }

  const database = await openDatabase();
  const result = { value: undefined };
  await runTransaction(database, 'readonly', (store, fail) => {
    const request = store.get(id);
    request.onsuccess = () => {
      result.value = request.result;
    };
    request.onerror = () =>
      fail(request.error ?? new Error(`Failed to read shared listing ${id}`));
  });
  return result.value;
}
