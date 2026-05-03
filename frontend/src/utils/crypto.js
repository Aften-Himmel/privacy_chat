// E2E Encryption Utility using Web Crypto API
// Uses ECDH P-256 for key exchange and AES-256-GCM for message encryption
// Private keys are NON-EXTRACTABLE CryptoKey objects stored in IndexedDB

// ── Key Pair Generation ──
// Returns { publicKeyJWK, privateCryptoKey }
// privateCryptoKey is non-extractable and can only be used for deriveKey
export async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    false, // NON-EXTRACTABLE — private key material cannot be read
    ['deriveKey']
  )
  const publicKeyJWK = await crypto.subtle.exportKey('jwk', keyPair.publicKey)
  return { publicKeyJWK, privateCryptoKey: keyPair.privateKey }
}

// ── Derive Shared AES-256-GCM Key (DM — 1:1) ──
// privateCryptoKey: CryptoKey from IndexedDB (non-extractable)
// publicKeyJWK: JWK of the other party's public key
export async function deriveSharedKey(privateCryptoKey, publicKeyJWK) {
  const publicKey = await crypto.subtle.importKey(
    'jwk',
    publicKeyJWK,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: publicKey },
    privateCryptoKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// ── Encrypt Message ──
export async function encryptMessage(plaintext, sharedKey) {
  const encoder = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12)) // 96-bit IV for AES-GCM
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    encoder.encode(plaintext)
  )
  return {
    ciphertext: bufferToBase64(cipherBuffer),
    iv: bufferToBase64(iv),
  }
}

// ── Decrypt Message ──
export async function decryptMessage(ciphertext, iv, sharedKey) {
  try {
    const decoder = new TextDecoder()
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBuffer(iv) },
      sharedKey,
      base64ToBuffer(ciphertext)
    )
    return decoder.decode(decryptedBuffer)
  } catch {
    // Decryption failed — message may be from a different key pair or corrupted
    return null
  }
}

// ──────────────────────────────────────────────
//  Group E2E Encryption
// ──────────────────────────────────────────────

// Encrypt a group message for all members.
// memberPublicKeys: { memberId: publicKeyJWK, ... } (all current members)
// myPrivateCryptoKey: sender's non-extractable CryptoKey
// myId: sender's user ID
// Returns: { encrypted: { c, iv }, encryptedKeys: { memberId: base64 } }
export async function encryptGroupMessage(plaintext, memberPublicKeys, myPrivateCryptoKey, myId) {
  // 1. Generate a random AES-256-GCM key for this message
  const messageKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable so we can wrap it
    ['encrypt', 'decrypt']
  )

  // 2. Encrypt the plaintext with the message key
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    messageKey,
    new TextEncoder().encode(plaintext)
  )

  // 3. Export the message key raw bytes for wrapping
  const rawMsgKey = await crypto.subtle.exportKey('raw', messageKey)

  // 4. For each group member, derive ECDH shared key and encrypt the message key
  const encryptedKeys = {}
  for (const [memberId, pubKeyJWK] of Object.entries(memberPublicKeys)) {
    const sharedKey = await deriveSharedKey(myPrivateCryptoKey, pubKeyJWK)
    const wrapIv = crypto.getRandomValues(new Uint8Array(12))
    const wrappedKey = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: wrapIv },
      sharedKey,
      rawMsgKey
    )
    // Store both IV and wrapped key together
    encryptedKeys[memberId] = bufferToBase64(wrapIv) + ':' + bufferToBase64(wrappedKey)
  }

  return {
    encrypted: { c: bufferToBase64(cipherBuffer), iv: bufferToBase64(iv) },
    encryptedKeys,
    senderId: myId,
  }
}

// Decrypt a group message.
// payload: { encrypted: { c, iv }, encryptedKeys: { memberId: base64 }, senderId }
// senderPublicKeyJWK: the sender's ECDH public key JWK
// myPrivateCryptoKey: receiver's non-extractable CryptoKey
// myId: receiver's user ID
export async function decryptGroupMessage(payload, senderPublicKeyJWK, myPrivateCryptoKey, myId) {
  try {
    const myWrapped = payload.encryptedKeys[myId]
    if (!myWrapped) return null // key not encrypted for us

    const [wrapIvB64, wrappedKeyB64] = myWrapped.split(':')
    const wrapIv = base64ToBuffer(wrapIvB64)
    const wrappedKey = base64ToBuffer(wrappedKeyB64)

    // Derive the ECDH shared key with sender's public key
    const sharedKey = await deriveSharedKey(myPrivateCryptoKey, senderPublicKeyJWK)

    // Unwrap the message key
    const rawMsgKey = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: wrapIv },
      sharedKey,
      wrappedKey
    )

    // Import the message key
    const messageKey = await crypto.subtle.importKey(
      'raw',
      rawMsgKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    )

    // Decrypt the actual message
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBuffer(payload.encrypted.iv) },
      messageKey,
      base64ToBuffer(payload.encrypted.c)
    )
    return new TextDecoder().decode(decrypted)
  } catch (err) {
    console.error('Group decryption error:', err.message)
    return null
  }
}

// ── Helpers ──
function bufferToBase64(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToBuffer(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}
