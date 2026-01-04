# WAHA Plus - Quick Start Guide

**Version**: WAHA Plus (Docker Image: `devlikeapro/waha-plus:gows`)
**Capabilities**: ✅ Multi-Session / Multi-Device Supported
**Integration**: Connected to Backend via Webhooks

## 🔗 Access Points

- **API Endpoint**: `http://localhost:3001`
- **Dashboard UI (Auto-Login)**: [Click Here to Access Dashboard](http://localhost:3001/dashboard/?url=http://localhost:3001&key=zevitsoft_secret_key)
- **Manual Dashboard**: [http://localhost:3001/dashboard/](http://localhost:3001/dashboard/)
- **Swagger Docs**: [http://localhost:3001/api-docs](http://localhost:3001/api-docs) (if enabled)

## 🔑 Credentials

- **Username**: `admin`
- **Password**: `d1f722c1adfe469aa8db1ed51d56e0cd` (Configured in `.env`)

## 📡 Webhook Configuration

WAHA is configured to send events to the backend:

- **URL**: `http://backend:3000/webhooks/waha` (Internal Docker Network)
- **Events**: `message.any`, `session.status`, `message.ack`

## 🛠️ Common Operations via Dashboard

1. **Create Session**:
    - Go to Dashboard > Sessions.
    - Click "Start Session".
    - Name: `default` (or verify matches `Device` session name in DB).
2. **Scan QR**:
    - Click the "QR" icon or "Screenshot" icon to view the code.
    - Scan with WhatsApp mobile app.

## 🐛 Troubleshooting

If WAHA is not starting:

1. Check logs: `docker logs crm-waha`
2. Ensure port `3001` or `3333` is not occupied.
3. **Note on Engine**: This setup uses `GOWS` (Go WhatsApp Server) which is lightweight and headless (non-browser). It consumes significantly less RAM than the Chrome-based version.
