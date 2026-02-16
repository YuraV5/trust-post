export type NewUserInput = {
  email: string;
  name: string;
  password: string;
};

export type UpdateUserInput = {
  email?: string;
  name?: string;
  photoUrl?: string;
};

export type UserOutput = {
  id: string;
  name: string;
  email: string;
  photoUrl: string | null;
  createdAt: Date;
};

export type UserProfileOutput = UserOutput & {
  isEmailVerified: boolean;
};

export type UserSecyredOutput = UserOutput & {
  password: string | null;
  role: 'USER' | 'ADMIN' | 'MODERATOR';
  isActive: boolean;
  isEmailVerified: boolean;
  updatedAt: Date;
};

export type UpdatePasswordInput = {
  newPassword: string;
  currentPassword: string;
};

export type UserAdminOutput = Omit<UserSecyredOutput, 'password'>;
