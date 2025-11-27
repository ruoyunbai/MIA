declare module 'nodemailer' {
  interface Attachment {
    filename?: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
  }

  export interface EmailHeaders {
    [key: string]: string;
  }

  export interface TransportOptions {
    host?: string;
    port?: number;
    secure?: boolean;
    auth?: {
      user?: string;
      pass?: string;
    };
  }

  export interface SentMessageInfo {
    messageId: string;
    response: string;
    accepted: string[];
    rejected: string[];
    envelope: {
      from?: string;
      to?: string[];
    };
  }

  export interface MailOptions {
    from?: string;
    to?: string | string[];
    subject?: string;
    text?: string;
    html?: string;
    cc?: string[];
    bcc?: string[];
    replyTo?: string;
    attachments?: Attachment[];
    headers?: EmailHeaders;
  }

  export interface Transporter {
    sendMail(mailOptions: MailOptions): Promise<SentMessageInfo>;
  }

  export function createTransport(options: TransportOptions): Transporter;

  const nodemailer: {
    createTransport: typeof createTransport;
  };

  export default nodemailer;
}
