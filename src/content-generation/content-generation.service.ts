// src/content-generation/content-generation.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { firstValueFrom } from 'rxjs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';

interface BrandProfile {
  tone: string;
  niche: string;
  audience: string;
  styleSummary: string;
  avgSentenceLength: number;
  vocabularyComplexity: string;
  commonPhrases: string[];
  topicPreferences: string[];
  emotionalTone: string;
  storytellingStyle: string;
}

interface PastPost {
  content: string;
  platform: string;
  analysis?: {
    tone: string;
    hashtags: string[];
    callToAction?: string;
  };
}

interface FastAPIRequest {
  brandProfile: {
    tone: string;
    niche: string;
    audience: string;
    styleSummary: string;
    avgSentenceLength: number;
    vocabularyComplexity: string;
    commonPhrases: string[];
    topicPreferences: string[];
    emotionalTone: string;
    storytellingStyle: string;
  };
  pastPosts: Array<{
    content: string;
    platform: string;
    tone: string;
    hashtags: string[];
    callToAction: string;
  }>;
}

interface FastAPIResponse {
  text: {
    caption: string;
    hashtags: string[];
  };
  image: {
    caption: string;
    hashtags: string[];
    imagePrompt: string;
    imageUrl: string;
  };
  video: {
    hook: string;
    caption: string;
    script: string;
    shootingInstructions: string;
    audienceEngagement: string;
    hashtags: string[];
  };
}

export interface VideoScriptScene {
  sceneNumber: number;
  title: string;
  duration: string;
  shotType: 'closeup' | 'wide' | 'medium' | 'b-roll' | 'talking-head';
  voiceoverScript: string;
  visualNotes: string;
  shootingTips: string;
}

export interface InstagramPreview {
  postId: string;
  username: string;
  userProfilePicture: string;
  postImage: string;
  caption: string;
  hashtags: string[];
  likes: number;
  comments: number;
  timestamp: string;
}

export type GenerateContentResult = {
  assets: FastAPIResponse; // or a DTO you export
  generatedAt: string;
  creditsUsed: number;
};

@Injectable()
export class ContentGenerationService {
  private readonly fastApiUrl =
    'https://creatora-fast-api-post-generation-e.vercel.app';

  private readonly gemini: GoogleGenerativeAI;

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (!geminiKey) {
      throw new Error('GEMINI_API_KEY is missing in environment variables');
    }

