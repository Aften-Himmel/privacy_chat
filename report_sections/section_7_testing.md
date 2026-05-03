# Chapter 7: Testing

This chapter describes the testing strategy and test cases employed to verify the correctness, reliability, and security of the Privacy Chat application. Testing was performed across three dimensions: unit testing (individual module verification), integration testing (cross-module workflow verification), and security testing (vulnerability and access control verification).

---

## 7.1 Unit Testing

Unit tests verify the correctness of individual functions, routes, and model behaviours in isolation.

### 7.1.1 Authentication Module

| Test Case ID | Test Case | Input | Expected Output | Result |
|-------------|-----------|-------|-----------------|--------|
| UT-AUTH-01 | Register with valid data | username, email, password, valid OTP | 201, JWT token + user object | ✅ Pass |
| UT-AUTH-02 | Register with duplicate email | Existing email | 400, "Username or email already taken" | ✅ Pass |
| UT-AUTH-03 | Register with duplicate username | Existing username | 400, "Username or email already taken" | ✅ Pass |
| UT-AUTH-04 | Register with invalid OTP | Incorrect 6-digit code | 400, "Invalid verification code" | ✅ Pass |
| UT-AUTH-05 | Register with expired OTP | Code older than 10 minutes | 400, "Verification code has expired" | ✅ Pass |
| UT-AUTH-06 | Login with correct credentials | Valid email + password | 200, JWT token + user object | ✅ Pass |
| UT-AUTH-07 | Login with wrong password | Valid email + wrong password | 400, "Invalid email or password" | ✅ Pass |
| UT-AUTH-08 | Login with non-existent email | Missing email | 400, "Invalid email or password" | ✅ Pass |
| UT-AUTH-09 | Username length validation | Username < 3 or > 20 chars | 400, "Username must be 3-20 characters" | ✅ Pass |
| UT-AUTH-10 | Password length validation | Password < 6 chars | 400, "Password must be at least 6 characters" | ✅ Pass |

### 7.1.2 Messaging Module

