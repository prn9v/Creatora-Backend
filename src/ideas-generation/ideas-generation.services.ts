import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class IdeasService {
  private readonly logger = new Logger(IdeasService.name);
  private readonly gemini: GoogleGenerativeAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.gemini = new GoogleGenerativeAI(geminiKey ?? '');
  }

  async generateIdeas(user: any) {
    const brand = await this.prisma.brandProfile.findUnique({
      where: { userId: user.id },
    });

    if (!brand) {
      throw new NotFoundException(
        'Brand profile not found. Please complete your brand profile first.',
      );
    }

    const model = this.gemini.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
You are an elite viral content strategist who specialises in short-form video and social media content.
 
Here is everything you know about this creator's brand:
- Niche: ${brand.niche}
- Target audience: ${brand.audience}
- Brand tone of voice: ${brand.tone}
- Storytelling style: ${brand.storytellingStyle}
 
Your task: generate exactly 15 highly specific, scroll-stopping content ideas tailored for this creator.
 
Rules:
1. Produce a MIX of formats — include at least:
   - 4 Reels / TikTok short-form videos (under 60 s)
   - 3 Carousel posts (multi-slide educational or storytelling)
   - 2 Talking-head / POV videos
   - 2 Behind-the-scenes / Day-in-the-life clips
   - 2 Trend hijack ideas (use a current audio trend or challenge, adapted to the niche)
   - 2 Story / poll / interactive ideas
2. Every idea must feel UNIQUE — no generic or repeated angles.
3. Each hook must be designed to stop the scroll in the first 2 seconds.
4. Hooks should match the brand tone (${brand.tone}).
5. Ideas must be directly relevant to the niche (${brand.niche}) and speak to (${brand.audience}).
 
Return ONLY a valid JSON array with exactly 15 objects. No markdown, no explanation.
Each object must have exactly these fields:
{
  "title": "Short descriptive title of the idea",
  "hook": "The exact first sentence or visual that opens the piece",
  "description": "60 to 100 words explaining what this content piece is about, what story it tells, why it will resonate with the target audience, and practical tips on how to execute it",
  "format": "Reel | Carousel | Talking-head | BTS | Trend hijack | Story/Poll",
  "angle": "One-line description of the unique angle or narrative device used",
  "cta": "What you want the audience to do at the end (e.g. comment your answer, save this, share with a friend)"
}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    const ideas: any[] = JSON.parse(cleaned);

    const savedIdeas = await Promise.all(
      ideas.map((idea) =>
        this.prisma.contentIdea.create({
          data: {
            title: idea.title,
            hook: idea.hook,
            description: idea.description,
            format: idea.format,
            angle: idea.angle,
            cta: idea.cta,
            source: 'AI',
            userId: user.id,
          },
        }),
      ),
    );

    return { success: true, count: savedIdeas.length, ideas: savedIdeas };
  }

  async getTrendingIdeas(user: any) {
    const brand = await this.prisma.brandProfile.findUnique({
      where: { userId: user.id },
    });

    if (!brand) {
      throw new NotFoundException(
        'Brand profile not found. Please complete your brand profile first.',
      );
    }

    let ideas: any[];

    try {
      const response = await fetch(
        'https://creatora-idea-genration-genai-model.onrender.com/generate-ideas',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            niche: brand.niche ?? '',
            audience: brand.audience ?? '',
            styleSummary: brand.styleSummary ?? '',
            avgSentenceLength: brand.avgSentenceLength ?? 0,
            commonPhrases: brand.commonPhrases ?? [],
            emotionalTone: brand.emotionalTone ?? '',
            formalityScore: brand.formalityScore ?? 0,
            humorUsage: brand.humorUsage ?? false,
            storytellingStyle: brand.storytellingStyle ?? '',
            topicPreferences: brand.topicPreferences ?? [],
            vocabularyComplexity: brand.vocabularyComplexity ?? '',
            tone: brand.tone ?? '',
            ideaCount: 15,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`GenAI model responded with status ${response.status}`);
      }

      ideas = await response.json();
    } catch (error) {
      this.logger.error('GenAI model fetch failed:', error);
      throw new InternalServerErrorException(
        'Could not generate trending ideas at this time. Please try again later.',
      );
    }

    if (!Array.isArray(ideas) || ideas.length === 0) {
      throw new NotFoundException(
        'No ideas were returned from the generation model.',
      );
    }

    const saved = await Promise.all(
      ideas.map((idea) =>
        this.prisma.contentIdea.create({
          data: {
            title: idea.title ?? '',
            hook: idea.hook ?? null,
            description: idea.description ?? null,
            format: idea.format ?? null,
            angle: idea.angle ?? null,
            cta: idea.cta ?? null,
            platform: idea.platform ?? null,
            trendSource: idea.trendSource ?? null,
            trendTitle: idea.trendTitle ?? null,
            source: 'TRENDING',
            userId: user.id,
          },
        }),
      ),
    );

    return { success: true, count: saved.length, ideas: saved };
  }

  async toggleFavorite(user: any, ideaId: string) {
    const idea = await this.prisma.contentIdea.findFirst({
      where: { id: ideaId, userId: user.id },
    });

    if (!idea) {
      throw new NotFoundException('Idea not found or does not belong to you.');
    }

    return this.prisma.contentIdea.update({
      where: { id: ideaId },
      data: { isFavorite: !idea.isFavorite },
    });
  }

  async getFavorites(user: any) {
    return this.prisma.contentIdea.findMany({
      where: {
        userId: user.id,
        isFavorite: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

}
