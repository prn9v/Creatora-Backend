import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter;

  constructor() {
    this.transporter;
  }

  private async initializeTransporter() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
      }
    });
  }

  async sendOtpEmail(email: string, otp: number): Promise<void> {
    try {
      // Ensure transporter is initialized
      if (!this.transporter) {
        await this.initializeTransporter();
      }

      const info = await this.transporter.sendMail({
        from: process.env.MAIL_USER,
        to: email,
        subject: 'Password Reset OTP',
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2>Password Reset Request</h2>
            <p>Your OTP is:</p>
            <h1 style="letter-spacing: 4px;">${otp}</h1>
            <p>This OTP will expire in <strong>15 minutes</strong>.</p>
            <p>If you did not request this, please ignore this email.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error('Email error:', error);
      throw new InternalServerErrorException('Failed to send OTP email');
    }
  }
}