/**
 * E2E Test Configuration
 */

export const API_VERSION = 'v1';
export const API_PREFIX = '/api';
export const API_BASE_URL = `${API_PREFIX}/${API_VERSION}`;

/**
 * Health Endpoints
 */
export const HEALTH_ENDPOINTS = {
  CHECK: `${API_BASE_URL}/health`,
};

/**
 * Users Endpoints
 */
export const USERS_ENDPOINTS = {
  ME: `${API_BASE_URL}/users/me`,
  ME_PASSWORD: `${API_BASE_URL}/users/me/password`,
};

/**
 * Admin Users Endpoints
 */
export const ADMIN_USERS_ENDPOINTS = {
  ROOT: `${API_BASE_URL}/admin/users`,
  CHANGE_ROLE: (id: string): string => `${API_BASE_URL}/admin/users/${id}/roles`,
  ROLE_HISTORY: (id: string): string => `${API_BASE_URL}/admin/users/${id}/role-history`,
};

/**
 * Users Endpoints
 */
export const USERS_ENDPOINTS = {
  ME: `${API_BASE_URL}/users/me`,
  ME_PASSWORD: `${API_BASE_URL}/users/me/password`,
};
