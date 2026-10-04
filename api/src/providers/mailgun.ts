import formData from 'form-data';
import Mailgun from 'mailgun.js';
import { convert } from 'html-to-text';
import { getEnvConfig } from 'helpers/config';

interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

function mailErrorSummary(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return String(error);
  }
  const record = error as {status?: unknown; message?: unknown; details?: unknown};
  const parts = [
    record.status !== undefined && record.status !== null ? `status ${record.status}` : '',
    typeof record.message === 'string' ? record.message : '',
    typeof record.details === 'string' ? record.details.slice(0, 300) : '',
  ].filter(Boolean);
  return parts.join(': ') || 'unknown mail error';
}

export class MailgunProvider {
  private mailgun: any;

  private defaultFrom: string;
  private domain: string;

  constructor(defaultFrom?: string) {
    const mailgun = new (Mailgun as any)(formData);
    const key = getEnvConfig('MAILGUN_API_KEY');
    const url =  "https://api.eu.mailgun.net";
    this.mailgun = mailgun.client({ username: 'api', key, url});
    this.defaultFrom = defaultFrom || getEnvConfig('MAILGUN_FROM_EMAIL');
    this.domain = getEnvConfig('MAILGUN_DOMAIN');
  }

  /**
   * Send an email with advanced options using Mailgun API
   * @param options Email options including to, subject, text, and optional html/from
   * @returns Promise with the message ID if successful
   */
  async send(options: SendEmailOptions): Promise<{ id: string }>;

  async send(emailOptions: SendEmailOptions): Promise<{ id: string }> {
    const { to, subject, text, html } = emailOptions;
    const from = emailOptions.from || this.defaultFrom;

    if(!this.domain){
      throw new Error('MAILGUN_DOMAIN is not set');
    }
    let plainText = text;
    if (!plainText && html) {
      // Convert HTML to plain text if only HTML is provided
      plainText = convert(html, {
        wordwrap: 130,
        preserveNewlines: true
      });
    } else if (!plainText) {
      throw new Error('Either text or html content must be provided');
    }

    console.log(`[login-code] mailgun create domain=${this.domain} from=${from} to=${to} subject=${subject} keySet=${Boolean(getEnvConfig('MAILGUN_API_KEY'))}`);
    try {
      const msg = await this.mailgun.messages.create(this.domain, {from, to, subject, text: plainText, html: html || plainText,});
      console.log(`[login-code] mailgun accepted to=${to} id=${msg?.id || 'unknown'}`);
      return { id: msg.id };
    } catch (error) {
      const summary = mailErrorSummary(error);
      console.error(`[login-code] mailgun rejected to=${to}: ${summary}`);
      throw new Error(`Failed to send email: ${summary}`);
    }
  }
}

// Example usage:
/*
const mailgun = new MailgunProvider(
  process.env.MAILGUN_API_KEY!,
  process.env.MAILGUN_DOMAIN!,
  process.env.MAILGUN_FROM_EMAIL!
);

// Simple usage
await mailgun.send('recipient@example.com', 'Hello from Mailgun!');

// Advanced usage
await mailgun.send({
  to: 'recipient@example.com',
  subject: 'Hello',
  text: 'This is a test email',
  html: '<p>This is a <strong>test</strong> email</p>',
  from: 'sender@example.com'
});
*/