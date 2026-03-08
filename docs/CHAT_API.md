# Chat & Messaging System - API Documentation

## Overview

Система чату та обміну повідомленнями з підтримкою REST API та WebSocket для реального часу.

## Features

- ✅ Приватні чати (1-на-1)
- ✅ Групові чати
- ✅ Чати для постів
- ✅ Відправлення, редагування, видалення повідомлень
- ✅ Прикріплення файлів до повідомлень
- ✅ WebSockets для real-time оновлень
- ✅ Індикатор набору тексту
- ✅ Прочитані повідомлення (read receipts)

---

## REST API Endpoints

### Chat Management

#### 1. Create Chat
**POST** `/api/chats`

Створює новий приватний або груповий чат.

**Request Body:**
```json
{
  "type": "PRIVATE" | "GROUP",
  "title": "Optional group chat title",
  "participantIds": ["user-uuid-1", "user-uuid-2"]
}
```

**Notes:**
- Для PRIVATE чату: `participantIds` має містити рівно 1 користувача
- Для GROUP чату: `participantIds` може містити багато користувачів, також автоматично додається creator

---

#### 2. Create Post Chat
**POST** `/api/posts/:postId/chat`

Створює або отримує чат для конкретного поста.

**Path Parameters:**
- `postId` - ID поста (number)

---

#### 3. Get User Chats
**GET** `/api/chats?page=1&limit=20`

Отримує список всіх чатів користувача.

**Query Parameters:**
- `page` - номер сторінки (default: 1)
- `limit` - кількість результатів (default: 20)

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

#### 4. Get Specific Chat
**GET** `/api/chats/:chatId`

Отримує деталі конкретного чату.

**Path Parameters:**
- `chatId` - UUID чату

---

#### 5. Join Chat
**POST** `/api/chats/:chatId/join`

Приєднатися до групового чату (недоступно для приватних чатів).

---

#### 6. Leave Chat
**POST** `/api/chats/:chatId/leave`

Покинути чат.

---

#### 7. Delete Chat for User
**DELETE** `/api/chats/:chatId`

Видалити чат для поточного користувача (видаляє користувача з чату).

---

#### 8. Mark Chat as Read
**POST** `/api/chats/:chatId/read`

Позначити всі повідомлення в чаті як прочитані.

---

### Message Management

#### 1. Get Messages
**GET** `/api/chats/:chatId/messages?page=1&limit=50`

Отримує повідомлення з чату.

**Query Parameters:**
- `page` - номер сторінки (default: 1)
- `limit` - кількість результатів (default: 50)

---

#### 2. Send Message
**POST** `/api/chats/:chatId/messages`

Відправити повідомлення в чат.

**Request Body:**
```json
{
  "content": "Hello everyone!"
}
```

---

#### 3. Edit Message
**PATCH** `/api/messages/:messageId`

Редагувати власне повідомлення.

**Request Body:**
```json
{
  "newContent": "Updated message content"
}
```

---

#### 4. Delete Message
**DELETE** `/api/messages/:messageId`

