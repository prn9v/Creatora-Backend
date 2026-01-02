import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as Brevo from '@getbrevo/brevo';

@Injectable()
export class MailService {
  private apiInstance;

  constructor() {
    // 1. Initialize the Brevo API Client
    this.apiInstance = new Brevo.TransactionalEmailsApi();

    // 2. Configure Authentication
    this.apiInstance.setApiKey(
      Brevo.TransactionalEmailsApiApiKeys.apiKey,
      process.env.BREVO_API_KEY,
    );
  }

  async sendOtpEmail(email: string, otp: number): Promise<void> {
    const sendSmtpEmail = new Brevo.SendSmtpEmail();

    sendSmtpEmail.subject = 'Creatora Password Reset Verification Code';
    sendSmtpEmail.sender = {
      name: 'Creatora',
      email: 'pranavdeshmukh5454@gmail.com',
    };
    sendSmtpEmail.to = [{ email: email }];
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              
              <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); overflow: hidden;">
                
                <tr>
                  <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid #eeeeee;">
                    <h1 style="margin: 0; color: #1a8f5a; font-size: 28px; letter-spacing: 1px;">Creatora</h1>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #333333; font-size: 22px; margin-top: 0;">Password Reset Request</h2>
                    <p style="color: #666666; font-size: 16px; line-height: 1.6;">
                      Hello,
                    </p>
                    <p style="color: #666666; font-size: 16px; line-height: 1.6;">
                      We received a request to reset the password for your Creatora account. 
                      To complete the process, please enter the verification code below:
                    </p>

                    <div style="margin: 30px 0; text-align: center;">
                      <div style="display: inline-block; padding: 20px 40px; background-color: #f0fdf4; border: 1px dashed #1a8f5a; border-radius: 6px;">
                        <span style="font-size: 36px; font-weight: bold; color: #1a8f5a; letter-spacing: 8px;">${otp}</span>
                      </div>
                    </div>

                    <p style="color: #666666; font-size: 14px; line-height: 1.6;">
                      ⚠️ <strong>Security Note:</strong> This code is valid for <strong>15 minutes</strong>. 
                      If you did not request this password reset, please ignore this email or contact support if you have concerns.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="background-color: #333333; padding: 20px; text-align: center;">
                    <p style="color: #aaaaaa; font-size: 12px; margin: 0;">
                      &copy; ${new Date().getFullYear()} Creatora. All rights reserved.
                    </p>
                    <p style="color: #aaaaaa; font-size: 12px; margin: 5px 0 0 0;">
                      This is an automated message, please do not reply.
                    </p>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    try {
      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
    } catch (error) {
      console.error('❌ Brevo Error:', error);
      throw new InternalServerErrorException('Failed to send OTP email');
    }
  }

  async sendAccountDeletionEmail(email: string, name: string): Promise<void> {
    const sendSmtpEmail = new Brevo.SendSmtpEmail();

    sendSmtpEmail.subject = 'Creatora Account Deletion';
    sendSmtpEmail.sender = {
      name: 'Creatora',
      email: 'pranavdeshmukh5454@gmail.com',
    };
    sendSmtpEmail.to = [{ email: email }];
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Account Deleted</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              
              <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); overflow: hidden;">
                
                <tr>
                  <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid #eeeeee;">
                    <h1 style="margin: 0; color: #e53e3e; font-size: 28px; letter-spacing: 1px;">Creatora</h1>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #333333; font-size: 22px; margin-top: 0;">Account Deletion Confirmation</h2>
                    <p style="color: #666666; font-size: 16px; line-height: 1.6;">
                      Dear ${name || 'User'},
                    </p>
                    <p style="color: #666666; font-size: 16px; line-height: 1.6;">
                      We are writing to confirm that your <strong>Creatora</strong> account has been permanently deleted as per your request.
                    </p>
                    
                    <div style="background-color: #fff5f5; border-left: 4px solid #e53e3e; padding: 15px; margin: 20px 0;">
                      <p style="color: #c53030; font-size: 14px; margin: 0;">
                        <strong>Status:</strong> All your personal data and content have been removed from our servers.
                      </p>
                    </div>

                    <p style="color: #666666; font-size: 16px; line-height: 1.6;">
                      We are sorry to see you go. If you decide to return in the future, you will be always welcome to create a new account.
                    </p>

                    <p style="color: #666666; font-size: 16px; line-height: 1.6;">
                      Thank you for being a part of our journey.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="background-color: #333333; padding: 20px; text-align: center;">
                    <p style="color: #aaaaaa; font-size: 12px; margin: 0;">
                      &copy; ${new Date().getFullYear()} Creatora. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    try {
      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
    } catch (error) {
      console.error('❌ Brevo Error:', error.body || error);
    }
  }
}
