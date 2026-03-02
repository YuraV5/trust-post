export const rejectPostEmailTemplate = (postTitle: string, reason: string): string => `
  <p>Dear User</p>
  <p>We regret to inform you that your post titled "<strong>${postTitle}</strong>" has been rejected.</p>
  <p><strong>Reason for Rejection:</strong> ${reason}</p>
  <p>If you have any questions or need further clarification, please feel free to contact our support team.</p>
  <p>Best regards,<br/>The TrustPost Team</p>
`;
