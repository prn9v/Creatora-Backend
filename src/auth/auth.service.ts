import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { MailService } from 'src/common/email/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async signup(email: string, password: string, name?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new UnauthorizedException('Email already in use');
    }

    const hashed = await this.hash(password);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashed,
        name,
      },
    });

    return this.issueTokens(user);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await this.compare(user.password, password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(user);
  }

  async refreshToken(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return this.issueTokens(user);
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ 
      where: { email },
    });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000);
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); 

    // Update user with OTP and expiry
    await this.prisma.user.update({
      where: { email },
      data: { 
        resetOtp: otp.toString(),
        resetOtpExpiresAt: otpExpiresAt,
      },
    });

    await this.mailService.sendOtpEmail(email, otp);

    return {
      message: 'OTP sent successfully',
      success: true,
    };
  }

  async verifyOtpAndResetPassword(user: any, otp: string, newPassword: string) {

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.resetOtp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    if (!user.resetOtpExpiresAt || user.resetOtpExpiresAt < new Date()) {
      throw new BadRequestException('OTP has expired');
    }

    // Hash new password
    const hashedPassword = await this.hash(newPassword);

    // Update password and clear OTP fields
    await this.prisma.user.update({
      where: { email: user.email },
      data: { 
        password: hashedPassword,
        resetOtp: null,
        resetOtpExpiresAt: null,
      },
    });

    return {
      message: 'Password reset successfully',
      success: true,
    };
  }

  private async issueTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      plan: user.plan,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '1h',
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        name: user.name,
      },
    };
  }

  private async hash(password: string): Promise<string> {
    const scryptAsync = promisify(scrypt);
    const salt = randomBytes(16).toString('hex');
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString('hex')}.${salt}`;
  }

  private async compare(stored: string, supplied: string): Promise<boolean> {
    const scryptAsync = promisify(scrypt);
    const [hash, salt] = stored.split('.');
    const buf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return buf.toString('hex') === hash;
  }
}
