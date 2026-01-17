import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  name?: string; // Display Name

  @IsOptional()
  @ApiProperty()
  @IsEmail()
  email?: string; // Email Address

  @IsOptional()
  @ApiProperty()
  @IsString()
  @MaxLength(500)
  bio?: string; // Bio

  @ApiPropertyOptional({
    description: 'Profile image URL from Cloudinary',
    example:
      'https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg',
  })
  @IsOptional()
  @IsString()
  @IsUrl()
  profileImageUrl?: string;
}
