# 🚀 Marketing Automation Engine - Implementation Plan

> **Project Codename**: Local Plasgos Clone  
> **Created**: 2026-01-02  
> **Architecture Reference**: `architecture.md`

---

## 📊 Executive Summary

This document outlines a comprehensive, phase-by-phase implementation plan for building a **Marketing Automation Engine** - a local WhatsApp marketing platform similar to Plasgos. The system will handle:

- **Multi-User SaaS Architecture** with signup and subscriptions
- **High-Performance Multi-Sender** utilizing 64GB Host RAM
- **Unlimited Broadcasts** with 10s controllable delays
- **Multi-Sender Device Rotation** (Round-Robin)
- **Spintax Text Processing** for message variation
- **Contact Management** (CSV import, Group Grabbing)
- **Smart Auto-Reply** (Keyword logic ➔ AI-powered RAG fallback)
- **OCR Service** (Python-based) for searchable media (Images/PDFs)
- **Link Rotator** for traffic distribution
- **Subscription Management** (Packages & Billing)

---

## 🏗️ Technology Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Node.js (v20+) + Python 3.10 (OCR) |
| **Framework** | Express.js (API) + Flask/FastAPI (OCR) |
| **Database** | MySQL 8.0 (**Native Host Service**) |
| **Cache/Queue** | Redis Stack (**Vector Store** + BullMQ) |
| **WhatsApp Engine** | WAHA Plus (Multi-session Docker) |
| **AI/RAG** | **Multi-Provider AI Gateway** (OpenAI, Gemini, Groq, DeepSeek) + Redis Vector Store |
| **Authentication** | JWT + bcrypt |
| **Media Handling** | **PaddleOCR** + Shared Docker Volumes |
| **File Management** | **FileBrowser** (Docker) - Web UI for Media Volume |
| **Frontend** | Vite.js (React) |

---

## 📁 Project Structure

```
├── backend/                       # Node.js Express API (Local Swarm)
│   ├── src/
│   │   ├── services/              # Business logic
│   │   │   ├── rag.service.js     # Vector search + AI
│   │   │   ├── ocr.service.js     # Python service wrapper
│   │   │   └── ...
│   ├── ...
│
├── frontend/                      # Vite.js Dashboard (Cloud Hosted)
│   └── ...
│
├── ocr/                           # Python PaddleOCR Service (Local Swarm)
│   ├── main.py                    # PaddleOCR/PDF logic
│   ├── requirements.txt
│   └── Dockerfile
│
├── shared_media/                  # Shared Volume for Node, WAHA, OCR
│
├── Progress/                      # Progress logs
└── docker-compose.yml             # (Backend, Redis Stack, OCR, WAHA Only)
└── .env                           # Master credentials (including external MySQL)
└── .env                           # Master credentials (including external MySQL)
```

---

# 📅 PHASE 1: Feature Logic Breakdown
 
## 1.1 PaddleOCR Microservice (First Priority)
**Goal**: Build and test the "Eyes" of the system independently.

### Tasks
- [ ] Initialize `ocr` directory with Python environment
- [ ] Create `main.py` using **FastAPI** (Automatic Swagger UI)
- [ ] Implement `POST /scan` endpoint (accepts file path or base64)
- [ ] Dockerize `ocr` service
- [ ] **Test**: Run container, open `http://localhost:5000/docs`, upload image, verify text output.

## 1.2 Node.js Backend Foundation
**Goal**: Initialize the "Brain" after the "Eyes" are working.

### Tasks
- [ ] Initialize Backend: `mkdir backend && cd backend && npm init -y`
- [ ] Shared Volume Setup: `mkdir shared_media`
- [ ] Docker Shared Network Setup (`crm-network`)
- [ ] Redis Stack Setup (Ensure Vector module is enabled)
- [ ] MySQL Connection Test (Connecting to Host from Docker)
- [ ] Create `.env.example` with all required environment variables

### Dependencies to Install
```bash
# Core
npm install express cors helmet dotenv

# Database
npm install mysql2 sequelize

# Queue
npm install bullmq ioredis

# Auth
npm install jsonwebtoken bcryptjs

# File handling
npm install multer csv-parser xlsx

# Validation
npm install joi

# HTTP client (for WAHA)
npm install axios

# Utilities
npm install dayjs uuid winston

# Dev dependencies
npm install -D nodemon eslint prettier
```

