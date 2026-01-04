Here is the **TextUI Visual Flow** for your Local Plasgos Clone. You can copy-paste this into your project documentation or just use it to visualize the logic flow.

### 1. The High-Level Topology (Dashboard View)
This represents your **Host Machine (64GB RAM)** and how the pieces fit together.

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  🖥️  HOST MACHINE (Local Server)                                        │
│  IP: 192.168.1.X  |  RAM: 64GB                                          │
│                                                                         │
│  ┌── [ NATIVE SERVICE ] ─────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  🗄️  MySQL 8.0 (Port 3306)                                       │  │
│  │  ├── Table: users (Admins)                                        │  │
│  │  ├── Table: contacts (Millions of leads)                          │  │
│  │  ├── Table: campaigns (Broadcast logs)                            │  │
│  │  └── Table: devices (Session IDs)                                 │  │
│  │                                                                   │  │
│  └───────────────────────────────▲───────────────────────────────────┘  │
│                                  ║ (Direct Connection)                  │
│  ┌── [ DOCKER SWARM ] ───────────╫───────────────────────────────────┐  │
│  │                               ║                                   │  │
│  │  ┌─────────────────┐      ┌───╫─────────────┐      ┌───────────┐  │  │
│  │  │ 🧠 Node.js      │◄────►│ ⚡ Redis Stack  │◄────►│ 🐍 OCR    │  │  │
│  │  │ (The Brain)     │      │ (Queues/Vector) │      │ (Python)  │  │  │
│  │  └───────▲─────────┘      └─────────────────┘      └─────┬─────┘  │  │
│  │          │                                               │        │  │
│  │          ▼ HTTP                                   Reads  │        │  │
│  │  ┌─────────────────┐                                  Disk        │  │
│  │  │ 💬 WAHA Engine  │◄────────────────────────────────────┘        │  │
│  │  │ (Multi-Session) │                                              │  │
│  │  └───────▲─────────┘                                              │  │
│  │          │                                                        │  │
│  └──────────╫────────────────────────────────────────────────────────┘  │
│             │                                                           │
└─────────────╫───────────────────────────────────────────────────────────┘
              │
      ┌───────▼───────┐
      │ ☁️  Internet   │
      └───────▲───────┘
              │
      ┌───────▼───────┐
      │ 📱 End Users  │ (WhatsApp Mobile)
      └───────────────┘
```

---

### 2. The "Broadcast" Workflow (Plasgos Logic)
This visualizes how the **Spintax** and **Device Rotation** work to prevent bans.

```text
🛑 START: Admin creates Campaign "Mega Promo"
   Msg: "{Hi|Hello|Halo} [name], check this!"
   Target: Tag "Leads" (3 Contacts)

[ 🧠 Node.js Backend ]
  │
  ├── 1. Fetch Contacts from MySQL ➔ [Budi, Siti, Joko]
  │
  ├── 2. Generate Jobs (Split & Spin)
  │    ├── Job A: "Hi Budi..."
  │    ├── Job B: "Hello Siti..."
  │    └── Job C: "Halo Joko..."
  │
  └── 3. Push to Redis Queue ➔ [ 📥 Broadcast_Queue ]

        ⏳ (Delay: 10s) 
             │
             ▼
[ 👷 Worker Process ] 
  │
  ├── CHECK: Fetch Available Devices from MySQL
  │   ├── Device 1 (Active)
  │   └── Device 2 (Active)
  │
  ├── 🔄 ROUND ROBIN LOGIC:
  │   ├── Process Job A ➔ Assign to Device 1
  │   ├── Process Job B ➔ Assign to Device 2
  │   └── Process Job C ➔ Assign to Device 1
  │
  └── 🚀 EXECUTE:
      ├── Call WAHA API (Session: Device 1) ➔ Send to Budi
      ├── Call WAHA API (Session: Device 2) ➔ Send to Siti
      └── Call WAHA API (Session: Device 1) ➔ Send to Joko

[ 📱 WhatsApp Network ] ➔ 📨 Delivered!
```

---

### 3. The "Group Grabber" Workflow
How to extract thousands of numbers from a group.

```text
[ 👤 Admin UI ]
   │
   └── Click: "Grab Contacts from 'Community Reseller'"
         │
         ▼
[ 🧠 Node.js ] ─── GET /api/groups/123/participants ───► [ 💬 WAHA ]
                                                             │
                                                             │ (Fetch from Phone)
                                                             ▼
[ 🧠 Node.js ] ◄── JSON [ {id: 6281..}, {id: 6282..} ] ──────┘
   │
   ├── Loop through IDs
   ├── Check if exists in MySQL
   └── INSERT INTO `contacts` (phone, tags=["From Group"])
         │
         ▼
[ 🗄️ MySQL ] ➔ ✅ 250 New Leads Saved!
```

---

### 4. The "RAG / Auto-Reply" Workflow
How the system decides between a predefined keyword reply or an AI reply.

```text
📨 INCOMING MESSAGE: "Berapa harga paket premium?" (User: 628123...)

[ 💬 WAHA ] ─── Webhook (POST) ───► [ 🧠 Node.js ]
                                         │
                                         ▼
                                 [ 🚦 Logic Controller ]
                                         │
    ┌────────────────────────────────────┴────────────────────────────────┐
    │                                                                     │
    ▼                                                                     ▼
[ 🔎 Keyword Check ]                                             [ 🤖 AI Check ]
(Query MySQL `auto_replies`)                                     (Is AI Mode On?)
    │                                                                     │
    ├── FOUND? "harga"                                                    ├── YES
    │   ├── Return: "Harga Rp 50.000"                                     │
    │   └── Stop.                                                         ▼
    │                                                            [ ⚡ Redis Vector ]
    └── NOT FOUND?                                               (Search Knowledge)
        └── Proceed to AI ──────────────┐                                 │
                                        │                                 ▼
                                        │                        [ Context Found ]
                                        │                        "Premium costs 50k"
                                        │                                 │
                                        ▼                                 ▼
                                  [ 🧠 OpenAI API ] ◄─── Prompt: "Context + Question"
                                        │
                                        ▼
                                  "The premium package is 50k."
                                        │
                                        ▼
                                 [ 💬 WAHA Send ] ───► 📱 User
```

### 5. The "Media OCR" Workflow
How an image becomes searchable text.

```text
📁 User sends: "Invoice.pdf"

[ 💬 WAHA ]
   │
   ├── 1. Download file ──► /media_storage/Invoice.pdf
   │                        (Shared Volume)
   │
   └── 2. Webhook ───────► [ 🧠 Node.js ]
                              │
                              ├── 3. Detect File Type
                              └── 4. Call OCR Service
                                     │
           ┌─────────────────────────┘
           ▼
[ 🐍 OCR Container ]
   │
   ├── 5. Read /media_storage/Invoice.pdf (Direct Disk Access)
   ├── 6. Extract Text: "Total: Rp 100.000"
   └── 7. Return JSON
           │
           ▼
[ 🧠 Node.js ]
   │
   ├── 8. Save Text to [MySQL] (for keywords)
   └── 9. Generate Embedding ➔ Save to [Redis] (for AI search)
```