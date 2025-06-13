import {MailgunProvider} from "providers/mailgun";

export async function sendMail(to: string, subject: string, message: string, format: 'text' | 'html' = 'text') {
    const mailgun = new MailgunProvider();
    const params = {
        to,
        subject,
        [format]: message
    };
    return await mailgun.send(params);
}