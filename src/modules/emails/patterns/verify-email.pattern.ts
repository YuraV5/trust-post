export const verificationEmailPattern = (verificationLink: string, name: string): string => `
  <div style="font-family: Arial, sans-serif; color: #333;">
    <h1 style="color: #007BFF;">Welcome to Trust Post!</h1>
    <p>Hi ${name},</p>
    <h2 style="color: #007BFF;">Email Verification</h2>
    <p>Thank you for signing up! Please click the button below to verify your email address:</p>
    <a href="${verificationLink}" style="display: inline-block; padding: 10px 20px; background-color: #007BFF; color: #fff; text-decoration: none; border-radius: 5px;">Verify Email</a>
    <p>If you did not create an account, please ignore this email.</p>
    <p>Thank you,<br/>The Trust Post Team</p>
  </div>
`;
