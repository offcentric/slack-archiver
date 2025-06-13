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

    try {
      const msg = await this.mailgun.messages.create(this.domain, {from, to, subject, text: plainText, html: html || plainText,});
      return { id: msg.id };
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
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