import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'
import { generateKeyPair } from '../utils/crypto'
import {
  loadPrivateKey,
  loadPublicKeyJWK,
  savePrivateKey,
  savePublicKeyJWK,
  clearKeys,
} from '../utils/keyStore'

const AuthContext = createContext()

// isTokenExpired removed because tokens are securely stored in HttpOnly cookies
// Ensure E2E key pair exists and public key is uploaded to server
const ensureE2EKeys = async () => {
  try {
    let publicKeyJWK = await loadPublicKeyJWK()
    let privateCryptoKey = await loadPrivateKey()

    if (!publicKeyJWK || !privateCryptoKey) {
      // Check if legacy keys exist in localStorage and migrate them
      const legacyPub = localStorage.getItem('e2e_public_key')
      const legacyPriv = localStorage.getItem('e2e_private_key')

      if (legacyPub && legacyPriv) {
        // Migrate: import old JWK private key as non-extractable CryptoKey
        const privJWK = JSON.parse(legacyPriv)
        privateCryptoKey = await crypto.subtle.importKey(
          'jwk',
          privJWK,
          { name: 'ECDH', namedCurve: 'P-256' },
          false, // non-extractable
          ['deriveKey']
        )
        publicKeyJWK = JSON.parse(legacyPub)
        await savePrivateKey(privateCryptoKey)
        await savePublicKeyJWK(publicKeyJWK)
        // Clean up legacy storage
        localStorage.removeItem('e2e_private_key')
        localStorage.removeItem('e2e_public_key')
      } else {
        // Generate fresh key pair (private key is non-extractable)
        const kp = await generateKeyPair()
        publicKeyJWK = kp.publicKeyJWK
        privateCryptoKey = kp.privateCryptoKey
        await savePrivateKey(privateCryptoKey)
        await savePublicKeyJWK(publicKeyJWK)
      }
    }

    // Upload public key to server (idempotent)
    await api.post('/auth/public-key', { publicKey: JSON.stringify(publicKeyJWK) })
  } catch (err) {
    console.error('E2E key setup error:', err.message)
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const { data } = await api.get('/auth/me');
        setUser(data);
        ensureE2EKeys();
      } catch (err) {
        // If 401, they are not logged in.
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuthStatus();
  }, [])

  const login = (userData, token) => {
    // We no longer save token or user to localStorage.
    // The backend handles the HttpOnly cookie for the token.
    setUser(userData)
    ensureE2EKeys()
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err.message);
    }
    await clearKeys()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)