## 1.3 The Wiring (Integration)
**Goal**: Connect the Brain to the Eyes and the Mouth (WAHA).

### Tasks
- [ ] Configure Node.js to call OCR Service (`http://ocr:5000/scan`)
- [ ] Configure Node.js to receive WAHA Webhooks
- [ ] Verify `shared_media` access permissions across containers

## 1.4 Database Schema Setup
**Note**: MySQL is running natively on the host/external server, not in Docker.

### MySQL Tables to Create

```sql
-- 1. Users (Multi-tenant support)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    role ENUM('admin', 'user', 'agent') DEFAULT 'user',
    subscription_status ENUM('trial', 'active', 'expired', 'none') DEFAULT 'none',
    current_package_id INT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 1a. Subscription Packages
CREATE TABLE subscription_packages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    duration_days INT NOT NULL,
    max_devices INT DEFAULT 1,
    max_contacts INT DEFAULT 1000,
    features JSON, -- e.g. {"ai_reply": true, "rotator": false}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1b. User Subscriptions
CREATE TABLE user_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    package_id INT NOT NULL,
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP NOT NULL,
    status ENUM('active', 'expired', 'cancelled') DEFAULT 'active',
    payment_status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
    payment_reference VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES subscription_packages(id)
);

-- 2. Devices (Connected WhatsApp Sessions)
CREATE TABLE devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    session_name VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    display_name VARCHAR(100),
    status ENUM('STARTING', 'SCAN_QR', 'CONNECTED', 'DISCONNECTED', 'FAILED') DEFAULT 'STARTING',
    is_active_for_broadcast BOOLEAN DEFAULT TRUE,
    last_seen_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 3. Contacts (Multi-tenant: user_id for isolation)
CREATE TABLE contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    name VARCHAR(100),
    tags JSON DEFAULT '[]',
    source VARCHAR(100),
    metadata JSON DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_phone (user_id, phone),
    INDEX idx_phone (phone),
    INDEX idx_source (source)
);

-- 4. Contact Tags (Normalized for better querying)
CREATE TABLE contact_tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Campaigns (Multi-tenant: user_id for isolation)
CREATE TABLE campaigns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    message_template TEXT NOT NULL,
    media_url VARCHAR(500) NULL,
    media_type ENUM('image', 'video', 'document', 'audio') NULL,
    target_tags JSON DEFAULT '[]',
    target_count INT DEFAULT 0,
    sent_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    status ENUM('DRAFT', 'PENDING', 'PROCESSING', 'PAUSED', 'COMPLETED', 'CANCELLED') DEFAULT 'DRAFT',
    scheduled_at TIMESTAMP NULL,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    delay_min INT DEFAULT 5,
    delay_max INT DEFAULT 20,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_user (user_id)
);

-- 6. Campaign Logs
CREATE TABLE campaign_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id INT NOT NULL,
    contact_id INT NOT NULL,
    device_id INT,
    phone VARCHAR(20) NOT NULL,
    message_sent TEXT,
    status ENUM('QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED') DEFAULT 'QUEUED',
    error_message TEXT NULL,
    waha_message_id VARCHAR(100) NULL,
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL,
    INDEX idx_campaign_status (campaign_id, status),
    INDEX idx_contact (contact_id)
);

-- 7. Auto Replies (Multi-tenant: user_id for isolation)
CREATE TABLE auto_replies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    keyword VARCHAR(100) NOT NULL,
    match_type ENUM('EXACT', 'CONTAINS', 'STARTS_WITH', 'REGEX') DEFAULT 'CONTAINS',
    response_text TEXT NOT NULL,
    media_url VARCHAR(500) NULL,
    media_type ENUM('image', 'video', 'document', 'audio') NULL,
    is_active BOOLEAN DEFAULT TRUE,
    priority INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_keyword (keyword),
    INDEX idx_active (is_active),
    INDEX idx_user (user_id)
);

-- 8. Link Rotators (Multi-tenant: user_id for isolation)
CREATE TABLE link_rotators (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    slug VARCHAR(100) NOT NULL,
    name VARCHAR(255),
    target_numbers JSON NOT NULL,
    default_message VARCHAR(500) DEFAULT 'Hello!',
    rotation_type ENUM('RANDOM', 'SEQUENTIAL', 'WEIGHTED') DEFAULT 'SEQUENTIAL',
    click_count INT DEFAULT 0,
    current_index INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_slug (user_id, slug),
    INDEX idx_slug (slug),
    INDEX idx_user (user_id)
);

-- 9. Link Rotator Clicks (Analytics)
CREATE TABLE link_rotator_clicks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rotator_id INT NOT NULL,
    redirected_to VARCHAR(20) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    referer VARCHAR(500),
    clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rotator_id) REFERENCES link_rotators(id) ON DELETE CASCADE,
    INDEX idx_rotator (rotator_id),
    INDEX idx_clicked (clicked_at)
);

-- 10. Chat Sessions (For Human Takeover)
CREATE TABLE chat_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    device_id INT,
    is_bot_active BOOLEAN DEFAULT TRUE,
    last_message_at TIMESTAMP NULL,
    assigned_to INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_phone_device (phone, device_id),
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- 11. Chat Messages (Inbox Cache)
CREATE TABLE chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    waha_message_id VARCHAR(100),
    direction ENUM('INBOUND', 'OUTBOUND') NOT NULL,
    message_type ENUM('text', 'image', 'video', 'audio', 'document', 'location', 'contact') DEFAULT 'text',
    content TEXT,
    media_url VARCHAR(500) NULL,
    is_from_bot BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
    INDEX idx_session (session_id),
    INDEX idx_timestamp (timestamp)
);

-- 12. AI Providers (Quota Tracking)
CREATE TABLE ai_providers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    api_key_masked VARCHAR(20),
    model VARCHAR(100),
    endpoint VARCHAR(500),
    daily_limit INT DEFAULT 100,
    monthly_limit INT DEFAULT 1000,
    daily_used INT DEFAULT 0,
    monthly_used INT DEFAULT 0,
    last_daily_reset DATE DEFAULT (CURRENT_DATE),
    last_monthly_reset DATE DEFAULT (CURRENT_DATE),
    is_active BOOLEAN DEFAULT TRUE,
    priority INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_active (is_active),
    INDEX idx_priority (priority)
);

-- 13. Blacklist (Unsubscribed Contacts)
CREATE TABLE blacklist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    reason ENUM('UNSUBSCRIBE', 'SPAM_REPORT', 'MANUAL', 'BOUNCE') DEFAULT 'UNSUBSCRIBE',
    source_message TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_phone (user_id, phone),
    INDEX idx_phone (phone)
);
```

