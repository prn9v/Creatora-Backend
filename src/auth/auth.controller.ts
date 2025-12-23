import {
  Body,
  Controller,
  Get,
  Post,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { AuthLoginDto } from './dto/auth-login.dto';
import { AuthSignupDto } from './dto/sign-up-form.dto';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { GetCurrentUser } from './decorator/current-user.decorator';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ForgetPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const AUTH_COOKIE = 'access_token'

@Controller({ path: 'users/auth', version: '1' })
@ApiTags('Users Auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @Post('login')
  async login(
    @Body() dto: AuthLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto.email, dto.password);

    res.cookie(AUTH_COOKIE, result.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 60 * 60 * 1000,
      path: '/',
    });

    return {
      user: result.user,
      success: true,
    };
  }

  @Post('signup')
  @ApiOperation({ summary: 'User signup' })
  @ApiResponse({ status: 200, description: 'SignUp successful.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  async signup(
    @Body() dto: AuthSignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.signup(
      dto.email,
      dto.password,
      dto.name,
    );

    res.cookie(AUTH_COOKIE, result.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 60 * 60 * 1000,
      path: '/',
    });

    return {
      user: result.user,
      success: true,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user data returned.' })
  me(@GetCurrentUser() user: any) {
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh-token')
  @ApiOperation({ summary: 'Refresh JWT token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully.' })
  async refreshToken(
    @GetCurrentUser() user: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.refreshToken(user.sub);

    res.cookie(AUTH_COOKIE, result.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 60 * 60 * 1000,
      path: '/',
    });

    return {
      user: result.user,
      success: true,
    };
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset OTP' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async forgotPassword(@Body() dto: ForgetPasswordDto) {
    return await this.authService.forgotPassword(dto.email);
  }

  @UseGuards(JwtAuthGuard)
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with OTP' })
  @ApiResponse({ status: 200, description: 'Password reset successful.' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP.' })
  async resetPassword(@Body() dto: ResetPasswordDto, @GetCurrentUser() user: any,) {
    return await this.authService.verifyOtpAndResetPassword(
      user,
      dto.otp,
      dto.newPassword,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(AUTH_COOKIE, {
      path: '/',
      sameSite: 'none',
      secure: true,
    });

    return { success: true };
  }
}
