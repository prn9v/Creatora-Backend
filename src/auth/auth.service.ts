import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
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
