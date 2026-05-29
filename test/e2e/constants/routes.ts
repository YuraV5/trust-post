/**
 * Centralized API route constants for e2e tests.
 * All routes follow the pattern: /api/v1/<resource>
 * App global prefix: /api, versioning: /v1
 */

const V1 = '/api/v1';

// --- Auth module ---
// Registration, login, logout, token refresh
export const AUTH_ROUTES = {
  register: `${V1}/auth/register`,
  login: `${V1}/auth/login`,
  logout: `${V1}/auth/logout`,
  refresh: `${V1}/auth/refresh`,
  resendVerification: `${V1}/auth/resend/verification`,
  resetPassword: `${V1}/auth/reset-password`,
};

// --- Sessions module (auth/sessions) ---
// Manage user sessions (list, delete specific, delete all)
export const SESSION_ROUTES = {
  me: `${V1}/auth/sessions/me`,
  all: `${V1}/auth/sessions/all`,
  allExceptCurrent: `${V1}/auth/sessions/all-except-current`,
  byId: (id: string) => `${V1}/auth/sessions/${id}`,
};

// --- Users module ---
// Authenticated user profile management
export const USER_ROUTES = {
  me: `${V1}/users/me`,
  mePassword: `${V1}/users/me/password`,
};

// --- Posts module ---
// Create, list, update, delete posts; manage post status and likes
export const POST_ROUTES = {
  base: `${V1}/posts`,
  my: `${V1}/posts/my`,
  byId: (id: number) => `${V1}/posts/${id}`,
  like: (id: number) => `${V1}/posts/${id}/like`,
  status: (id: number) => `${V1}/posts/${id}/status`,
  comments: (postId: number) => `${V1}/posts/${postId}/comments`,
  files: (postId: number) => `${V1}/posts/${postId}/files`,
  publicFiles: (postId: number) => `${V1}/posts/${postId}/files/public`,
};

// --- Comments module ---
// Comment CRUD + likes; moderation bulk delete for moderators
export const COMMENT_ROUTES = {
  byId: (id: number) => `${V1}/comments/${id}`,
  like: (id: number) => `${V1}/comments/${id}/like`,
  moderate: `${V1}/comments/moderate`,
};

// --- Chat module ---
// Create private/group chats, list, join, leave, mark as read
export const CHAT_ROUTES = {
  base: `${V1}/chats`,
  byId: (chatId: string) => `${V1}/chats/${chatId}`,
  addMemberByEmail: (chatId: string) => `${V1}/chats/${chatId}/members/by-email`,
  join: (chatId: string) => `${V1}/chats/${chatId}/join`,
  leave: (chatId: string) => `${V1}/chats/${chatId}/leave`,
  read: (chatId: string) => `${V1}/chats/${chatId}/read`,
  postChat: (postId: number) => `${V1}/chats/posts/${postId}/chat`,
  messages: (chatId: string) => `${V1}/chats/${chatId}/messages`,
};

// --- Payments module ---
// Create, list, regenerate payment links; public anonymous payments
export const PAYMENT_ROUTES = {
  base: `${V1}/payments`,
  my: `${V1}/payments/my`,
  regenerate: (paymentId: string) => `${V1}/payments/${paymentId}/regenerate-link`,
  anonymous: `${V1}/payments/anonymous`,
};

// --- Admin module (admin role required) ---
// Admin user management: list, create, toggle status, change role
export const ADMIN_ROUTES = {
  users: `${V1}/admin/users`,
  userById: (id: string) => `${V1}/admin/users/${id}`,
  toggleStatus: (id: string) => `${V1}/admin/users/${id}/toggle-status`,
  updateRole: (id: string) => `${V1}/admin/users/${id}/roles`,
  roleHistory: (id: string) => `${V1}/admin/users/${id}/role-history`,
  deletePosts: `${V1}/admin/posts/remove`,
};
