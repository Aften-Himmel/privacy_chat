# Privacy Chat Security Measures and Code Locations

This document outlines the security measures implemented in the Privacy Chat application, along with the specific files and locations where the corresponding code is defined.

## 1. End-To-End Encryption (E2E)
All private and group messages are end-to-end encrypted. Messages are encrypted on the sender's client and decrypted only on the recipient's client, ensuring the server cannot read the plaintext content.
- **Algorithm:** **ECDH P-256** for key exchange, **AES-256-GCM** for message encryption.
- **Key Storage:** Private keys are generated as `NON-EXTRACTABLE` `CryptoKey` objects and securely stored in the browser's `IndexedDB`, preventing unauthorized extraction via malicious scripts.
- **Code Locations:**
  - `frontend/src/utils/crypto.js` (Contains E2E generation, encryption, and decryption logic for 1:1 DMs and Group chats.)
  - `frontend/src/utils/keyStore.js` (Handles the storage of `NON-EXTRACTABLE` keys into IndexedDB.)

## 2. Secure JWT Authentication (Cookies)
To mitigate Cross-Site Scripting (XSS) risks, JSON Web Tokens (JWTs) used for session authentication are no longer stored in `localStorage`. They are issued by the backend securely.
- **Mechanism:** JWTs are stored in `HttpOnly`, `Secure`, and `SameSite` cookies, ensuring they cannot be accessed by frontend JavaScript.
- **Code Locations:**
  - `backend/server.js` (Uses `cookie-parser` to automatically parse and validate secure token cookies for incoming requests.)
  - `backend/routes/auth.js` (Handles the generation of JWTs and sets the `HttpOnly` cookie payload upon successful login/registration.)

## 3. Rate Limiting for Authentication
To prevent brute-force attacks on login and registration, strict rate limiting is applied to the authentication endpoints.
- **Mechanism:** Limits requests to 20 requests per 15-minute window for identical IP addresses.
- **Code Location:**
  - `backend/server.js` (Lines 50-57, implements `express-rate-limit` as `authLimiter` which is attached specifically to `/api/auth` routes.)

## 4. HTTP Header Security
The app uses industry-standard middleware to set security-oriented HTTP headers, protecting the app from well-known web vulnerabilities like cross-site scripting, sniffing, and clickjacking.
- **Mechanism:** Helmet.js provides an easy way to configure the Cross-Origin Resource Policy and other defensive headers.
- **Code Location:**
  - `backend/server.js` (Line 40, implements `app.use(helmet(...))`.)

## 5. Volatile In-Memory Storage for Private Sessions
The core privacy architecture ensures that direct messages (DMs) during private sessions are completely decoupled from persistent database storage. 
- **Mechanism:** Sensitive messages sent during "Private Sessions" are logged to a volatile JavaScript `Map` located purely in server RAM. If the session is ended by users or the server restarts, all messages are instantly and permanently destroyed.
- **Code Locations:**
  - `backend/socket/socketManager.js` (Manages the mapping of `sessionId` to transient arrays of messages.)
  - *Noted in Document:* `report_sections/section_5_1_and_5_4_dfd_schema.md` (Level 2 DFD — Process 4.0).

## 6. Password Hashing
User passwords are computationally hashed and salted prior to database persistence. At no point is a plaintext password stored in the MongoDB Atlas database.
- **Mechanism:** `bcrypt` (with standard salt rounds).
- **Code Location:**
  - `backend/routes/auth.js` (Handles password hashing during `1.2 Register User` and `1.5 Password Recovery` features.)
