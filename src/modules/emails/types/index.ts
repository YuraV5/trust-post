export type EmailVerificationTask = {
  to: string;
  name: string;
  verificationUrl: string;
};

export type PasswordResetTask = {
  to: string;
  passwordResetUrl: string;
};

export type AccountActivationTask = {
  to: string;
  activationUrl: string;
};
