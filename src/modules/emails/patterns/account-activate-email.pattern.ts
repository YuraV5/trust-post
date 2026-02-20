export const accountActivationEmailPattern = (activationUrl: string): string => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #333; margin-bottom: 20px;">Welcome! 🎉</h2>
    
    <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      Your account has been created successfully. To get started, please activate your account and set a secure password.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${activationUrl}" style="
        background-color: #007bff;
        color: white;
        padding: 14px 32px;
        text-decoration: none;
        border-radius: 6px;
        font-weight: bold;
        font-size: 16px;
        display: inline-block;
        transition: background-color 0.3s ease;
      ">
        Activate Account & Set Password
      </a>
    </div>
    
    <p style="color: #888; font-size: 14px; margin-top: 20px;">
      If you didn't create this account, you can safely ignore this email.
    </p>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    <p style="color: #aaa; font-size: 12px; text-align: center;">
      This link will expire in 24 hours.
    </p>
  </div>
`;