    // ✅ Correct initialization
    this.gemini = new GoogleGenerativeAI(geminiKey);
  }

  async generateContent(
    user: any,
  ) {
    const userProfile = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { brandProfile: true, pastPosts: true },
    });

    if (!userProfile) throw new BadRequestException('User not found');
    if (!userProfile?.brandProfile) {
      throw new BadRequestException('Brand profile not set up');
    }

    // Credits check
    if (userProfile.creditsUsed >= userProfile.creditsLimit) {
      throw new BadRequestException('Credit limit reached');
    }

    // Prepare FastAPI request
    const fastApiRequest = this.prepareFastAPIRequest(
      userProfile.brandProfile as unknown as BrandProfile,
      userProfile.pastPosts as unknown as PastPost[],
    );

    // Call FastAPI
    let fastApiResponse: FastAPIResponse;
    try {
      const response = await firstValueFrom(
        this.httpService.post<FastAPIResponse>(
          `${this.fastApiUrl}/generate-post`,
          fastApiRequest,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );
      fastApiResponse = response.data;
    } catch (error) {
      console.error('FastAPI error:', error);
      throw new BadRequestException(
        'Failed to generate content from AI service',
      );
    }

    const generatedPost = await this.prisma.generatedPost.create({
      data: {
        userId: userProfile.id,
        platform: 'INSTAGRAM',
        content: JSON.stringify(fastApiResponse), 
      },
    });

    // Update credits
    await this.prisma.user.update({
      where: { id: userProfile.id },
      data: { creditsUsed: userProfile.creditsUsed + 1 },
    });

    const preview = this.formatInstagramPreview(
      generatedPost.id,
      fastApiResponse,
      userProfile,
    );

    return {
      postId: generatedPost.id,
      preview,
      hasVideoScript: true,
      generatedAt: new Date().toISOString(),
      creditsUsed: 1,
    };
  }

  private prepareFastAPIRequest(
    brandProfile: BrandProfile,
    pastPosts: PastPost[],
  ): FastAPIRequest {
    return {
      brandProfile: {
        tone: brandProfile.tone,
        niche: brandProfile.niche,
        audience: brandProfile.audience,
        styleSummary: brandProfile.styleSummary,
        avgSentenceLength: brandProfile.avgSentenceLength,
        vocabularyComplexity: brandProfile.vocabularyComplexity,
        commonPhrases: brandProfile.commonPhrases,
        topicPreferences: brandProfile.topicPreferences,
        emotionalTone: brandProfile.emotionalTone,
        storytellingStyle: brandProfile.storytellingStyle,
      },
      pastPosts: pastPosts.map((post) => ({
        content: post.content,
        platform: post.platform || 'INSTAGRAM',
        tone: post.analysis?.tone || 'professional',
        hashtags: post.analysis?.hashtags || [],
        callToAction: post.analysis?.callToAction || '',
      })),
    };
  }

  async getVideoScript(postId: string, userId: string) {
    const post = await this.prisma.generatedPost.findFirst({
      where: { id: postId, userId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const fastApiResponse = JSON.parse(post.content) as FastAPIResponse;
    const videoData = fastApiResponse.video;

    // ✅ Parse script into scenes
    const scenes = this.parseVideoScriptIntoScenes(videoData);

    // Calculate total duration
    const totalSeconds = scenes.reduce((sum, scene) => {
      const [min, sec] = scene.duration.split(':').map(Number);
      return sum + min * 60 + sec;
    }, 0);

    const totalDuration = `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;

    return {
      postId,
      hook: videoData.hook,
      caption: videoData.caption,
      totalDuration,
      scenes,
      audienceEngagement: videoData.audienceEngagement,
      hashtags: videoData.hashtags,
      shootingInstructions: videoData.shootingInstructions,
    };
  }

  // ✅ Get Posting Schedule (AI-powered)
  async getPostingSchedule(postId: string, userId: string) {
    const post = await this.prisma.generatedPost.findFirst({
      where: { id: postId, userId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const userProfile = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { brandProfile: true },
    });

    // ✅ Use Gemini to generate intelligent posting schedule
    const schedule = await this.generatePostingScheduleWithAI(
      postId,
      userProfile?.brandProfile as unknown as BrandProfile,
    );

    return schedule;
  }

  private formatInstagramPreview(
    postId: string,
    response: FastAPIResponse,
    userProfile: any,
  ): InstagramPreview {
    // ✅ Use image post data for preview
    return {
      postId,
      username: userProfile.name|| 'your_username',
      userProfilePicture: userProfile.profileImageUrl || 'https://ui-avatars.com/api/?name=' + (userProfile.brandProfile?.niche || 'Creatora'),
      postImage: response.image.imageUrl,
      caption: response.image.caption,
      hashtags: response.image.hashtags,
      likes: Math.floor(Math.random() * 500) + 100, // Mock data
      comments: Math.floor(Math.random() * 50) + 10, // Mock data
      timestamp: 'Just now',
    };
  }

  private parseVideoScriptIntoScenes(videoData: FastAPIResponse['video']): VideoScriptScene[] {
    const scenes: VideoScriptScene[] = [];
    
    // Scene 1: Hook
    scenes.push({
      sceneNumber: 1,
      title: 'Opening Hook',
      duration: '0:03',
      shotType: 'closeup',
      voiceoverScript: videoData.hook,
      visualNotes: 'Eye-catching opener with product/subject in focus',
      shootingTips: 'Use good lighting, ensure audio is clear, start with energy',
    });

    // Parse script into chunks
    const scriptLines = videoData.script
      .split('\n')
      .filter((line) => line.trim())
      .filter((line) => !line.includes('Host:'));

    const scriptChunks = this.splitIntoChunks(scriptLines, 3);
    
    scriptChunks.forEach((chunk, index) => {
      const sceneNumber = index + 2;
      const shotTypes: VideoScriptScene['shotType'][] = ['medium', 'b-roll', 'wide'];
      
      scenes.push({
        sceneNumber,
        title: `Scene ${sceneNumber} - Main Content`,
        duration: '0:08',
        shotType: shotTypes[index % shotTypes.length],
        voiceoverScript: chunk.join(' '),
        visualNotes: this.getVisualNotesForScene(index),
        shootingTips: 'Maintain good pacing, use b-roll when appropriate',
      });
    });

    // Final scene: CTA
    scenes.push({
      sceneNumber: scenes.length + 1,
      title: 'Call to Action',
      duration: '0:04',
      shotType: 'talking-head',
      voiceoverScript: videoData.audienceEngagement,
      visualNotes: 'Direct to camera, text overlay with contact info',
      shootingTips: 'Be energetic, make eye contact with camera, smile',
    });

    return scenes;
  }

  private splitIntoChunks(lines: string[], maxChunks: number): string[][] {
    const chunkSize = Math.ceil(lines.length / maxChunks);
    const chunks: string[][] = [];
    for (let i = 0; i < lines.length; i += chunkSize) {
      chunks.push(lines.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private getVisualNotesForScene(index: number): string {
    const notes = [
      'Show product/subject with good lighting and composition',
      'B-roll footage of product in use or relevant visuals',
      'Wide shot showing context or environment',
      'Close-up details and texture shots',
    ];
    return notes[index % notes.length];
  }

  private async generatePostingScheduleWithAI(
    postId: string,
    brandProfile: BrandProfile,
  ) {
    const model = this.gemini.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `
You are a social media scheduling expert specializing in Instagram content strategy.

Brand Profile:
- Niche: ${brandProfile.niche}
- Audience: ${brandProfile.audience}
- Tone: ${brandProfile.tone}

Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

Create an optimal posting schedule for:
1. Image Post (product/brand photo with caption)
2. Video/Reel (short-form video content)

Consider:
- Best engagement times for the niche
- Optimal gap between posts (don't spam, maintain interest)
- When the target audience is most active
- Content variety strategy

Return ONLY valid JSON (no markdown) in this exact schema:

{
  "imagePost": {
    "recommendedDate": "YYYY-MM-DD",
    "dayOfWeek": "Monday",
    "timeSlot": "6:00 PM - 8:00 PM",
    "reason": "Why this time is optimal"
  },
  "videoPost": {
    "recommendedDate": "YYYY-MM-DD",
    "dayOfWeek": "Wednesday",
    "timeSlot": "12:00 PM - 2:00 PM",
    "reason": "Why this time is optimal"
  },
  "gapBetweenPosts": {
    "days": 2,
    "hours": 48,
    "reason": "Why this gap is recommended"
  },
  "nextPostSuggestion": {
    "contentType": "text",
    "recommendedDate": "YYYY-MM-DD",
    "dayOfWeek": "Friday",
    "reason": "Strategic reasoning"
  },
  "bestPostingTimes": [
    {
      "dayOfWeek": "Monday",
      "timeSlots": ["6:00 PM - 8:00 PM", "8:00 AM - 10:00 AM"],
      "engagement": "High"
    }
  ]
}
`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text()?.trim() ?? '';
      
      const cleaned = text.replace(/```json\s*|```/g, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        return this.getDefaultSchedule(postId);
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        postId,
        ...parsed,
      };
    } catch (err) {
      console.error('Gemini scheduling error:', err);
      return this.getDefaultSchedule(postId);
    }
  }

  private getDefaultSchedule(postId: string) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 3);

    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 5);

    return {
      postId,
      imagePost: {
        recommendedDate: tomorrow.toISOString().split('T')[0],
        dayOfWeek: tomorrow.toLocaleDateString('en-US', { weekday: 'long' }),
        timeSlot: '6:00 PM - 8:00 PM',
        reason: 'Evening hours typically see higher engagement for visual content',
      },
      videoPost: {
        recommendedDate: dayAfterTomorrow.toISOString().split('T')[0],
        dayOfWeek: dayAfterTomorrow.toLocaleDateString('en-US', { weekday: 'long' }),
        timeSlot: '12:00 PM - 2:00 PM',
        reason: 'Lunch hours are optimal for short-form video content consumption',
      },
      gapBetweenPosts: {
        days: 2,
        hours: 48,
        reason: 'Maintains audience interest without overwhelming them',
      },
      nextPostSuggestion: {
        contentType: 'text',
        recommendedDate: nextWeek.toISOString().split('T')[0],
        dayOfWeek: nextWeek.toLocaleDateString('en-US', { weekday: 'long' }),
        reason: 'Text posts work well for engagement and community building',
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
        {
          dayOfWeek: 'Friday',
          timeSlots: ['5:00 PM - 7:00 PM'],
          engagement: 'Medium',
        },
      ],
    };
  }
}
