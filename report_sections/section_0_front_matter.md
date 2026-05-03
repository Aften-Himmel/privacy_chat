## Improved Front Matter (Declaration, Acknowledgement, Abstract)

---

### Declaration

I hereby declare that the project entitled "Privacy Chat — A Full-Stack Real-Time Ephemeral Messaging Application", submitted in partial fulfilment of the requirements for the award of the degree of Master of Computer Applications (MCA) at Manipal University Jaipur, is an authentic record of original work carried out by me under the guidance and supervision of Dr. Rekha Jain, Department of Computer Applications.

I affirm that this project is the product of my own research, independent study, and technical development, and it has not been submitted, in part or in full, to any other university or institution for the award of any degree, diploma, or certificate. All published and unpublished sources of information, data, figures, code libraries, and third-party materials used in this work have been properly acknowledged and cited in accordance with academic integrity standards. I accept full responsibility for the authenticity, accuracy, and originality of the contents presented in this report.

The source code for the project is maintained in a version-controlled Git repository and is available for verification upon request.

Student Name: Choudhary Aakash Mahendra Singh
Registration Number: 2424150020
Date: May 2026

---

### Acknowledgement

I wish to express my sincere and heartfelt gratitude to all those who have contributed to the successful completion of this project.

First and foremost, I am deeply indebted to my project guide, Dr. Rekha Jain, for her continuous mentorship, insightful technical guidance, and constructive critiques throughout every phase of this work. Her expertise in software engineering principles and her patient review of both my code and documentation were instrumental in shaping the direction, quality, and rigour of this project.

I extend my sincere appreciation to the Head of the Department and the entire faculty of the Department of Computer Applications, Manipal University Jaipur, for fostering an environment of academic excellence and for providing access to the resources, infrastructure, and knowledge that made this project possible. Their dedication to student development has been a constant source of motivation.

I am also grateful to my classmates and peers who contributed through technical discussions, testing feedback, and collaborative problem-solving during the development and debugging phases. Their willingness to critically evaluate my work improved its robustness and usability.

Finally, I owe my deepest gratitude to my family for their unwavering love, patience, and moral support. Their encouragement provided me with the resilience and determination needed to see this project through to completion.

---

### Abstract

Digital communication platforms have become indispensable in contemporary society; however, they routinely store user conversations on centralised servers, engendering persistent privacy risks including data breaches, unauthorised government surveillance, and forensic data recovery. Conventional messaging applications such as WhatsApp, Telegram, and Discord maintain permanent server-side message logs, and even features marketed as "disappearing messages" are governed by client-side timers that are susceptible to circumvention through modified clients, screenshots, or cloud backup synchronisation. Users requiring genuinely ephemeral communication — whistleblowers, legal professionals, medical practitioners, or individuals valuing conversational privacy — presently lack any mainstream application that provides an architectural guarantee against message recovery.

Privacy Chat addresses this critical gap by introducing a dual-mode messaging architecture: a Normal Mode where messages are persisted in MongoDB for reliable history and retrieval, and a Private Mode where messages exist exclusively in volatile server RAM (via a JavaScript `Map` data structure) and are irrecoverably destroyed when the session ends, the user disconnects, or the server restarts. Unlike policy-based privacy promises, this approach furnishes a verifiable, architectural guarantee of ephemeral communication — private messages never touch any persistent storage medium at any point in their lifecycle.

The system is implemented as a full-stack, decoupled web application comprising a Node.js/Express 5 REST API with Socket.IO 4 real-time communication on the backend, and a React 19 SPA built with Vite 7 and Tailwind CSS 4 on the frontend. The feature set encompasses one-to-one DM messaging, group chat with administrative controls, file sharing (up to 100 MB across 30+ MIME types), real-time typing indicators, read receipts with visual checkmarks, unread message badges, bulk message deletion (delete for me / delete for everyone with file cleanup), invitation-based contact management, email-verified registration via SMTP OTP, password recovery, user profile management (avatar upload, username and password changes), and dark/light theme toggling. Security is enforced through JWT authentication (7-day expiry), bcrypt password hashing (12 salt rounds), Helmet HTTP security headers, express-rate-limit middleware, CORS origin restriction, MIME type whitelisting for file uploads, and filename sanitisation.

The private messaging subsystem manages session lifecycle events — start, end, disconnect, and page unload (via the Beacon API) — through coordinated Socket.IO events, ensuring that RAM cleanup is triggered on every possible exit path. Testing confirmed that no private message data persists in MongoDB under any tested termination scenario. This work demonstrates that ephemeral, privacy-first communication can be implemented using mainstream, open-source web technologies without specialised cryptographic hardware, offering a practical architectural blueprint for privacy-conscious application developers.

Keywords: Ephemeral Messaging, Real-Time Communication, WebSocket, Privacy-by-Architecture, Socket.IO, Node.js, React, MongoDB, JWT Authentication, In-Memory Store
