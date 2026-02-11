export type EmailJobData = {
  to: string; // Email recipient
  subject: string; // Email subject
  template: string; // Template name (e.g., 'welcome', 'reset-password')
  context?: Record<string, any>; // Data for the template (user name, links, etc.)
};
