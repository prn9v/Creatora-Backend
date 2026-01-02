import {
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OnboardingService } from './onboarding.service';
import { ExtractPostDto } from './dto/extract-post.dto';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { GetCurrentUser } from 'src/auth/decorator/current-user.decorator';
import { BrandProfileDto } from './dto/brand-profile.dto';

@ApiTags('Content Extractor')
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @UseGuards(JwtAuthGuard)
  @Post('brand')
  @ApiOperation({
    summary: 'Save basic detail of Creator Content',
    description:
      'Save the basic detail of You Content',
  })
  @ApiResponse({
    status: 200,
    description: 'Data added successfully',
  })
  @ApiResponse({ status: 400, description: 'Failed to add basic Data of your Creation' })
  async addBasicData(@Body() dto: BrandProfileDto, @GetCurrentUser() user: any) {
    return await this.onboardingService.addBasicData(user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('add-post')
  @ApiOperation({
    summary: 'Extract and save post from URL',
    description:
      'Extracts content from a post URL and saves it to PastPost database',
  })
  @ApiResponse({
    status: 200,
    description: 'Post extracted and saved successfully',
  })
  @ApiResponse({ status: 400, description: 'Failed to extract or save post' })
  async addPost(@Body() dto: ExtractPostDto, @GetCurrentUser() user: any) {
    return await this.onboardingService.analyzeAndSavePost(user, dto.url);
  }

  @UseGuards(JwtAuthGuard)
  @Post('analyze-profile')
  @ApiOperation({
    summary: 'Analyze all posts and create brand profile',
    description:
      'Analyzes all saved posts and creates/updates the BrandProfile with writing style',
  })
  @ApiResponse({
    status: 200,
    description: 'Brand profile created/updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Failed to analyze profile' })
  async analyzeProfile(@GetCurrentUser() user: any) {
    return await this.onboardingService.analyzeProfile(user);
  }
}
