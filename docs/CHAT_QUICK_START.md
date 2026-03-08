# Chat System Quick Start

## Implemented Features ✅

### ChatService Methods
- ✅ `createPrivateChat` - створення приватного чату 1-на-1
- ✅ `createGroupChat` - створення групового чату
- ✅ `createPostChat` - створення/отримання чату для поста
- ✅ `joinChat` - приєднання до групового чату
- ✅ `leaveChat` - вихід з чату
- ✅ `deleteChatForUser` - видалення чату для користувача
- ✅ `getUserChats` - отримання списку чатів користувача
- ✅ `getChat` - отримання деталей чату
- ✅ `markChatAsRead` - позначення чату як прочитаного

### MessageService Methods
- ✅ `sendMessage` - відправка повідомлення
- ✅ `getMessages` - отримання повідомлень з пагінацією
- ✅ `editMessage` - редагування власного повідомлення
- ✅ `deleteMessage` - видалення власного повідомлення (м'яке)
- ✅ `addFiles` - додавання файлу до повідомлення
- ✅ `deleteFile` - видалення файлу
- ✅ `markAsRead` - позначення повідомлень як прочитаних

### REST API Endpoints

#### Chat Controller (`/api/chats`)
- ✅ `POST /chats` - створення чату
- ✅ `POST /posts/:postId/chat` - чат для поста
- ✅ `GET /chats` - список чатів
- ✅ `GET /chats/:chatId` - деталі чату
- ✅ `POST /chats/:chatId/join` - приєднатися
- ✅ `POST /chats/:chatId/leave` - вийти
- ✅ `DELETE /chats/:chatId` - видалити для себе
- ✅ `POST /chats/:chatId/read` - прочитано

#### Message Controller
- ✅ `GET /chats/:chatId/messages` - отримати повідомлення
- ✅ `POST /chats/:chatId/messages` - відправити повідомлення
- ✅ `PATCH /messages/:messageId` - редагувати
- ✅ `DELETE /messages/:messageId` - видалити
- ✅ `POST /messages/:messageId/files` - додати файл
- ✅ `DELETE /files/:fileId` - видалити файл

### WebSocket Events

#### Client → Server
- ✅ `chat:join` - приєднатися до кімнати чату
- ✅ `chat:leave` - покинути кімнату чату
- ✅ `message:send` - відправити повідомлення
- ✅ `message:edit` - редагувати повідомлення
- ✅ `message:delete` - видалити повідомлення
- ✅ `chat:typing` - індикатор набору
- ✅ `chat:read` - прочитано

#### Server → Client
- ✅ `connected` - підтвердження з'єднання
- ✅ `user:joined` - користувач приєднався
- ✅ `user:left` - користувач вийшов
- ✅ `message:new` - нове повідомлення
- ✅ `message:edited` - повідомлення відредаговано
- ✅ `message:deleted` - повідомлення видалено
- ✅ `user:typing` - користувач друкує
- ✅ `chat:read` - позначено як прочитане

## Files Created/Modified

### Services
- `src/modules/chat/services/chat.service.ts` - повна реалізація
- `src/modules/message/services/message.service.ts` - повна реалізація

### Controllers
- `src/modules/chat/chat.controller.ts` - всі routes
- `src/modules/message/message.controller.ts` - всі routes

### Gateway
- `src/modules/chat/chat.gateway.ts` - WebSocket gateway

### DTOs
- `src/modules/message/dtos/send-message.dto.ts` - оновлено
- `src/modules/message/dtos/add-file.dto.ts` - створено

### Modules
- `src/modules/chat/chat.module.ts` - налаштовано
- `src/modules/message/message.module.ts` - налаштовано

### Documentation
- `docs/CHAT_API.md` - повна документація

## Quick Test

### 1. Start the server
```bash
npm run dev
```

### 2. Test REST API
```bash
# Login to get token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password","deviceId":"test-device"}'

# Create a private chat
curl -X POST http://localhost:3001/api/chats \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"PRIVATE","participantIds":["other-user-id"]}'

# Get your chats
curl -X GET http://localhost:3001/api/chats \
  -H "Authorization: Bearer YOUR_TOKEN"

# Send a message
curl -X POST http://localhost:3001/api/chats/CHAT_ID/messages \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello!"}'
```

### 3. Test WebSocket (Frontend)
```typescript
import io from 'socket.io-client';

const socket = io('http://localhost:3001/chat', {
  query: { userId: 'your-user-id' }
});

socket.on('connected', () => console.log('Connected!'));
socket.emit('chat:join', { chatId: 'your-chat-id' });
socket.on('message:new', (data) => console.log('New message:', data));
```

## Database Models Used

- `Chat` - основна модель чату
- `PrivateChat` - зв'язок для приватних чатів
- `ChatMember` - учасники чату
- `Message` - повідомлення
- `MessageFile` - файли повідомлень

## Security Notes

⚠️ **Для production необхідно:**
1. Замінити `userId` з query параметрів на JWT authentication у WebSocket
2. Налаштувати CORS для production
3. Додати rate limiting
4. Всі ендпоінти захищені `@ApiBearerAuth('JWT-auth')`

## Architecture

```
ChatModule
  ├── ChatController (REST)
  ├── ChatService (Business Logic)
  └── ChatGateway (WebSocket)
      └── uses MessageService

MessageModule
  ├── MessageController (REST)
  └── MessageService (Business Logic)
```

## Next Steps

1. Тестування всіх endpoint'ів
2. Додавання unit tests
3. Додавання e2e tests
4. Налаштування WebSocket authentication з JWT
5. Додавання read receipts table (optional)

Для детальної документації див. `docs/CHAT_API.md`
