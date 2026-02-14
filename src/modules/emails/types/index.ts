export type EmailVerificationTask = {
  to: string;
  name: string;
  verificationUrl: string;
};

export type PasswordResetTask = {
  to: string;
  passwordResetUrl: string;
};
