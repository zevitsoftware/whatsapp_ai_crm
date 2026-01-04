# RAG Testing Guide

## Quick Start

### 1. Restart Backend
```bash
docker-compose restart backend
```

### 2. Check Logs
```bash
docker-compose logs -f backend
```

Look for:
```text
🧠 Initializing Vector Service...
[VectorService] Initializing local embedding model...
[VectorService] Connected to Redis Stack
[VectorService] ✅ Ready for vector operations
```

### 3. Upload Test Document

#### Option A: Via Frontend (AI Agent Page)
- Navigate to AI Agent page
- Upload a PDF or TXT file
- Wait for status to change: PROCESSING → VECTORIZED

#### Option B: Via API
```bash
curl -X POST http://localhost:3000/api/knowledge-base/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test_document.pdf"
```

### 4. Test RAG Chat

```bash
curl -X POST http://localhost:3000/api/ai/test-chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the main features of your product?"
  }'
```

**Expected Response:**
```json
{
  "question": "What are the main features of your product?",
  "answer": "Based on our knowledge base, the main features include...",
  "timestamp": "2026-01-04T03:37:29.000Z"
}
```

---

## Troubleshooting

### Model Download Issues
If you see "Downloading model..." for a long time:
- First run downloads ~80MB model
- Subsequent runs use cached model
- Check Docker volume has enough space

### No Context Found
If AI responds without using knowledge base:
```text
[AIService] Found 0 relevant knowledge chunks
```

**Possible causes:**
1. File not yet vectorized (check status)
2. Question not semantically related to content
3. Vector index not created

**Fix:**
```bash
# Check Redis index
docker exec -it crm-redis redis-cli
> FT._LIST
# Should show: kb_vectors

# Check stored vectors
> KEYS kb:*
```

### Vector Service Not Initialized
```text
Error: Vector service not ready
```

**Fix:**
- Restart backend container
- Check Redis Stack is running
- Verify Redis connection in logs

---

## Advanced Testing

### Test Vector Search Directly

```javascript
// In Node.js REPL or test script
const vectorService = require('./src/services/vector.service');

await vectorService.initialize();

const results = await vectorService.searchSimilar({
  userId: 'your-user-id',
  query: 'pricing information',
  topK: 5
});

console.log(results);
```

### Inspect Redis Vectors

```bash
docker exec -it crm-redis redis-cli

# List all vector keys
KEYS kb:*

# Get specific chunk
HGETALL kb:file-id-here:0

# Search index info
FT.INFO kb_vectors
```

---

## Performance Benchmarks

Expected timings:
- **Upload 1MB PDF**: ~2-5 seconds (OCR)
- **Vectorization**: ~1-3 seconds (embedding generation)
- **Search query**: ~10-50ms
- **Full RAG response**: ~1-3 seconds (AI API call dominates)

---

## Sample Test Documents

Create these test files to verify RAG:

### `product_features.txt`
```text
Our product offers three main features:
1. Real-time analytics dashboard
2. Automated customer segmentation
3. Multi-channel campaign management

The analytics dashboard provides insights into customer behavior,
conversion rates, and ROI metrics. All data is updated in real-time.
```

### `pricing.txt`
```text
Pricing Plans:

Starter: $29/month - Up to 1,000 contacts
Professional: $99/month - Up to 10,000 contacts
Enterprise: Custom pricing - Unlimited contacts

All plans include 24/7 support and free onboarding.
```

### Test Questions:
1. "What features does the product have?"
2. "How much does the professional plan cost?"
3. "What's included in all plans?"

---

## Success Criteria

✅ Backend starts without errors  
✅ Vector service initializes successfully  
✅ Files upload and vectorize (status: VECTORIZED)  
✅ RAG chat returns contextual answers  
✅ Backend logs show "Found X relevant knowledge chunks"  
✅ Answers reference uploaded content  

---

## Next: Frontend Integration

Once backend RAG is working:
1. Build chat UI component
2. Add real-time messaging
3. Display source citations
4. Show knowledge base status

See: `TODO.md` → Phase 6.10
