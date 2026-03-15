import { GoogleOAuthAuthResult } from '../types/google-provider';

export interface IOAuthGoogleService {
  redirectToGoogle(deviceId: string, redirectTo?: string): string;
  handleGoogleCallback(code: string, state: string, error?: string): Promise<GoogleOAuthAuthResult>;
}
