import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { MailService } from 'src/common/email/mail.service';
import { UpdateProfileDto } from '../profile/dto/update-profile.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';

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

  async getMe(user: any) {
    return this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        profileImageUrl: true,
        plan: true,
        creditsUsed: true,
        creditsLimit: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,

        // Optional relations (include only if needed)
        brandProfile: true,
        pastPosts: true,
        generatedPosts: true,
        contentIdeas: true,
        weeklyPlans: true,
      },
    });
  }

  async refreshToken(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return this.issueTokens(user);
  }

  async updatePassword(user: any, dto: UpdatePasswordDto) {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Fetch full user from DB (INCLUDING password)
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      throw new NotFoundException('User not found in Database');
    }

    // Validate current password
    const isValid = await this.compare(dbUser.password, dto.currentPassword);

    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Confirm new passwords match
    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new BadRequestException('New passwords do not match');
    }

    // Prevent password reuse
    const isSamePassword = await this.compare(dbUser.password, dto.newPassword);

    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    // Hash and update
    const hashedPassword = await this.hash(dto.newPassword);

    await this.prisma.user.update({
      where: { id: dbUser.id },
      data: {
        password: hashedPassword,
      },
    });

    return {
      message: 'Password updated successfully',
      success: true,
    };
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

  async verifyOtpAndResetPassword(
    email: string,
    otp: string,
    newPassword: string,
  ) {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.resetOtp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    if (!user.resetOtpExpiresAt || user.resetOtpExpiresAt < new Date()) {
      throw new BadRequestException('OTP has expired');
    }

    const hashedPassword = await this.hash(newPassword);

    await this.prisma.user.update({
      where: { email },
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

  async deleteAccount(user: any, password: string) {
  if (!user) {
    throw new NotFoundException('User not found');
  }

  // Fetch full user from DB (INCLUDING password)
  const dbUser = await this.prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!dbUser) {
    throw new NotFoundException('User not found in database');
  }

  // Verify password using the dbUser password
  const isPasswordValid = await this.compare(dbUser.password, password);

  if (!isPasswordValid) {
    throw new BadRequestException('Invalid password');
  }

  // Optional: Send deletion confirmation email before deleting
  await this.mailService.sendAccountDeletionEmail(dbUser.email, user.name);

  // Delete user and all related data (Prisma will handle cascade if configured)
  await this.prisma.user.delete({
    where: { id: dbUser.id },
  });

  return {
    message: 'Account deleted successfully',
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
