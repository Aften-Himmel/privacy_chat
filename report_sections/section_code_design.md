## Code Design

### Overview

Privacy Chat is structured as a decoupled full-stack web application consisting of an independently deployed Node.js backend and a React single-page application frontend. The backend follows a layered architecture pattern where the entry point configures the Express application and Socket.IO server, route modules handle HTTP endpoints for distinct feature domains, middleware enforces authentication and security, Mongoose models enforce the data schema, and the Socket.IO manager handles all real-time event logic. The frontend is organised into pages, reusable components, context providers for global state, utility modules for cryptographic operations, and an Axios instance configured for authenticated communication with the backend.

### Backend Architecture

The backend entry point is `server.js`, which initialises the Express application, attaches security middleware including Helmet for HTTP headers and express-rate-limit for authentication route throttling, mounts the individual route modules under their respective `/api` path prefixes, creates the HTTP server and wraps it with a Socket.IO instance, and finally connects to MongoDB Atlas before starting the listener. The `io` instance is stored on the Express application object so that route handlers can access it to push real-time notifications to connected clients without directly importing the Socket.IO module.

Route handling is divided into five modules: `routes/auth.js` covers all identity operations including OTP dispatch, registration, login, logout, profile updates, and password recovery; `routes/contacts.js` handles user search, contact removal, and the bilateral cleanup cascade; `routes/invitations.js` manages the full invitation lifecycle; `routes/messages.js` manages persistent message creation, file upload, read receipts, message deletion, and the complete private session lifecycle including start, message send, and end; and `routes/groups.js` covers group creation, member and admin management, and group deletion with cascading cleanup.

Authentication is enforced by a single `middleware/auth.js` module that reads the JWT from the HttpOnly cookie on every request, verifies it against the JWT secret, and attaches the decoded user identity to `req.user` for downstream use. All protected routes apply this middleware.

### Private Session Architecture

The defining architectural component of the backend is the in-memory private message store defined in `socket/privateStore.js`. It exports a JavaScript `Map` keyed by session ID, with three simple functions: `storePrivateMessage` to append a message object, `getPrivateMessages` to retrieve the array, and `clearPrivateMessages` to irrecoverably delete the entire entry. This design means private messages require zero database interaction. When a private session is started, a `Session` document is written to MongoDB only to track the session's lifecycle state; the messages themselves never touch any driver, write-ahead log, or disk buffer. Session teardown is triggered through four independent pathways — explicit end-session API call, WebSocket disconnect event, Beacon API page-unload signal, and server restart — all of which converge on `clearPrivateMessages` and concurrent file deletion via `fs.unlink`.

### Real-Time Communication

The `socket/socketManager.js` module sets up a JWT authentication middleware on the Socket.IO server so that every WebSocket handshake is authenticated before a connection is established. On connection, the socket handler joins the user into all their group rooms, marks them online in the `onlineUsers` Map and in the database, and broadcasts the updated online user list. The same handler manages typing indicator events, cleanup of active private sessions on disconnect, and all notification delivery. The `sendNotification` utility function looks up a target user's current socket ID from the Map and emits directly to that socket, providing targeted real-time delivery without broadcasting to all clients.

### Frontend Architecture

The frontend React application uses a context-based global state pattern. `AuthContext` holds the authenticated user object and exposes `login`, `logout`, and a `loading` flag; it verifies session validity on every page load by calling the `/api/auth/me` endpoint, which validates the HttpOnly cookie server-side. `SocketContext` manages the Socket.IO client connection, keeping it synchronised with the authenticated user's identity. The Axios instance in `utils/api.js` is configured with `withCredentials: true` so that the HttpOnly authentication cookie is included automatically on every request, and a response interceptor redirects to the login page on any 401 response.

Cryptographic operations for end-to-end encryption are isolated in `utils/crypto.js`, which wraps the browser's Web Crypto API to perform ECDH key pair generation, shared secret derivation, AES-GCM key derivation via HKDF, and message encryption and decryption. Non-extractable private keys are persisted between sessions using `utils/keyStore.js`, which reads and writes `CryptoKey` objects to IndexedDB. This separation ensures that all cryptographic logic remains in dedicated utility modules and is not scattered across component files.

### Design Principles Applied

The codebase follows the separation of concerns principle throughout: each route file handles exactly one domain, each context handles one slice of global state, and cryptographic logic is fully isolated from UI logic. The soft delete pattern using the `deletedFor` array avoids data duplication while enabling per-user message visibility. The deterministic conversation ID convention eliminates the need for a separate Conversations collection, reducing the schema footprint. The use of Mongoose post-delete hooks for cascading cleanup ensures referential integrity without requiring explicit cleanup calls from route handlers on every delete operation.
