import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async updateProfile(user: any, dto: UpdateProfileDto) {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent duplicate email usage
    if (dto.email && dto.email !== user.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (emailExists) {
        throw new ConflictException('Email already in use');
      }
    }

    // ✅ only update the fields that are provided
    const updateData: any = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.bio !== undefined) updateData.bio = dto.bio;
    if (dto.profileImageUrl !== undefined)
      updateData.profileImageUrl = dto.profileImageUrl;

    return this.prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        profileImageUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