## 1.5 External Service Setup

### WAHA Plus Configuration

- [ ] Deploy WAHA Plus via Docker
- [ ] Configure multi-session support
- [ ] Set up webhook endpoints
- [ ] Test QR code generation

### Redis Setup

- [ ] Install Redis (or use Docker)
- [ ] Test connection
- [ ] Configure for BullMQ

---

# 📅 PHASE 2: Core Infrastructure

**Duration**: 2-3 Days  
**Goal**: Build foundational services and configurations

## 2.1 Configuration Layer

### Tasks

- [ ] Create database connection config
- [ ] Create Redis connection config
- [ ] Create WAHA API client config
- [ ] Set up logging with Winston

## 2.2 Sequelize Models

### Tasks

- [ ] Create all 11 models as defined in schema
- [ ] Set up model associations
- [ ] Create migration files
- [ ] Test model CRUD operations

## 2.3 Authentication & Subscription System

### Tasks

- [ ] Implement user registration (Signup)
- [ ] Implement user login with JWT
- [ ] Create subscription package seed data
- [ ] Implement subscription selection workflow
- [ ] Create auth middleware with subscription check
- [ ] Create RBAC middleware (admin vs user vs agent)
- [ ] Implement 'me' endpoint to return user stats + subscription status

## 2.4 Queue Infrastructure

### Tasks

- [ ] Set up BullMQ connection
- [ ] Create queue definitions:
  - `broadcast-queue` (for campaign messages)
  - `webhook-queue` (for WAHA events)
- [ ] Set up basic worker template
- [ ] Create queue monitoring dashboard endpoint

## 2.5 Real-Time Infrastructure (Socket.IO)

