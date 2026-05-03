# Chapter 1: Introduction

## 1.1 Project Overview

Privacy Chat is a full-stack, real-time web-based messaging application designed and developed with a fundamental emphasis on user privacy. In contrast to conventional messaging platforms that store every conversation permanently on centralised servers, Privacy Chat introduces a novel dual-mode messaging architecture:

- Normal Mode: Messages are persisted in a MongoDB document database, providing reliable history and retrieval for everyday communication.
- Private Mode: Messages exist exclusively in volatile server RAM (via a JavaScript `Map` data structure) and are irrecoverably destroyed the moment the session ends, the user disconnects, or the server restarts. Private messages never touch any persistent storage medium at any point in their lifecycle.

This architectural approach furnishes users with a verifiable, structural guarantee of ephemeral communication — rather than a policy-based promise that could be circumvented.

## 1.2 Motivation

The proliferation of digital communication tools has made instant messaging a cornerstone of both personal and professional interactions. However, users face a growing paradox: the tools designed to facilitate private conversations routinely store those conversations permanently, creating an ever-expanding attack surface for data breaches, government surveillance, and unauthorised forensic recovery.

Existing solutions such as WhatsApp's "disappearing messages" rely on client-side timers, which can be bypassed through screenshots, message forwarding, cloud backups, or modified client applications. No mainstream messaging platform offers a mode where messages are architecturally incapable of being persisted — where the very design of the system makes recovery impossible.

Privacy Chat was conceived to fill this gap and demonstrate that genuinely ephemeral communication can be achieved using mainstream, open-source web technologies, without specialised cryptographic hardware or complex peer-to-peer protocols.

## 1.3 Objectives

The primary objectives of this project are:

1. Design and implement a dual-mode messaging system that offers both persistent (Normal Mode) and ephemeral (Private Mode) communication channels for direct messages and group chats.

2. Guarantee message ephemerality architecturally by storing private messages exclusively in volatile server RAM, ensuring they cannot survive session termination, user disconnection, or server restart under any circumstances.

3. Build a feature-complete messaging platform supporting one-to-one DM messaging, group chats, file sharing (images, documents, audio, video up to 100 MB), real-time typing indicators, read receipts, unread message badges, and bulk message deletion.

4. Implement a secure authentication system using email-verified registration (6-digit OTP via SMTP), JWT-based stateless authentication, bcrypt password hashing, and a password recovery flow.

5. Develop an invitation-based contact management system that prevents unsolicited messaging, with mutual contact addition, real-time invitation notifications, and cascading cleanup on contact removal.

6. Ensure real-time communication through WebSocket integration (Socket.IO) for instant message delivery, online/offline status broadcasting, typing indicators, and session lifecycle notifications.

7. Deploy the application as a production-ready service with the backend (Node.js/Express) and frontend (React SPA) both hosted on Render, using environment variable management, security middleware (Helmet, CORS, rate limiting), and Git-based continuous deployment.

## 1.4 Scope of the Project

The scope of this project encompasses:

- User Authentication & Management: Registration with email OTP verification, login, profile management (avatar upload, username/password changes), and password recovery.
- Contact System: Invitation-based contact management with user search, invitation send/accept/decline, and mutual contact removal with cascading data cleanup.
- Direct Messaging: Real-time one-to-one chat with text messages (500-character limit), file sharing, read receipts, and message deletion.
- Group Messaging: Group creation, member and admin management, group chat with text and file sharing, and group deletion with message cascade.
- Private Sessions: Ephemeral messaging for both DMs and groups, with RAM-only storage, session lifecycle management, and automatic cleanup on all exit paths (explicit end, disconnect, tab close via Beacon API, server restart).
- UX Features: Typing indicators, unread message badges, online/offline status, real-time notification bell, and dark/light theme toggle.
- Security: JWT authentication, bcrypt hashing, Helmet HTTP headers, rate limiting, CORS enforcement, MIME-type whitelisting, and filename sanitisation.

## 1.5 Technology Stack Summary

| Layer | Technologies |
|-------|-------------|
| Frontend | React 19, Vite 7, Tailwind CSS 4, React Router 7, Axios, Socket.IO Client 4 |
| Backend | Node.js 18+, Express 5, Socket.IO 4, Multer, Nodemailer, Helmet, express-rate-limit |
| Database | MongoDB Atlas (Mongoose 9 ODM) |
| Authentication | JWT (jsonwebtoken), bcrypt |
| Deployment | Render (backend + frontend), Git/GitHub CI/CD |

## 1.6 Report Organisation

This report is organised into the following chapters:

| Chapter | Title | Description |
|---------|-------|-------------|
| 1 | Introduction | Project overview, motivation, objectives, and scope |
| 2 | Survey of Technology | Detailed analysis of all technologies used |
| 3 | Requirement Analysis | Problem definition, drawbacks of existing systems, functional and non-functional requirements, feasibility study, and project scheduling |
| 4 | System Design | System architecture diagrams, component diagrams, deployment diagrams, and sequence diagrams |
| 5 | Detailed Design | Data flow diagrams (DFD Level 0, 1, 2), ER diagram, data dictionary, data model, and schema design |
| 6 | Coding | Key implementation modules with annotated source code |
| 7 | Testing | Unit, integration, and security testing strategy and results |
| 8 | Limitations | Known constraints and limitations of the current implementation |
| 9 | Future Scope | Planned enhancements and potential extensions |
| 10 | References | Bibliography and technology documentation references |
