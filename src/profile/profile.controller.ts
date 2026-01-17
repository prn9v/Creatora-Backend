import {
  Controller,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProfileService } from './profile.services';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { GetCurrentUser } from 'src/auth/decorator/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller({ path: 'users/profile', version: '1' })
@ApiTags('Users Profile')
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @UseGuards(JwtAuthGuard)
  @Put('update-profile')
  @ApiOperation({ summary: 'Update user profile information' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @ApiResponse({ status: 409, description: 'Email already in use.' })
  async updateProfile(
    @GetCurrentUser() user: any,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(user, dto);
  }
}