Видалити власне повідомлення (m'яке видалення, встановлює `isDeleted: true`).

---

#### 5. Add File to Message
**POST** `/api/messages/:messageId/files`

Прикріпити файл до повідомлення.

**Request Body:**
```json
{
  "url": "https://res.cloudinary.com/...",
  "storageKey": "folder/filename_abc123",
  "provider": "CLOUDINARY",
  "mimeType": "image/jpeg",
  "size": 1024000,
  "originalName": "photo.jpg"
}
```

---

#### 6. Delete File
**DELETE** `/api/files/:fileId`

Видалити файл з повідомлення.

---

## WebSocket Events

### Connection

Connect to: `ws://your-domain/chat?userId=YOUR_USER_ID`

**Note:** У production середовищі потрібно використовувати JWT authentication замість query параметра.

---

### Client → Server Events

#### 1. Join Chat Room
```typescript
socket.emit('chat:join', {
  chatId: 'chat-uuid'
});
```

Приєднатися до кімнати чату для отримання real-time оновлень.

---

#### 2. Leave Chat Room
```typescript
socket.emit('chat:leave', {
  chatId: 'chat-uuid'
});
```

---

#### 3. Send Message
```typescript
socket.emit('message:send', {
  chatId: 'chat-uuid',
  content: 'Hello everyone!'
});
```

**Response:**
```typescript
{
  success: true,
  message: { /* message object */ }
}
```

---

#### 4. Edit Message
```typescript
socket.emit('message:edit', {
  messageId: 'message-uuid',
  newContent: 'Updated content',
  chatId: 'chat-uuid'
});
```

---

#### 5. Delete Message
```typescript
socket.emit('message:delete', {
  messageId: 'message-uuid',
  chatId: 'chat-uuid'
});
```

---

#### 6. Typing Indicator
```typescript
socket.emit('chat:typing', {
  chatId: 'chat-uuid',
  isTyping: true // або false
});
```

---

#### 7. Mark as Read
```typescript
socket.emit('chat:read', {
  chatId: 'chat-uuid'
});
```

---

### Server → Client Events

#### 1. Connection Confirmed
```typescript
socket.on('connected', (data) => {
  console.log(data); // { userId, socketId }
});
```

---

#### 2. User Joined Chat
```typescript
socket.on('user:joined', (data) => {
  // { userId, chatId, timestamp }
});
```

---

#### 3. User Left Chat
```typescript
socket.on('user:left', (data) => {
  // { userId, chatId, timestamp }
});
```

---

#### 4. New Message
```typescript
socket.on('message:new', (data) => {
  // { message: {...}, chatId }
});
```

---

#### 5. Message Edited
```typescript
socket.on('message:edited', (data) => {
  // { message: {...}, chatId }
});
```

---

#### 6. Message Deleted
```typescript
socket.on('message:deleted', (data) => {
  // { messageId, chatId, timestamp }
});
```

---

#### 7. User Typing
```typescript
socket.on('user:typing', (data) => {
  // { userId, chatId, isTyping, timestamp }
});
```

---

#### 8. Chat Read
```typescript
socket.on('chat:read', (data) => {
  // { userId, chatId, timestamp }
});
```

---

## Frontend Integration Example

### React/TypeScript Example

```typescript
import io from 'socket.io-client';

// Connect to WebSocket
const socket = io('http://your-domain/chat', {
  query: { userId: currentUser.id }
});

// Listen for connection
socket.on('connected', (data) => {
  console.log('Connected:', data);
});

// Join a chat room
socket.emit('chat:join', { chatId: 'your-chat-id' });

// Listen for new messages
socket.on('message:new', (data) => {
  console.log('New message:', data.message);
  // Update your UI
});

// Send a message
socket.emit('message:send', {
  chatId: 'your-chat-id',
  content: 'Hello!'
});

// Typing indicator
const handleTyping = (isTyping: boolean) => {
  socket.emit('chat:typing', {
    chatId: 'your-chat-id',
    isTyping
  });
};

// Listen for typing indicators
socket.on('user:typing', (data) => {
  if (data.isTyping) {
    console.log(`User ${data.userId} is typing...`);
  }
});

// Disconnect when component unmounts
return () => socket.disconnect();
```

---

## Database Schema

### Chat
```prisma
model Chat {
  id        String   @id @default(uuid())
  type      ChatType @default(PRIVATE)
  title     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  members     ChatMember[]
  messages    Message[]
  PrivateChat PrivateChat?
}
```

### PrivateChat
```prisma
model PrivateChat {
  id        String   @id @default(uuid())
  chatId    String   @unique
  user1Id   String
  user2Id   String
  
  chat  Chat
  user1 User
  user2 User
  
  @@unique([user1Id, user2Id])
}
```

### ChatMember
```prisma
model ChatMember {
  id       String   @id @default(uuid())
  chatId   String
  userId   String
  joinedAt DateTime @default(now())
  
  chat Chat
  user User
  
  @@unique([chatId, userId])
}
```

### Message
```prisma
model Message {
  id        String   @id @default(uuid())
  chatId    String
  senderId  String
  content   String
  isDeleted Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  chat   Chat
  sender User
  files  MessageFile[]
}
```

### MessageFile
```prisma
model MessageFile {
  id           String       @id @default(uuid())
  messageId    String
  url          String
  storageKey   String
  provider     FileProvider
  mimeType     String
  size         Int
  originalName String
  createdAt    DateTime     @default(now())
  
  message Message
}
```

---

## Security Notes

⚠️ **Important for Production:**

1. **WebSocket Authentication**: Оновіть ChatGateway для використання JWT токенів замість query параметрів:
```typescript
// У handleConnection методі
const token = client.handshake.auth.token;
const decoded = await this.jwtService.verifyAsync(token);
client.userId = decoded.userId;
```

2. **CORS Configuration**: Налаштуйте CORS для production:
```typescript
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
  namespace: '/chat',
})
```

3. **Rate Limiting**: Додайте rate limiting для WebSocket подій.

4. **Input Validation**: Всі DTOs мають validation decorators.

---

## Testing

### Test REST Endpoints

```bash
# Create a chat
curl -X POST http://localhost:3001/api/chats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "PRIVATE",
    "participantIds": ["user-id-here"]
  }'

# Get user chats
curl -X GET http://localhost:3001/api/chats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Send a message
curl -X POST http://localhost:3001/api/chats/CHAT_ID/messages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello!"
  }'
```

---

## Configuration

Всі модулі вже налаштовані в `app.module.ts`:
- `ChatModule` - Rest API для чатів
- `MessageModule` - Rest API для повідомлень  
- Gateway знаходиться в ChatModule

---

## Next Steps / Future Improvements

- [ ] Implement read receipts table
- [ ] Add message reactions/emojis
- [ ] Add voice/video call support
- [ ] Add message search functionality
- [ ] Add pagination for older messages
- [ ] Add push notifications
- [ ] Add end-to-end encryption
- [ ] Add file upload handling (currently expects pre-uploaded URLs)
- [ ] Add message delivery status (sent, delivered, read)
- [ ] Add user presence (online/offline status)

---

## Support

Для питань або проблем створіть issue в репозиторії проекту.
