# Chat Endpoint API Documentation

## Endpoint
```
POST /api/chat
```

## Authentication
Requires Firebase ID token in Authorization header:
```
Authorization: Bearer <firebase-id-token>
```

## Rate Limiting
- 200 requests per 15 minutes per IP
- Returns 429 when exceeded

## Request Body

```typescript
{
  message: string;           // Required: 1-5000 characters
  sessionId?: string;        // Optional: UUID from previous response
  fileRefs?: string[];       // Optional: Reserved for future file upload
  metadata?: {               // Optional
    userId?: string;
    source?: "web" | "mobile";
    [key: string]: any;
  };
}
```

### Example Request (First Message)
```json
{
  "message": "Can you tell me what id get for like Outpatient Ambulatory Surgical Center?"
}
```

### Example Request (Continue Conversation)
```json
{
  "message": "What is it for BC 28 PPO?",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Response

### Success (200)
```typescript
{
  success: true;
  message: "Chat response generated successfully";
  data: {
    response: string;          // AI-generated answer
    sessionId: string;         // UUID to use for next message
    metadata: {
      sourceDocuments: string[];  // PDF filenames used for context
      model: string;              // e.g., "gpt-5-mini"
      provider: string;           // e.g., "openai"
    };
  };
}
```

### Example Success Response
```json
{
  "success": true,
  "message": "Chat response generated successfully",
  "data": {
    "response": "Based on our HR policies, you get 70% paid after deductible...",
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "metadata": {
      "sourceDocuments": ["employee-handbook.pdf", "pto-policy.pdf"],
      "model": "gpt-5-mini",
      "provider": "openai"
    }
  }
}
```

### Error Responses

#### 400 - Bad Request
```json
{
  "success": false,
  "message": "Message must be less than 5000 characters"
}
```

**Causes:**
- Message empty or > 5000 chars
- Invalid sessionId format (must be UUID)
- Invalid request body

#### 401 - Unauthorized
```json
{
  "success": false,
  "message": "Access token required"
}
```

**Causes:**
- Missing Authorization header
- Invalid or expired Firebase token

#### 429 - Too Many Requests
```json
{
  "success": false,
  "message": "Too many API requests, please try again later."
}
```

**Causes:**
- Exceeded 200 requests per 15 minutes

#### 500 - Internal Server Error
```json
{
  "success": false,
  "message": "Failed to generate AI response. Please try again."
}
```

**Causes:**
- LLM service unavailable
- Database connection error

#### 503 - Service Unavailable
```json
{
  "success": false,
  "message": "Failed to retrieve context from knowledge base"
}
```

**Causes:**
- Pinecone vector database unavailable

## Session Management

### Session Lifecycle
- **Creation:** Auto-created on first message (no sessionId provided)
- **Expiration:** 24 hours from last activity
- **History:** Keeps last 10 messages (auto-trimmed)

### Best Practices for Flutter App

1. **Store sessionId locally** (SharedPreferences/Secure Storage)
2. **Send sessionId with every message** to maintain conversation context
3. **Clear sessionId on logout** or when starting new conversation
4. **Handle 401 errors** by refreshing Firebase token
5. **Show sourceDocuments** to user for transparency
6. **Implement retry logic** for 500/503 errors with exponential backoff

## Example Flutter Implementation

```dart
// Basic chat service
class ChatService {
  final String baseUrl = 'https://your-api.com';
  String? sessionId;

  Future<ChatResponse> sendMessage(String message) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/chat'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ${await getFirebaseToken()}',
      },
      body: jsonEncode({
        'message': message,
        if (sessionId != null) 'sessionId': sessionId,
        'metadata': {
          'source': 'mobile',
          'userId': currentUserId,
        },
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      sessionId = data['data']['sessionId']; // Save for next message
      return ChatResponse.fromJson(data['data']);
    } else {
      throw ChatException(response.statusCode, response.body);
    }
  }

  void clearSession() {
    sessionId = null;
  }
}
```

## Testing

### Postman Collection
Import this collection for testing:
- Base URL: `http://localhost:4000` (development)
- Variables: `{{firebase_token}}`, `{{session_id}}`

### Example Test Scenarios

1. **Happy Path:**
   - Send message without sessionId → Get response + new sessionId
   - Send follow-up with sessionId → Get contextual response

2. **Error Handling:**
   - Send empty message → 400 error
   - Send without auth → 401 error
   - Send 201 requests quickly → 429 error

3. **Session Persistence:**
   - Send 3 messages with same sessionId
   - Verify conversation context is maintained