### Tasks
- [ ] Install `socket.io`
- [ ] Initialize Socket.IO server in `app.js` or separate service
- [ ] Implement Auth Middleware for Socket connections (JWT validation)
- [ ] Define Event Namespaces:
  - `/devices`: For QR code and status updates
  - `/campaigns`: For progress bars
  - `/chats`: For live messaging
- [ ] Create helper function `emitToUser(userId, event, data)` to target specific users

## 2.6 API Rate Limiting

### Tasks
- [ ] Install `express-rate-limit`
- [ ] Configure global rate limiter (e.g., 100 req/min per IP)
- [ ] Configure stricter limits for auth endpoints (e.g., 5 req/min)
- [ ] Configure relaxed limits for webhook endpoints

## 2.7 Scheduled Tasks (CRON Jobs)

### Tasks
- [ ] Install `node-cron` or use BullMQ repeatable jobs
- [ ] Implement scheduled task registry:
  - [ ] `checkExpiredSubscriptions` - Daily at 00:05
  - [ ] `executeScheduledCampaigns` - Every minute
  - [ ] `resetDailyAIQuotas` - Daily at 00:00
  - [ ] `resetMonthlyAIQuotas` - 1st of month at 00:00
  - [ ] `cleanupOldLogs` - Weekly (optional)

---

# 📅 PHASE 3: Core Logic Modules

**Duration**: 3-4 Days  
**Goal**: Implement the "brain" of the application

## 3.1 Spintax Service

### Implementation

```javascript
// src/utils/spintax.js

/**
 * Process spintax text: {Hello|Hi|Hey} becomes one of the options
 * Supports nested: {Hello|{Hi|Hey}} 
 */
function spinText(text) {
    // Process from innermost to outermost
    let result = text;
    const regex = /\{([^{}]+)\}/g;
    
    while (regex.test(result)) {
        result = result.replace(regex, (match, choices) => {
            const options = choices.split('|');
            return options[Math.floor(Math.random() * options.length)];
        });
    }
    
    return result;
}

/**
 * Replace variables: [name], [phone], etc.
 */
function replaceVariables(text, variables) {
    let result = text;
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\[${key}\\]`, 'gi');
        result = result.replace(regex, value || '');
    }
    return result;
}

/**
 * Full message processing
 */
function processMessage(template, variables = {}) {
    let message = spinText(template);
    message = replaceVariables(message, variables);
    return message.trim();
}

module.exports = { spinText, replaceVariables, processMessage };
```

### Tasks

- [ ] Implement `spinText()` function
- [ ] Implement `replaceVariables()` function
- [ ] Add unit tests for edge cases
- [ ] Support nested spintax

## 3.2 Device Rotator Service

### Implementation

```javascript
// src/services/rotator.service.js

class DeviceRotator {
    constructor() {
        this.currentIndex = new Map(); // campaignId -> index
    }

    async getNextDevice(campaignId = 'default') {
        const { Device } = require('../models');
        
        const devices = await Device.findAll({
            where: {
                status: 'CONNECTED',
                is_active_for_broadcast: true
            },
            order: [['id', 'ASC']]
        });

        if (devices.length === 0) {
            throw new Error('No active devices available');
        }

        // Get current index for this campaign
        let index = this.currentIndex.get(campaignId) || 0;
        
        // Round-robin selection
        const device = devices[index % devices.length];
        
        // Update index
        this.currentIndex.set(campaignId, index + 1);
        
        return device;
    }

    resetIndex(campaignId) {
        this.currentIndex.delete(campaignId);
    }
}

