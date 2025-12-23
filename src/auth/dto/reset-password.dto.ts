import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  newPassword: string;

  @ApiProperty()
  @IsNumber()
  otp: string;
}
