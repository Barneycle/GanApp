import { LoggerService } from './loggerService';

export class EmailService {
  /**
   * Send email to a user using Resend API
   */
  static async sendEmail(
    to: string,
    subject: string,
    htmlBody: string,
    textBody?: string
  ): Promise<{ success?: boolean; error?: string }> {
    try {
      // Get Resend API key from environment variables
      const resendApiKey = import.meta.env.VITE_RESEND_API_KEY;
      const fromEmail = import.meta.env.VITE_RESEND_FROM_EMAIL || 'noreply@ganapp.com';

      if (!resendApiKey) {
        LoggerService.warn('Resend API key not found. Email will not be sent.');
        return { error: 'Email service not configured. Please set VITE_RESEND_API_KEY in your environment variables.' };
      }

      // Call Resend API
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [to],
          subject,
          html: htmlBody,
          text: textBody || htmlBody.replace(/<[^>]*>/g, ''),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        LoggerService.error('Resend API error', data);
        return { error: data.message || `Failed to send email: ${response.statusText}` };
      }

      return { success: true };
    } catch (error) {
      LoggerService.error('Email sending error', error);
      return { error: error instanceof Error ? error.message : 'Failed to send email' };
    }
  }

  /**
   * Send ban notification email
   */
  static async sendBanEmail(
    userEmail: string,
    userName: string,
    banUntil: Date,
    reason?: string
  ): Promise<{ success?: boolean; error?: string }> {
    const banDate = banUntil.toLocaleDateString();
    const banTime = banUntil.toLocaleTimeString();
    const isPermanent = banUntil.getTime() > new Date('2099-12-31').getTime();

    const subject = 'Account Suspension Notice - GanApp';
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9fafb; padding: 20px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Account Suspension Notice</h1>
          </div>
          <div class="content">
            <p>Dear ${userName || 'User'},</p>
            <p>We are writing to inform you that your GanApp account has been suspended.</p>
            ${isPermanent
        ? '<p><strong>This suspension is permanent.</strong></p>'
        : `<p><strong>Suspension Period:</strong> Until ${banDate} at ${banTime}</p>`
      }
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            <p>During this suspension period, you will not be able to access your account or use GanApp services.</p>
            ${!isPermanent
        ? '<p>If you believe this suspension was made in error, please contact our support team for assistance.</p>'
        : '<p>If you have any questions or concerns, please contact our support team.</p>'
      }
            <p>Thank you for your understanding.</p>
            <p>Best regards,<br>The GanApp Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textBody = `
Account Suspension Notice - GanApp

Dear ${userName || 'User'},

We are writing to inform you that your GanApp account has been suspended.

${isPermanent
        ? 'This suspension is permanent.'
        : `Suspension Period: Until ${banDate} at ${banTime}`
      }

${reason ? `Reason: ${reason}` : ''}

During this suspension period, you will not be able to access your account or use GanApp services.

${!isPermanent
        ? 'If you believe this suspension was made in error, please contact our support team for assistance.'
        : 'If you have any questions or concerns, please contact our support team.'
      }

Thank you for your understanding.

Best regards,
The GanApp Team

---
This is an automated message. Please do not reply to this email.
    `;

    return await this.sendEmail(userEmail, subject, htmlBody, textBody);
  }

  /**
   * Send unban notification email
   */
  static async sendUnbanEmail(
    userEmail: string,
    userName: string
  ): Promise<{ success?: boolean; error?: string }> {
    const subject = 'Account Access Restored - GanApp';
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #059669; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9fafb; padding: 20px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Account Access Restored</h1>
          </div>
          <div class="content">
            <p>Dear ${userName || 'User'},</p>
            <p>We are pleased to inform you that your GanApp account suspension has been lifted.</p>
            <p>Your account access has been fully restored, and you can now log in and use all GanApp services as normal.</p>
            <p>We appreciate your patience during this time.</p>
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            <p>Welcome back!</p>
            <p>Best regards,<br>The GanApp Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textBody = `
Account Access Restored - GanApp

Dear ${userName || 'User'},

We are pleased to inform you that your GanApp account suspension has been lifted.

Your account access has been fully restored, and you can now log in and use all GanApp services as normal.

We appreciate your patience during this time.

If you have any questions or need assistance, please don't hesitate to contact our support team.

Welcome back!

Best regards,
The GanApp Team

---
This is an automated message. Please do not reply to this email.
    `;

    return await this.sendEmail(userEmail, subject, htmlBody, textBody);
  }
}