module.exports = new DeviceRotator();
```

### User-Specific Session Flow

1. User logs in.
2. User chooses/pays for a subscription package.
3. User navigates to "Connect WhatsApp".
4. System calls `createSession(userId_phone)` in WAHA.
5. System retrieves QR code and displays to user.
6. Webhook updates `devices` table when connected.

### Tasks

- [ ] Implement Round-Robin device selection
- [ ] Add device health check before selection
- [ ] Handle device unavailability gracefully
- [ ] Implement User-to-Session mapping logic

## 3.3 WAHA Service (API Wrapper)

### Tasks

- [ ] Create WAHA API client
- [ ] Implement session management:
  - `createSession(name)`
  - `getQRCode(session)`
  - `deleteSession(session)`
  - `getSessionStatus(session)`
- [ ] Implement messaging:
  - `sendText(session, phone, message)`
  - `sendImage(session, phone, imageUrl, caption)`
  - `sendDocument(session, phone, docUrl, filename)`
- [ ] Implement group operations:
  - `getGroups(session)`
  - `getGroupParticipants(session, groupId)`
- [ ] Set up webhook receiver

## 3.4 Broadcast Service

### Tasks

- [ ] Create campaign initialization logic
- [ ] Implement contact filtering by tags
- [ ] Create job queue population
- [ ] Implement broadcast worker:
  - Pop job from queue
  - Get next device (rotator)
  - Process message (spintax + variables)
  - Send via WAHA
  - Log result
  - Wait random delay
- [ ] Handle failures and retries
- [ ] Campaign pause/resume functionality

## 3.5 Contact Service

### Tasks

- [ ] CSV/Excel import with validation
- [ ] Phone number normalization (Indonesian format)
- [ ] Duplicate detection
- [ ] Tag management
- [ ] Group grabbing integration

## 3.6 Incoming Message Workflow (Unified)

### Logic Flow:
1. **Receiver**: Webhook from WAHA (`message.any`).
2. **Type Check**:
   - **IF TEXT**: Proceed directly to Step 3.
   - **IF IMAGE/DOC**: 
     - Save file to `/shared_media`.
     - Send to **PaddleOCR**.
     - **Output**: Use *Extracted Text* as the message content for Step 3.
   - **IF VIDEO/AUDIO**:
     - **Action**: STOP / IGNORE. (Future Feature)
   
3. **Step 3: Keyword Engine**: 
   - **First**: Check if sender is in `blacklist` table → If YES, STOP (do not reply).
   - Search MySQL `auto_replies` using the text (or OCR text).
   - If Match -> Send Reply.

4. **Step 4: AI Fallback** (If no keyword matches):
   - Search Redis Vector Store for context.
   - **Select AI Provider** from `ai_providers` table (skip exhausted quotas).
   - Send context + text to selected provider (Groq/DeepSeek/Gemini/OpenAI).
   - Increment provider's `daily_used` and `monthly_used` counters.
   - Send AI Reply via WAHA.

### Tasks:
- [ ] Implement `webhook.service.js` with Type Switching logic
- [ ] Configure `waha` to download media to `shared_media` volume
- [ ] Implement `ocr.service.js` for PaddleOCR communication
- [ ] Implement Keyword Matcher
- [ ] **Implement `ai.service.js` (Multi-Provider Gateway)**:
  - [ ] Load active providers from DB
  - [ ] Filter out exhausted quotas (daily/monthly)
  - [ ] Rotate by priority or round-robin
  - [ ] Call provider API and handle errors/failover
  - [ ] Update usage counters after each call
  - [ ] CRON job to reset `daily_used` at midnight
  - [ ] CRON job to reset `monthly_used` on 1st of month

---

# 📅 PHASE 4: API Development

**Duration**: 2-3 Days  
**Goal**: Build all REST API endpoints

## 4.0 API Documentation (Swagger)
- [ ] Install `swagger-jsdoc` and `swagger-ui-express`
- [ ] Configure Swagger options in `src/config/swagger.js`
- [ ] Create `/api-docs` route to serve UI
- [ ] Add JSDoc comments to all routes

## 4.1 Authentication Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login & get JWT |
| GET | `/api/auth/me` | Get current user & sub info |
| POST | `/api/auth/logout` | Invalidate token |
| POST | `/api/auth/forgot-password` | Send reset email/OTP |
| POST | `/api/auth/reset-password` | Reset with token/OTP |

## 4.9 Subscription Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/packages` | List available packages |
| POST | `/api/subscriptions/choose` | Select a package |
| POST | `/api/subscriptions/verify` | Verify payment (mock/real) |
| GET | `/api/subscriptions/status` | Get current active sub |
| POST | `/api/subscriptions/callback` | **QRIS Payment Webhook** |

### QRIS Integration (qris.online)
- [ ] Create QRIS Wrapper Service (`src/services/qris.service.js`)
- [ ] Implement `createInvoice` (calls QRIS API)
- [ ] Implement `handleCallback` to auto-activate subscription upon payment success

## 4.2 Device Management Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/devices` | List all devices |
| POST | `/api/devices` | Create new session |
| GET | `/api/devices/:session` | Get device status |
| GET | `/api/devices/:session/qr` | Get QR code |
| DELETE | `/api/devices/:session` | Delete session |
| PATCH | `/api/devices/:session/toggle` | Toggle broadcast active |

