const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const rejectPostEmailTemplate = (postTitle: string, reason: string): string => `
  <p>Dear User</p>
  <p>We regret to inform you that your post titled "<strong>${escapeHtml(postTitle)}</strong>" has been rejected.</p>
  <p><strong>Reason for Rejection:</strong> ${escapeHtml(reason)}</p>
  <p>If you have any questions or need further clarification, please feel free to contact our support team.</p>
  <p>Best regards,<br/>The TrustPost Team</p>
`;
