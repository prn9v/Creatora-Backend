import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter;

  constructor() {
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.MAIL_USER,
        clientId: process.env.OAUTH_CLIENT_ID,
        clientSecret: process.env.OAUTH_CLIENT_SECRET,
        refreshToken: process.env.OAUTH_REFRESH_TOKEN,
      },
    });

    // Verify connection on initialization
    try {
      await this.transporter.verify();
      console.log('✅ Mail transporter ready (OAuth2)');
    } catch (error) {
      console.error('❌ Mail transporter verification failed:', error);
    }
  }

  async sendOtpEmail(email: string, otp: number): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"Creatora" <${process.env.MAIL_USER}>`,
        to: email,
        subject: 'Creatora Password Reset Verification Code',
        html: `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
    
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="margin: 0; color: #2c2c2c;">Creatora</h1>
      <p style="margin: 5px 0 0; color: #777; font-size: 14px;">
        Empowering creators across every content domain
      </p>
    </div>

    <h2 style="color: #2c2c2c;">Password Reset Request</h2>

    <p style="font-size: 15px; line-height: 1.6;">
      We received a request to reset the password associated with your Creatora account.
      To proceed, please use the one-time verification code below:
    </p>

    <div style="background: #f5f7f9; padding: 24px; text-align: center; border-radius: 6px; margin: 30px 0;">
      <span style="display: block; font-size: 32px; letter-spacing: 10px; font-weight: bold; color: #1a8f5a;">
        ${otp}
      </span>
    </div>

    <p style="font-size: 14px; line-height: 1.6;">
      This verification code will expire in <strong>15 minutes</strong> for security reasons.
    </p>

    <p style="font-size: 14px; line-height: 1.6; color: #555;">
      If you did not initiate this request, no action is required. Your account will remain secure.
    </p>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;" />

    <p style="font-size: 12px; color: #888; line-height: 1.5;">
      This email was sent by Creatora, a leading startup platform built for creators of all types.
      Please do not reply to this automated message.
    </p>

  </div>
`,
      });

      console.log(`✅ OTP email sent to ${email}`);
    } catch (error) {
      console.error('❌ Email error:', error);
      throw new InternalServerErrorException('Failed to send OTP email');
    }
  }
}
