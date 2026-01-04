# Incoming Message Workflow & AI Rotation

**Date**: 2026-01-04
**Context**: Implementation of real-time device status sync and randomized AI provider load balancing.

## 🔄 System Flow Diagram

```mermaid
sequenceDiagram
    participant WA as WhatsApp User
    participant WE as WAHA Engine
    participant BE as Backend (ReplyService)
    participant OCR as PaddleOCR Microservice
    participant DB as MySQL Database
    participant AI as AI Provider Gateway
    participant RAG as Vector Store (Redis)

    WA->>WE: Sends Message (Text/Image)
    WE->>BE: Webhook (POST /webhooks/waha)
    
    Note over BE: Verify HMAC Signature
    
    alt is Image/Document
        BE->>OCR: Scan shared file
        OCR-->>BE: Extracted Text
    end

    BE->>DB: Check Keyword Match (AutoReply Table)
    
    alt Keyword Found
        DB-->>BE: Response Template
    else No Keyword Match
        BE->>DB: Get Available AI Providers
        DB-->>BE: List of Active Providers
        
        Note over BE: Random Rotation Selection
        
        BE->>RAG: Search Similar (Contextual Query)
        RAG-->>BE: Relevant Data Chunks
        
        BE->>AI: generateResponse(Context + Question)
        AI-->>BE: Sales Persona Response
    end

    Note over BE: Apply Spintax & Personalization

    rect rgb(240, 240, 240)
        Note right of BE: Anti-Blocking Flow
        BE->>WE: sendSeen
        BE->>WE: startTyping
        Note over BE: Random Delay (30ms per char)
        BE->>WE: stopTyping
    end

    BE->>WE: sendText(Final Response)
    WE->>WA: Delivers WhatsApp Message
    
    BE->>DB: Increment Provider Daily Usage
```

## 🛠️ Key Components

### 1. Device Status Synchronization
- **Real-time Check**: The API now verifies the session status against the WAHA Engine on every list request.
- **Fail-safe**: Devices missing in WAHA are marked as `DISCONNECTED` in the database, triggering a "Reconnect Required" UI state on the frontend.

### 2. AI Rotation & Load Balancing
- **Pool Management**: Supports multiple OpenAI-compatible API keys.
- **Selection Logic**: Picks a provider randomly among those with the same highest priority level who haven't hit their `dailyLimit`.
- **Automatic Reset**: `dailyUsed` counters are reset automatically by the service when the first request of a new UTC day arrives.

### 3. Integrated OCR
- Automatically triggered for images and documents.
- Converts visual data into searchable text before passing it to the Keyword or AI engines.

## 🚀 Future Enhancements (TODO)
- [ ] Grouping contacts by area code for localized responses.
- [ ] Integration of cooling periods between high-frequency replies.
- [ ] Advanced URL shortening for links in auto-replies.