## 4.3 Contact Management Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/contacts` | List contacts (paginated) |
| POST | `/api/contacts` | Create single contact |
| POST | `/api/contacts/upload` | Bulk import CSV/Excel |
| GET | `/api/contacts/:id` | Get contact details |
| PATCH | `/api/contacts/:id` | Update contact |
| DELETE | `/api/contacts/:id` | Delete contact |
| GET | `/api/contacts/tags` | List all tags |
| POST | `/api/contacts/tags` | Create new tag |
| GET | `/api/contacts/groups` | Get WA groups (from WAHA) |
| POST | `/api/contacts/grab` | Grab members from group |

## 4.4 Campaign/Broadcast Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/campaigns` | List all campaigns |
| POST | `/api/campaigns` | Create new campaign |
| GET | `/api/campaigns/:id` | Get campaign details |
| PATCH | `/api/campaigns/:id` | Update campaign |
| DELETE | `/api/campaigns/:id` | Delete campaign |
| POST | `/api/campaigns/:id/start` | Start/schedule campaign |
| POST | `/api/campaigns/:id/pause` | Pause campaign |
| POST | `/api/campaigns/:id/resume` | Resume campaign |
| POST | `/api/campaigns/:id/cancel` | Cancel campaign |
| GET | `/api/campaigns/:id/stats` | Get real-time stats |
| GET | `/api/campaigns/:id/logs` | Get detailed logs |

## 4.5 Chat/Inbox Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chats` | List recent conversations |
| GET | `/api/chats/:phone` | Get chat session |
| GET | `/api/chats/:phone/messages` | Get message history |
| POST | `/api/chats/:phone/send` | Send manual message |
| POST | `/api/chats/:phone/toggle-bot` | Enable/disable bot |
| POST | `/api/chats/:phone/assign` | Assign to agent |

## 4.6 Auto-Reply Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auto-replies` | List all rules |
| POST | `/api/auto-replies` | Create new rule |
| PATCH | `/api/auto-replies/:id` | Update rule |
| DELETE | `/api/auto-replies/:id` | Delete rule |
| PATCH | `/api/auto-replies/:id/toggle` | Toggle active |

## 4.10 Blacklist Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/blacklist` | List blacklisted numbers |
| POST | `/api/blacklist` | Manually add to blacklist |
| DELETE | `/api/blacklist/:phone` | Remove from blacklist |

## 4.11 Knowledge Base Routes (RAG)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/knowledge` | List uploaded documents |
| POST | `/api/knowledge/upload` | Upload & embed document |
| DELETE | `/api/knowledge/:id` | Delete document & vectors |

## 4.7 Link Rotator Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rotators` | List all rotators |
| POST | `/api/rotators` | Create rotator |
| GET | `/api/rotators/:id` | Get rotator details |
| PATCH | `/api/rotators/:id` | Update rotator |
| DELETE | `/api/rotators/:id` | Delete rotator |
| GET | `/api/rotators/:id/stats` | Get click analytics |

