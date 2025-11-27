type ReactEmailRender = typeof import('@react-email/render').render;

export type ReactEmailTemplate = Parameters<ReactEmailRender>[0];

export interface EmailAttachment {
  filename?: string;
  content?: string | Buffer;
  path?: string;
  contentType?: string;
}

export interface EmailHeaders {
  [key: string]: string;
}

export interface EmailMessage {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  attachments?: EmailAttachment[];
  headers?: EmailHeaders;
  from?: string;
  template?: ReactEmailTemplate;
}

export type EmailPayload = Omit<EmailMessage, 'template'>;
