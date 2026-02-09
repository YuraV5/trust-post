export type UserRegistration = {
  email: string;
  password: string;
  name: string;
};

export type UserCredentials = {
  email: string;
  password: string;
  deviceId: string;
};

type UserOutput = {
  id: string;
  email: string;
  name: string;
  photoUrl: string | null;
};

export type AuthResponse = {
  accessToken: string;
  user: UserOutput;
};

export type UserLoginOutput = AuthResponse & {
  refreshToken: string;
};
