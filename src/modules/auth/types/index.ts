export type UserRegistration = {
  email: string;
  password: string;
  name: string;
}

export type UserCredentials = {
  email: string;
  password: string;
}

export type LoginOutput = {
  accessToken: string;
  refreshToken: string;
  userId: string;
}