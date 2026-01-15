// src/content-generation/content-generation.controller.ts
import { Controller, Post, Body, UseGuards, Get, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ContentGenerationService } from './content-generation.service';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { GetCurrentUser } from 'src/auth/decorator/current-user.decorator';

export interface VideoScriptScene {
  sceneNumber: number;
  title: string;
  duration: string;
  shotType: 'closeup' | 'wide' | 'medium' | 'b-roll' | 'talking-head';
  voiceoverScript: string;
  visualNotes: string;
  shootingTips: string;
}

export interface VideoScriptResponse {
  postId: string;
  hook: string;
  caption: string;
  totalDuration: string;
  scenes: VideoScriptScene[];
  audienceEngagement: string;
  hashtags: string[];
  shootingInstructions: string;
}

export interface PostingSchedule {
  postId: string;
  imagePost: {
    recommendedDate: string;
    dayOfWeek: string;
    timeSlot: string;
    reason: string;
  };
  videoPost: {
    recommendedDate: string;
    dayOfWeek: string;
    timeSlot: string;
    reason: string;
  };
  gapBetweenPosts: {
    days: number;
    hours: number;
    reason: string;
  };
  nextPostSuggestion: {
    contentType: 'text' | 'image' | 'video';
    recommendedDate: string;
    dayOfWeek: string;
    reason: string;
  };
  bestPostingTimes: {
    dayOfWeek: string;
    timeSlots: string[];
    engagement: string;
  }[];
}

@ApiTags('content-generation')
@Controller('content-generation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContentGenerationController {
  constructor(
    private readonly contentGenerationService: ContentGenerationService,
  ) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate content based on topic and preferences' })
  @ApiResponse({
    status: 201,
    description: 'Content generated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid input or insufficient credits',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async generateContent(
    @GetCurrentUser() user: any,
  ) {
    return this.contentGenerationService.generateContent(user);
  }

  @Get(':postId/video-script')
  @ApiOperation({
    summary: 'Get formatted video script with scenes',
    description:
      'Returns detailed video script broken down into scenes with shooting instructions, voiceover text, and visual notes.',
  })
  @ApiParam({
    name: 'postId',
    description: 'Generated post ID from /generate endpoint',
    example: 'cm5abc123xyz',
  })
  @ApiResponse({
    status: 200,
    description: 'Video script retrieved successfully',
    schema: {
      example: {
        postId: 'cm5abc123xyz',
        hook: 'Did You Know Mushrooms Can Do THIS?',
        caption: 'Transform Your Meals & Your Health!',
        totalDuration: '0:25',
        scenes: [
          {
            sceneNumber: 1,
            title: 'Opening Hook',
            duration: '0:03',
            shotType: 'closeup',
            voiceoverScript: 'Did You Know Mushrooms Can Do THIS?',
            visualNotes: 'Eye-catching opener with product/subject in focus',
            shootingTips:
              'Use good lighting, ensure audio is clear, start with energy',
          },
          {
            sceneNumber: 2,
            title: 'Scene 2 - Main Content',
            duration: '0:08',
            shotType: 'medium',
            voiceoverScript: "These beauties aren't just delicious...",
            visualNotes: 'Show product with good lighting and composition',
            shootingTips: 'Maintain good pacing, use b-roll when appropriate',
          },
        ],
        audienceEngagement: "What's your favorite way to cook mushrooms?",
        hashtags: ['#MushroomWadi', '#MushroomRecipes', '#HealthyEating'],
        shootingInstructions: 'Shoot in a well-lit kitchen...',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found',
  })
  async getVideoScript(
    @GetCurrentUser() user: any,
    @Param('postId') postId: string,
  ): Promise<VideoScriptResponse> {
    return this.contentGenerationService.getVideoScript(postId, user.id);
  }

  @Get(':postId/posting-schedule')
  @ApiOperation({
    summary: 'Get AI-powered posting schedule',
    description:
      'Returns optimal posting times for image and video content, gap between posts, and next content suggestions based on brand profile and audience behavior.',
  })
  @ApiParam({
    name: 'postId',
    description: 'Generated post ID from /generate endpoint',
    example: 'cm5abc123xyz',
  })
  @ApiResponse({
    status: 200,
    description: 'Posting schedule generated successfully',
    schema: {
      example: {
        postId: 'cm5abc123xyz',
        imagePost: {
          recommendedDate: '2026-01-16',
          dayOfWeek: 'Thursday',
          timeSlot: '6:00 PM - 8:00 PM',
          reason:
            'Evening hours see 40% higher engagement for food/lifestyle content',
        },
        videoPost: {
          recommendedDate: '2026-01-18',
          dayOfWeek: 'Saturday',
          timeSlot: '12:00 PM - 2:00 PM',
          reason: 'Weekend lunch hours optimal for recipe/tutorial videos',
        },
        gapBetweenPosts: {
          days: 2,
          hours: 48,
          reason: 'Maintains audience interest without overwhelming them',
        },
        nextPostSuggestion: {
          contentType: 'text',
          recommendedDate: '2026-01-21',
          dayOfWeek: 'Tuesday',
          reason: 'Mid-week engagement posts build community',
        },
        bestPostingTimes: [
          {
            dayOfWeek: 'Monday',
            timeSlots: ['8:00 AM - 10:00 AM', '6:00 PM - 8:00 PM'],
            engagement: 'High',
          },
          {
            dayOfWeek: 'Wednesday',
            timeSlots: ['12:00 PM - 2:00 PM', '7:00 PM - 9:00 PM'],
            engagement: 'Very High',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found',
  })
  async getPostingSchedule(
    @GetCurrentUser() user: any,
    @Param('postId') postId: string,
  ): Promise<PostingSchedule> {
    return this.contentGenerationService.getPostingSchedule(postId, user.id);
  }
}
