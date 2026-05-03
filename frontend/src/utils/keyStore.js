// IndexedDB-backed key store for non-extractable CryptoKey objects
// Private keys are stored as CryptoKey objects that CANNOT be exported,
// preventing XSS attacks from stealing key material.

const DB_NAME = 'e2e-keys'
const DB_VERSION = 1
const STORE_NAME = 'keys'

function openKeyDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function dbGet(key) {
  return openKeyDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.get(key)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  }))
}

function dbPut(key, value) {
  return openKeyDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.put(value, key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  }))
}

function dbDelete(key) {
  return openKeyDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.delete(key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  }))
}

// ── Public API ──

/** Save a non-extractable CryptoKey (private key) into IndexedDB */
export async function savePrivateKey(cryptoKey) {
  await dbPut('privateKey', cryptoKey)
}

/** Load the private CryptoKey from IndexedDB. Returns CryptoKey | null */
export async function loadPrivateKey() {
  return dbGet('privateKey')
}

/** Save the public key JWK object into IndexedDB */
export async function savePublicKeyJWK(jwk) {
  await dbPut('publicKeyJWK', jwk)
}

/** Load the public key JWK from IndexedDB. Returns object | null */
export async function loadPublicKeyJWK() {
  return dbGet('publicKeyJWK')
}

/** Delete all stored keys (for logout) */
export async function clearKeys() {
  try {
    const db = await openKeyDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.clear()
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // Silently ignore — DB may not exist yet
  }
  // Also clean up legacy localStorage keys
  localStorage.removeItem('e2e_private_key')
  localStorage.removeItem('e2e_public_key')
}