| Test Case ID | Test Case | Input | Expected Output | Result |
|-------------|-----------|-------|-----------------|--------|
| UT-MSG-01 | Send DM text message | Valid text (≤ 500 chars) | 201, message object with conversationId | ✅ Pass |
| UT-MSG-02 | Send message exceeding limit | Text > 500 characters | 400, "Message too long" | ✅ Pass |
| UT-MSG-03 | Send file message | Image file (.jpg, < 100 MB) | 201, message with fileUrl, fileName, fileType | ✅ Pass |
| UT-MSG-04 | Send disallowed file type | .exe file upload | 400, "File type not allowed" | ✅ Pass |
| UT-MSG-05 | Send file exceeding size limit | File > 100 MB | 400, "File too large" | ✅ Pass |
| UT-MSG-06 | Delete for me | Valid messageId | 200, message.deletedFor includes userId | ✅ Pass |
| UT-MSG-07 | Delete for everyone (own message) | Valid messageId, sender is user | 200, message deleted from DB + file removed | ✅ Pass |
| UT-MSG-08 | Delete for everyone (other's message) | messageId of another user's message | 403, "Not authorized" | ✅ Pass |
| UT-MSG-09 | Conversation ID generation | userId A, userId B (any order) | Deterministic sorted key: "smallerId_largerId" | ✅ Pass |

### 7.1.3 Private Session Module

| Test Case ID | Test Case | Input | Expected Output | Result |
|-------------|-----------|-------|-----------------|--------|
| UT-PRIV-01 | Start private session | Valid userId | 201, session object {status: 'active'} | ✅ Pass |
| UT-PRIV-02 | Start duplicate session | Already active session exists | 400, "Session already active" | ✅ Pass |
| UT-PRIV-03 | Send private message | Text + valid sessionId | 201, message with isPrivate: true | ✅ Pass |
| UT-PRIV-04 | Verify RAM storage only | Send private message, query DB | 0 matching documents in messages collection | ✅ Pass |
| UT-PRIV-05 | End session — RAM cleanup | End active session | privateMessages.get(sessionId) returns undefined | ✅ Pass |
| UT-PRIV-06 | End session — file cleanup | End session with uploaded files | Files removed from /uploads directory | ✅ Pass |
| UT-PRIV-07 | Non-participant ends session | User not in participants array | 403, "Not authorized to end this session" | ✅ Pass |

### 7.1.4 Contact Management Module

| Test Case ID | Test Case | Input | Expected Output | Result |
|-------------|-----------|-------|-----------------|--------|
| UT-CONT-01 | Search by username | Query string "john" | Array of matching users (excluding self) | ✅ Pass |
| UT-CONT-02 | Send invitation | toUserId (valid) | 201, invitation object | ✅ Pass |
| UT-CONT-03 | Duplicate invitation | Same from/to pair | 400, "Invitation already exists" | ✅ Pass |
| UT-CONT-04 | Auto-accept reverse invitation | B invites A when A already invited B | Both become mutual contacts | ✅ Pass |
| UT-CONT-05 | Remove contact — bilateral | Remove userId | Both users' contacts arrays updated | ✅ Pass |
| UT-CONT-06 | Remove contact — cascade cleanup | Remove userId | All DM messages + files deleted | ✅ Pass |

### 7.1.5 Group Module

| Test Case ID | Test Case | Input | Expected Output | Result |
|-------------|-----------|-------|-----------------|--------|
| UT-GRP-01 | Create group | name, members | 201, group with creator as admin + member | ✅ Pass |
| UT-GRP-02 | Add member (admin only) | memberId, admin user | 200, member added to group | ✅ Pass |
| UT-GRP-03 | Remove member (admin only) | memberId, admin user | 200, member removed | ✅ Pass |
| UT-GRP-04 | Remove creator | creatorId | 400, "Cannot remove the group creator" | ✅ Pass |
| UT-GRP-05 | Delete group (creator only) | Group ID, non-creator user | 403, "Only creator can delete" | ✅ Pass |
| UT-GRP-06 | Delete group — cascade messages | Group ID, creator | All group messages deleted from DB | ✅ Pass |

---

## 7.2 Integration Testing

Integration tests verify end-to-end workflows spanning multiple modules and services.

| Test Case ID | Test Workflow | Steps | Expected Result | Result |
|-------------|--------------|-------|-----------------|--------|
| IT-01 | Complete Auth Flow | Send OTP → Receive email → Register → Login → Access protected route → Token expiry → Redirect to login | Full lifecycle works; expired tokens result in 401 + redirect | ✅ Pass |
| IT-02 | Real-Time DM Messaging | A sends message → Socket.IO delivers to B → Message appears in B's chat → B opens chat → Read receipt sent → A sees blue checkmarks | Message delivery < 100ms; read receipts propagate correctly | ✅ Pass |
| IT-03 | Private Session Full Lifecycle | Start session → Send 5 private messages → Verify NOT in MongoDB → End session → Verify RAM cleared → Verify files deleted from disk | Zero private messages in DB at any point; Map entry deleted on session end | ✅ Pass |
| IT-04 | File Sharing Lifecycle | Upload 10 MB image → Verify stored in /uploads → Send as message → Recipient downloads → Delete for everyone → Verify file removed from disk | File I/O correct; cleanup removes orphaned files | ✅ Pass |
| IT-05 | Contact Removal Cascade | A removes B → Verify A's contacts updated → Verify B's contacts updated → Verify all DM messages deleted → Verify files cleaned → Verify real-time notification to B | Bilateral removal + cascade cleanup + real-time notification | ✅ Pass |
| IT-06 | Group Private Session | Admin starts group session → Members exchange private messages → Admin ends session → Verify RAM cleared → Verify normal group chat unaffected | Group private messages ephemeral; normal messages untouched | ✅ Pass |
| IT-07 | Disconnect Cleanup | A starts private session → A closes browser tab → Beacon API fires → Server ends session → B receives notification → RAM cleared | Automatic cleanup on all exit paths | ✅ Pass |
| IT-08 | Invitation Auto-Accept | A invites B → B invites A (before responding to A's) → System auto-accepts → Both become contacts | Reverse invitation detection and mutual addition | ✅ Pass |

---

## 7.3 Security Testing

| Test Case ID | Security Test | Method | Expected Behaviour | Result |
|-------------|--------------|--------|-------------------|--------|
| ST-01 | Access protected route without token | `GET /api/contacts` with no Authorization header | 401 `{ message: "No token provided" }` | ✅ Pass |
| ST-02 | Access with expired JWT | Send token with past expiry | 401 `{ message: "Invalid or expired token" }` | ✅ Pass |
| ST-03 | Rate limiting on auth routes | Send 21 requests to `/api/auth/login` within 15 min | 429 `{ message: "Too many requests" }` after 20th | ✅ Pass |
| ST-04 | Upload malicious file (.exe) | POST file with `application/x-msdownload` MIME | 400, rejected by MIME whitelist | ✅ Pass |
| ST-05 | Path traversal in filename | Upload file named `../../../etc/passwd` | Filename sanitised to `________etc_passwd` | ✅ Pass |
| ST-06 | Delete other user's messages for everyone | Call delete endpoint with non-sender userId | 403 "Not authorized" | ✅ Pass |
| ST-07 | CORS violation | API request from unauthorised origin | Request blocked by CORS middleware | ✅ Pass |
| ST-08 | Socket.IO without auth token | Connect without `handshake.auth.token` | Connection rejected: "Authentication required" | ✅ Pass |
| ST-09 | SQL/NoSQL injection in search | Search query with `{ "$gt": "" }` | Query sanitised; no unauthorised data returned | ✅ Pass |
| ST-10 | Helmet security headers | Check response headers | X-Frame-Options, CSP, HSTS all present | ✅ Pass |

---

## 7.4 Private Message Ephemerality Verification

This critical test verifies the core privacy guarantee — that private messages never appear in the database under any termination scenario.

| Scenario | Test Method | MongoDB Query After | Documents Found | Result |
|----------|-----------|-------------------|----------------|--------|
| Normal session end | User clicks "End Session" | `db.messages.find({text: /private_test/})` | 0 | ✅ Pass |
| Browser tab close | Close tab during active session | `db.messages.find({conversationId: testId})` | 0 (only normal messages) | ✅ Pass |
| Socket disconnect | Kill WebSocket connection | `db.messages.find({isPrivate: true})` | 0 (field doesn't exist in schema) | ✅ Pass |
| Server restart | Restart Node.js process | `db.messages.find({})` | Only normal messages; no private content | ✅ Pass |
| Multiple concurrent sessions | 3 simultaneous private sessions | Check all session IDs in Map after end | All entries deleted | ✅ Pass |
