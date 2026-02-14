export const resetPasswordEmailTemplate = (resetLink: string): string => `
  <div style="font-family: Arial, sans-serif; color: #333;">
    <h2 style="color: #007BFF;">Password Reset Request</h2>
    <p>We received a request to reset your password. Click the button below to proceed:</p>
    <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #007BFF; color: #fff; text-decoration: none; border-radius: 5px;">Reset Password</a>
    <p>If you did not request a password reset, please ignore this email.</p>
    <p>Thank you,<br/>The Trust Post Team</p>
  </div>
`;