## 4.8 Public Link Route

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/link/:slug` | Public redirect link |

---

# 📅 PHASE 5: Integration & Testing

**Duration**: 2-3 Days  
**Goal**: Connect all components and ensure reliability

## 5.1 WAHA Webhook Integration

### Webhook Events to Handle

- [ ] `message` - Incoming messages
- [ ] `message.ack` - Message delivery status
- [ ] `session.status` - Device status changes

### Tasks

- [ ] Create webhook receiver endpoint
- [ ] **Implement Webhook Signature Verification** (WAHA secret, QRIS signature)
- [ ] Route events to appropriate handlers
- [ ] Update campaign logs on delivery
- [ ] Trigger auto-reply on incoming
- [ ] Update device status on session events

## 5.2 BullMQ Worker Integration

### Tasks

- [ ] Implement broadcast worker with full flow
- [ ] Add retry logic with exponential backoff
- [ ] Implement dead letter queue for failures
- [ ] Add job progress tracking
- [ ] Implement campaign completion detection

## 5.3 Testing

### Tasks

- [ ] Unit tests for services (Jest)
- [ ] Integration tests for API endpoints
- [ ] Test campaign flow end-to-end
- [ ] Test auto-reply matching
- [ ] Load testing with multiple campaigns

## 5.4 Error Handling & Logging

### Tasks

- [ ] Global error handler middleware
- [ ] Structured logging with Winston
- [ ] Request/Response logging
- [ ] Queue job logging
- [ ] Error alerting (optional)

---

# 📅 PHASE 6: Frontend Dashboard

**Duration**: 5-7 Days  
**Goal**: Build admin dashboard UI

## 6.1 Technology Choice

- **Vite.js** (Fast build tool)
- **React.js** (UI Framework)
- **TailwindCSS** for styling (Premium aesthetics)
- **React Query** (Server state management)
- **React Router** (Navigation)
- **Axios** (API requests)
- **Socket.IO Client** (Real-time updates)

## 6.2 Dashboard Pages

### Authentication

- [ ] Login page
- [ ] Registration page (admin only)

### Device Management

- [ ] Device list with status indicators
- [ ] QR Code scanner modal
- [ ] Device settings (toggle broadcast)

### Contact Management

- [ ] Contact list with search & filter
- [ ] CSV/Excel upload modal
- [ ] Tag management
- [ ] Group grabber interface

### Campaign/Broadcast

- [ ] Campaign list (active, completed, draft)
- [ ] Campaign creation wizard:
  - Message composer with spintax preview
  - Target selection (by tags)
  - Schedule settings
  - Delay configuration
- [ ] Real-time campaign progress
- [ ] Campaign logs viewer

### Inbox/Chat

- [ ] Conversation list
- [ ] Chat interface
- [ ] Bot toggle
- [ ] Agent assignment

### Auto-Reply

- [ ] Rule list
- [ ] Rule creation/edit form
- [ ] Keyword testing tool

### Link Rotator

- [ ] Rotator list
- [ ] Create/edit modal
- [ ] Click analytics charts

### Settings

- [ ] User profile
- [ ] Team management (admin)
- [ ] System settings

### Subscription Management

- [ ] Current subscription status display
- [ ] Package selection / upgrade page
- [ ] QRIS payment modal
- [ ] Payment history list

---

# 📅 PHASE 7: Production Deployment

**Duration**: 1-2 Days  
**Goal**: Deploy and configure for production

## Tasks

- [ ] Create a shared Docker network: `docker network create crm-network`
- [ ] Configure Shared Volume for media access
- [ ] Dockerize the Node.js application (Backend)
- [ ] Dockerize the Python OCR Service
- [ ] **Cloud Deployment**: Set up Vite.js application on Cloud (Vercel/Netlify/VPS)
- [ ] Set up Docker Compose for Local Services:
  - **Node.js API**
  - **Redis Stack** (Vector Support)
  - **OCR Python**
  - **WAHA Plus**
  - **FileBrowser** (Volume Inspector)
  - **Cloudflare Tunnel (`cloudflared`)**
- [ ] Ensure all local containers share `crm-network`
- [ ] Connect Local Services to **Native MySQL** via host IP (`192.168.1.X`)
- [ ] **Exposure**: Configure `cloudflared` to route `api.zevitsoft.com` -> `http://backend:3000`
- [ ] Configure Nginx reverse proxy & SSL for local endpoints (Internal access)
- [ ] Set up database backups (Native MySQL)

---

# 📊 Estimated Timeline Summary

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: Foundation | 1-2 Days | ⬜ Not Started |
| Phase 2: Core Infrastructure | 2-3 Days | ⬜ Not Started |
| Phase 3: Core Logic | 3-4 Days | ⬜ Not Started |
| Phase 4: API Development | 2-3 Days | ⬜ Not Started |
| Phase 5: Integration & Testing | 2-3 Days | ⬜ Not Started |
| Phase 6: Frontend | 5-7 Days | ⬜ Not Started |
| Phase 7: Deployment | 1-2 Days | ⬜ Not Started |

**Total Estimated Time: 16-24 Days**

---

# 🎯 Next Steps

1. **User Approval**: Review this plan and approve/modify
2. **Start Phase 1**: Initialize project and set up database
3. **WAHA Setup**: Ensure WAHA Plus is ready (Docker)

---

# 📝 Notes

- All phases can be adjusted based on priority
- Phase 6 (Frontend) can be parallelized with Phases 4-5
- Consider MVP approach: Skip optional features initially
- WAHA Plus license required for multi-session features
