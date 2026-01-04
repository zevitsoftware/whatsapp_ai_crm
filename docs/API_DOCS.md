# API Documentation

**Base URL**: `/api`

## Authentication

### Register

Create a new user account.

- **URL**: `/auth/register`
- **Method**: `POST`
- **Body**:

  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepassword",
    "companyName": "Acme Inc"
  }
  ```

- **Success Response (201)**:

  ```json
  {
    "message": "User registered successfully",
    "token": "d9ce...",
    "user": {
      "id": "uuid...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    }
  }
  ```

- **Error Response (409)**: Email already registered.

### Login

Authenticate user and get token.

- **URL**: `/auth/login`
- **Method**: `POST`
- **Body**:

  ```json
  {
    "email": "john@example.com",
    "password": "securepassword"
  }
  ```

- **Success Response (200)**:

  ```json
  {
    "message": "Login successful",
    "token": "d9ce...",
    "user": { ... }
  }
  ```

### Get Current User

Get profile of logged-in user.

- **URL**: `/auth/me`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <token>`
- **Success Response (200)**:

  ```json
  {
    "id": "uuid...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "status": "active"
  }
  ```

## Device Management

### List Devices

Get all devices for the current user.

- **URL**: `/devices`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <token>`
- **Success Response (200)**:  
  *Note: This endpoint performs a real-time status sync with WAHA.*

  ```json
  [
    {
      "id": "uuid...",
      "sessionName": "uuid...",
      "status": "SCAN_QR", // SCAN_QR, CONNECTED, DISCONNECTED, STARTING
      "metadata": { "alias": "Office Phone" },
      "createdAt": "..."
    }
  ]
  ```

### Create Device

Start a new WhatsApp session.

- **URL**: `/devices`
- **Method**: `POST`
- **Body**:

  ```json
  {
    "alias": "Marketing Phone 1"
  }
  ```

- **Success Response (201)**: `Device` object

### Get QR Code

Get QR code image data.

- **URL**: `/devices/:id/qr`
- **Method**: `GET`
- **Success Response (200)**:

  ```json
  {
    "qrCode": "data:image/png;base64,..."
  }
  ```

- **Error (404)**: Not ready or User already connected.

### Delete Device

Stop session and remove device.

- **URL**: `/devices/:id`
- **Method**: `DELETE`
- **Success Response (200)**:

  ```json
  {
    "message": "Device deleted successfully"
  }
  ```

## Contact Management

### List Contacts

Get all contacts with pagination and search.

- **URL**: `/contacts`
- **Method**: `GET`
- **Query Params**:
  - `page` (default: 1)
  - `limit` (default: 50)
  - `search` (optional: search in name/phone)
  - `tags` (optional: comma-separated tags)
- **Headers**: `Authorization: Bearer <token>`
- **Success Response (200)**:

  ```json
  {
    "total": 100,
    "page": 1,
    "limit": 50,
    "contacts": [...]
  }
  ```

### Import Contacts (CSV)

Bulk import contacts from CSV file.

- **URL**: `/contacts/import`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Body**: `file` (CSV with columns: name, phoneNumber, tags, source)
- **Success Response (200)**:

  ```json
  {
    "message": "Import completed",
    "total": 100,
    "created": 95,
    "duplicates": 5,
    "errors": 0
  }
  ```

### Delete Contact

Remove a contact.

- **URL**: `/contacts/:id`
- **Method**: `DELETE`
- **Success Response (200)**:

  ```json
  {
    "message": "Contact deleted successfully"
  }
  ```

## Campaign Management

### Create Campaign

Create a new broadcast campaign.

- **URL**: `/campaigns`
- **Method**: `POST`
- **Body**:

  ```json
  {
    "name": "New Year Promo",
    "messageTemplate": "Hi [name]! {Check out|See} our {amazing|great} offer!",
    "targetTags": ["customer", "vip"],
    "delayMin": 5,
    "delayMax": 20
  }
  ```

- **Success Response (201)**: Campaign object

### List Campaigns

Get all campaigns with pagination.

- **URL**: `/campaigns`
- **Method**: `GET`
- **Query Params**: `page`, `limit`, `status`
- **Success Response (200)**:

  ```json
  {
    "total": 10,
    "campaigns": [...]
  }
  ```

### Get Campaign Details

Get campaign with statistics.

- **URL**: `/campaigns/:id`
- **Method**: `GET`
- **Success Response (200)**:

  ```json
  {
    "id": "...",
    "name": "...",
    "status": "PROCESSING",
    "sentCount": 50,
    "stats": [
      {"status": "SENT", "count": 45},
      {"status": "FAILED", "count": 5}
    ]
  }
  ```

### Start Campaign

Begin sending messages.

- **URL**: `/campaigns/:id/start`
- **Method**: `POST`
- **Success Response (200)**:

  ```json
  {
    "message": "Campaign started",
    "queuedJobs": 100
  }
  ```

### Pause Campaign

Pause an active campaign.

- **URL**: `/campaigns/:id/pause`
- **Method**: `POST`
- **Success Response (200)**

### Delete Campaign

Remove a campaign (must be paused first).

- **URL**: `/campaigns/:id`
- **Method**: `DELETE`
- **Success Response (200)**

## OCR Service

### OCR Health Check

Check if the PaddleOCR microservice is responding.

- **URL**: `/ocr/health`
- **Method**: `GET`
- **Success Response (200)**:

  ```json
  {
    "success": true,
    "status": "healthy",
    "service": "OCR Service"
  }
  ```

### Upload and Scan

Upload an image file and get full OCR results.

- **URL**: `/ocr/upload`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Body**: `file` (Image/PDF)
- **Success Response (200)**:

  ```json
  {
    "success": true,
    "ocr": { ... }
  }
  ```

### Scan Shared File

Scan a file already present in the shared media directory.

- **URL**: `/ocr/scan`
- **Method**: `POST`
- **Body**:

  ```json
  {
    "filename": "someimage.jpg"
  }
  ```

- **Success Response (200)**: Full OCR result.

### Extract Text Only

Upload a file and get only the concatenated text.

- **URL**: `/ocr/extract-text`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Body**: `file` (Image/PDF)
- **Success Response (200)**:

  ```json
  {
    "success": true,
    "text": "Extracted text content..."
  }
  ```

## Auto-Reply Management

### Create Auto-Reply

Add a new keyword-based auto-reply.

- **URL**: `/auto-replies`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:

  ```json
  {
    "keyword": "price",
    "matchType": "CONTAINS",
    "responseText": "Our prices start from $10! {Check them out|See more} here: link",
    "priority": 10
  }
  ```

- **Success Response (201)**: Created object

### List Auto-Replies

Get all auto-replies for the current user.

- **URL**: `/auto-replies`
- **Method**: `GET`
- **Success Response (200)**: Array of objects

## AI Provider Management

### Create AI Provider

Configure a new system-wide AI provider (OpenAI compatible).

- **URL**: `/ai-providers`
- **Method**: `POST`
- **Body**:

  ```json
  {
    "name": "OpenAI Main",
    "apiKey": "sk-...",
    "model": "gpt-3.5-turbo",
    "dailyLimit": 500,
    "priority": 100
  }
  ```

- **Success Response (201)**: Created object

### List AI Providers

Get all configured AI providers.

- **URL**: `/ai-providers`
- **Method**: `GET`
- **Success Response (200)**: Array of objects

## Subscriptions

### List Packages

Get all active subscription plans.

- **URL**: `/subscriptions/packages`
- **Method**: `GET`
- **Success Response (200)**: Array of package objects

### Choose Package (Initiate Payment)

Create a transaction and get a QRIS QR code.

- **URL**: `/subscriptions/choose`
- **Method**: `POST`
- **Body**: `{ "packageId": "..." }`
- **Success Response (201)**:

  ```json
  {
    "success": true,
    "transactionId": "...",
    "qrisUrl": "...",
    "qrisImage": "data:image/png;base64,...",
    "amount": 250000
  }
  ```

### Get Subscription Status

Get the current user's subscription details.

- **URL**: `/subscriptions/status`
- **Method**: `GET`
- **Success Response (200)**:

  ```json
  {
    "subscriptionType": "PRO",
    "subscriptionStatus": "ACTIVE",
    "subscriptionExpiresAt": "2026-02-03T00:00:00Z"
  }
  ```

## Analytics

### Get Overview

Get aggregated stats for the dashboard and analytics pages.

- **URL**: `/analytics/overview`
- **Method**: `GET`
- **Success Response (200)**:

  ```json
  {
    "summary": {
      "totalCampaigns": 12,
      "activeCampaigns": 1,
      "totalContacts": 1250,
      "activeDevices": 2
    },
    "logs": [
      { "status": "DELIVERED", "count": 1050 },
      { "status": "FAILED", "count": 25 }
    ]
  }
  ```

## Link Rotator Management

### Create Link Rotator

Configure a new link rotator slug that redirects to multiple numbers.

- **URL**: `/api/links`
- **Method**: `POST`
- **Body**:

  ```json
  {
    "name": "General Support",
    "slug": "support-chat",
    "targetNumbers": ["628123456789", "628123456780"],
    "defaultMessage": "I need help with my order",
    "rotationType": "SEQUENTIAL"
  }
  ```

- **Success Response (201)**: Created object

### Public Redirect

The public URL that performs the rotation and redirect.

- **URL**: `/api/links/r/:slug`
- **Method**: `GET`
- **Action**: Redirects to `https://wa.me/<target>?text=<message>`

 
 

## Knowledge Base Management

### Upload Training Data

Upload PDF or TXT files to train the AI Agent.

- **URL**: `/knowledge-base/upload`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <token>`
- **Content-Type**: `multipart/form-data`
- **Body**: `file` (PDF or TXT, max 2.5MB)

### List Knowledge Base Files

Get all uploaded training data files.

- **URL**: `/knowledge-base`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <token>`

### Delete Training Data

Remove a file from the knowledge base.

- **URL**: `/knowledge-base/:id`
- **Method**: `DELETE`
- **Headers**: `Authorization: Bearer <token>`

## AI Chat (RAG)

### Test AI Chat

Test the AI Agent with knowledge base integration.

- **URL**: `/ai/test-chat`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <token>`
