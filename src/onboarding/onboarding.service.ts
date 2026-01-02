import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ApifyClient } from 'apify-client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { BrandProfileDto } from './dto/brand-profile.dto';

interface FacebookPostData {
  text?: string;
  postText?: string;
  description?: string;
}

export interface ExtractedContent {
  platform:
    | 'instagram'
    | 'twitter'
    | 'linkedin'
    | 'blog'
    | 'youtube'
    | 'facebook'
    | 'thread';
  content: string;
  author?: string;
  mediaUrl?: string;
  type: 'text' | 'image' | 'video';
  originalUrl: string;
  metadata?: any;
}

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);
  private readonly client: ApifyClient;
  private readonly gemini: GoogleGenerativeAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const apifyToken = this.configService.get<string>('APIFY_API_TOKEN');
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (!apifyToken) {
      this.logger.warn('APIFY_API_TOKEN is not set. Scraping will fail.');
    }

    if (!geminiKey) {
      this.logger.warn('GEMINI_API_KEY is not set. AI analysis will fail.');
    }

    this.client = new ApifyClient({
      token: apifyToken ?? '',
    });

    this.gemini = new GoogleGenerativeAI(geminiKey ?? '');
  }

  async addBasicData(user: any, dto: BrandProfileDto) {
    const { tone, niche, audience } = dto;

    return this.prisma.brandProfile.upsert({
      where: {
        userId: user.id,
      },
      update: {
        ...(tone !== undefined && { tone }),
        ...(niche !== undefined && { niche }),
        ...(audience !== undefined && { audience }),
      },
      create: {
        userId: user.id,
        ...(tone !== undefined && { tone }),
        ...(niche !== undefined && { niche }),
        ...(audience !== undefined && { audience }),
      },
    });
  }

  async analyzeAndSavePost(user: any, url: string) {
    this.logger.log(`Analyzing post from URL for user ${user}: ${url}`);

    // Step 1: Extract content from URL
    const extractedContent = await this.extractContent(url);

    // Step 2: Perform detailed analysis using Gemini
    const detailedAnalysis = await this.performDetailedAnalysis(
      extractedContent,
      url,
    );

    // Step 3: Save to database
    const savedPost = await this.prisma.pastPost.create({
      data: {
        userId: user.id,
        content: extractedContent.content,
        platform: extractedContent.platform,
        url: extractedContent.originalUrl,
        author: extractedContent.author,
        mediaUrl: extractedContent.mediaUrl,
        type: extractedContent.type,
        metadata: extractedContent.metadata || {},
        analysis: detailedAnalysis,
      },
    });

    this.logger.log(`Post saved successfully with ID: ${savedPost.id}`);

    return {
      success: true,
      message: 'Post analyzed and saved successfully',
      post: savedPost,
    };
  }

  async extractContent(url: string): Promise<ExtractedContent> {
    const platform = this.detectPlatform(url);
    this.logger.log(`Starting extraction for ${platform}: ${url}`);

    try {
      switch (platform) {
        case 'instagram':
          return await this.scrapeInstagram(url);
        case 'twitter':
          return await this.scrapeTwitter(url);
        case 'linkedin':
          return await this.scrapeLinkedIn(url);
        case 'youtube':
          return await this.scrapeYouTube(url);
        case 'facebook':
          return await this.scrapeFacebook(url);
        case 'blog':
        default:
          return await this.scrapeWebsite(url);
      }
    } catch (error) {
      this.logger.error(`Extraction Error for ${platform}: ${error.message}`);

      try {
        this.logger.log(`Attempting fallback scraping for ${url}`);
        return await this.scrapeFallback(url, platform);
      } catch (fallbackError) {
        this.logger.error(`Fallback also failed: ${fallbackError.message}`);
        throw new BadRequestException(
          `Failed to extract content: ${error.message}`,
        );
      }
    }
  }

  private detectPlatform(url: string): ExtractedContent['platform'] {
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('facebook.com') || url.includes('fb.com'))
      return 'facebook';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    if (url.includes('linkedin.com')) return 'linkedin';
    if (url.includes('youtube.com') || url.includes('youtu.be'))
      return 'youtube';
    return 'blog';
  }

  // --- PLATFORM SPECIFIC HANDLERS ---
  private async scrapeInstagram(url: string): Promise<ExtractedContent> {
    try {
      const run = await this.client.actor('apify/instagram-scraper').call({
        directUrls: [url],
        resultsLimit: 1,
        addParentData: true,
      });

      const { items } = await this.client
        .dataset(run.defaultDatasetId)
        .listItems();
      const data = items[0] as any;

      if (!data) throw new Error('No Instagram data found');

      return {
        platform: 'instagram',
        content: data.caption || data.alt || '',
        author: data.ownerUsername || data.username,
        type: data.type === 'Video' ? 'video' : 'image',
        mediaUrl: data.displayUrl || data.videoUrl || data.thumbnailSrc,
        originalUrl: url,
        metadata: {
          likes: data.likesCount,
          comments: data.commentsCount,
          timestamp: data.timestamp,
        },
      };
    } catch (error) {
      this.logger.error(`Instagram scraper failed: ${error.message}`);
      throw error;
    }
  }

  private async scrapeTwitter(url: string): Promise<ExtractedContent> {
    try {
      let run;
      try {
        run = await this.client.actor('apify/twitter-scraper').call({
          startUrls: [url],
          tweetsDesired: 1,
          searchMode: 'live',
        });
      } catch (e) {
        run = await this.client.actor('quacker/twitter-scraper').call({
          startUrls: [url],
          maxItems: 1,
        });
      }

      const { items } = await this.client
        .dataset(run.defaultDatasetId)
        .listItems();
      const data = items[0] as any;

      if (!data) throw new Error('No Tweet found');

      const content = data.full_text || data.text || data.content || '';
      const author =
        data.author?.username || data.user?.screen_name || data.username || '';

      return {
        platform: 'twitter',
        content: this.cleanTwitterContent(content),
        author: author,
        type: 'text',
        originalUrl: url,
        metadata: {
          likes: data.likes || data.favorite_count,
          retweets: data.retweets || data.retweet_count,
          replies: data.replies || data.reply_count,
          timestamp: data.created_at || data.createdAt,
        },
      };
    } catch (error) {
      this.logger.error(`Twitter scraper failed: ${error.message}`);
      throw error;
    }
  }

  private async scrapeLinkedIn(url: string): Promise<ExtractedContent> {
    try {
      let run;
      try {
        run = await this.client
          .actor('curious_coder/linkedin-post-scraper')
          .call({
            postUrl: url,
          });
      } catch (e) {
        run = await this.client.actor('anchor/linkedin-post-scraper').call({
          startUrls: [{ url }],
          maxItems: 1,
        });
      }

      const { items } = await this.client
        .dataset(run.defaultDatasetId)
        .listItems();
      const data = items[0] as any;

      if (!data) throw new Error('No LinkedIn data found');

      const content =
        data.text ||
        data.commentary ||
        data.content ||
        data.description ||
        data.postContent ||
        '';

      const author =
        data.authorName || data.author?.name || data.profile?.name || '';

      return {
        platform: 'linkedin',
        content: this.cleanLinkedInContent(content),
        author: author,
        type: 'text',
        originalUrl: url,
        metadata: {
          likes: data.numLikes || data.reactions,
          comments: data.numComments || data.commentsCount,
          shares: data.numShares,
          timestamp: data.postedAt || data.publishedAt,
        },
      };
    } catch (error) {
      this.logger.error(`LinkedIn scraper failed: ${error.message}`);
      throw error;
    }
  }

  private async scrapeFacebook(url: string): Promise<ExtractedContent> {
    try {
      const run = await this.client.actor('apify/facebook-posts-scraper').call({
        startUrls: [url],
        maxPosts: 1,
      });

      const { items } = await this.client
        .dataset(run.defaultDatasetId)
        .listItems();
      const data = items[0] as any;

      if (!data) throw new Error('No Facebook data found');

      const content = this.extractFacebookContent(data);

      return {
        platform: 'facebook',
        content: content,
        author: data.username || data.authorName || data.pageTitle,
        type: data.images?.length > 0 ? 'image' : 'text',
        mediaUrl: data.images?.[0]?.url || data.video,
        originalUrl: url,
        metadata: {
          likes: data.likes,
          comments: data.comments,
          shares: data.shares,
          timestamp: data.time,
        },
      };
    } catch (error) {
      this.logger.error(`Facebook scraper failed: ${error.message}`);
      throw error;
    }
  }

  private async scrapeYouTube(url: string): Promise<ExtractedContent> {
    try {
      const run = await this.client.actor('streamers/youtube-scraper').call({
        startUrls: [{ url }],
        downloadSubtitles: true,
        maxResults: 1,
      });

      const { items } = await this.client
        .dataset(run.defaultDatasetId)
        .listItems();
      const data = items[0] as any;

      if (!data) throw new Error('Video not found');

      let content = `${data.title}\n\n${data.description}`;

      if (data.subtitles && data.subtitles.length > 0) {
        content += `\n\nTranscript:\n${data.subtitles}`;
      }

      return {
        platform: 'youtube',
        content: content,
        author: data.channelName || data.author,
        type: 'video',
        originalUrl: url,
        metadata: {
          views: data.viewCount,
          likes: data.likeCount,
          comments: data.commentCount,
          duration: data.duration,
        },
      };
    } catch (error) {
      this.logger.error(`YouTube scraper failed: ${error.message}`);
      throw error;
    }
  }

  private async scrapeWebsite(url: string): Promise<ExtractedContent> {
    try {
      const run = await this.client
        .actor('apify/website-content-crawler')
        .call({
          startUrls: [{ url }],
          maxCrawlPages: 1,
          saveHtml: false,
          saveMarkdown: true,
        });

      const { items } = await this.client
        .dataset(run.defaultDatasetId)
        .listItems();
      const data = items[0] as any;

      if (!data) throw new Error('Could not crawl website');

      return {
        platform: 'blog',
        content: data.markdown || data.text || '',
        author: data.metadata?.author || data.author,
        type: 'text',
        originalUrl: url,
        metadata: {
          title: data.metadata?.title || data.title,
          publishDate: data.metadata?.publishDate,
        },
      };
    } catch (error) {
      this.logger.error(`Website scraper failed: ${error.message}`);
      throw error;
    }
  }

  private async scrapeFallback(
    url: string,
    platform: string,
  ): Promise<ExtractedContent> {
    const run = await this.client.actor('apify/web-scraper').call({
      startUrls: [{ url }],
      maxRequestsPerCrawl: 1,
      pseudoUrls: [],
      pageFunction: `
        async function pageFunction(context) {
          const { $, request } = context;
          
          const textContent = $('article, main, .post, .content, [role="main"]')
            .text()
            .trim() || $('body').text().trim();
          
          const author = $('[rel="author"]').text() || 
                        $('meta[name="author"]').attr('content') || 
                        $('.author').text();
          
          return {
            text: textContent,
            author: author,
            url: request.url,
          };
        }
      `,
    });

    const { items } = await this.client
      .dataset(run.defaultDatasetId)
      .listItems();
    const data = items[0] as any;

    if (!data || !data.text) {
      throw new Error('Fallback scraper found no content');
    }

    return {
      platform: platform as any,
      content: this.cleanExtractedText(data.text),
      author: data.author,
      type: 'text',
      originalUrl: url,
    };
  }

  private async performDetailedAnalysis(
    content: ExtractedContent,
    url: string,
  ) {
    const model = this.gemini.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
    You are an elite Social Media Data Scientist and Linguistic Psychologist. Your task is to perform a granular analysis of a specific social media post to populate a high-fidelity marketing database.

    ### INPUT DATA
    - **Platform:** ${content.platform}
    - **Author:** ${content.author || 'Unknown'}
    - **Post URL:** ${url}
    - **Raw Content:** "${content.content}"

    ### ANALYSIS DIRECTIVES
    You must analyze the content on three distinct layers:
    1.  **Surface Layer (Literal):** Extract explicit entities like hashtags, mentions, and call-to-actions.
    2.  **Semantic Layer (Linguistic):** Evaluate the sentence structure, vocabulary sophistication, and rhythm. Does the author use short, punchy sentences (Direct) or flowery, descriptive prose (Narrative)?
    3.  **Psychographic Layer (Subtext):** Infer the target audience's values. For example, if the text is minimal like "Strength in restraint," the audience is likely "Luxury/High-Net-Worth" who value exclusivity, not "General Public."

    ### SPECIAL HANDLING FOR SHORT CONTENT
    If the content is brief (under 20 words), you **MUST NOT** return "Unknown." You must infer context from the available vocabulary. 
    - *Example:* "Monday Mood" implies Relatable/Casual tone.
    - *Example:* "Legacy defined." implies Prestigious/Serious tone.
    - *Example:* "Link in bio!" implies Promotional/Urgent tone.

    ### OUTPUT SCHEMA SPECIFICATIONS
    Return a **single, valid JSON object** matching this schema strictly. Do not include markdown formatting like \`\`\`json.

    {
      "tone": "Select the most specific descriptor from this list or similar: [Professional, Witty, Satirical, Melancholic, Luxurious, Educational, Urgent, Minimalist, Aspirational, Aggressive, Whimsical]. Avoid generic terms like 'Good'.",
      
      "sentiment": "One of: [Positive, Negative, Neutral, Mixed, Controversial].",
      
      "keyThemes": ["Extract 2-4 abstract concepts. E.g., 'Sustainability', 'Self-Care', 'Hustle Culture', 'Tech Innovation'. Do not just repeat words from the text."],
      
      "writingStyle": "Analyze the syntax. Options: [Narrative (Storytelling), Direct (Sales-focus), Conversational (Chatty), Academic (Formal), Poetic (Artistic), Technical (Jargon-heavy)].",
      
      "targetAudience": "Describe the ideal reader. Include estimated age group, professional status, or specific interest (e.g., 'Gen Z Gamers', 'Corporate Executives', 'Fitness Enthusiasts').",
      
      "callToAction": "Identify the explicit or implicit request. E.g., 'Visit Website', 'Tag a Friend', 'Save Post'. If none, return null.",
      
      "hashtags": ["Array of strings. Extract ONLY hashtags present in the text. Do not generate new ones. Return empty array if none."],
      
      "mentions": ["Array of strings. Extract user handles (starting with @). Return empty array if none."],
      
      "wordCount": Number (Integer count of words in the content string),
      
      "readabilityScore": "One of: [Easy (Child-friendly), Moderate (General Public), Complex (Academic/Niche)].",
      
      "emotionalAppeal": "Identify the primary psychological trigger. Examples: [FOMO (Fear Of Missing Out), Nostalgia, Validation, Curiosity, Outrage, Hope, Exclusivity].",
      
      "structureAnalysis": "Briefly describe the flow. E.g., 'Hook -> Story -> CTA' or 'Single Statement -> Hashtags'."
    }

    ### FINAL VALIDATION
    - Ensure all arrays are closed properly.
    - Ensure specific fields like 'wordCount' are numbers, not strings.
    - Do not output any conversational text before or after the JSON.
    `;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      // Clean potential markdown formatting
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();

      return JSON.parse(cleanedText);
    } catch (error) {
      this.logger.error(`Failed to parse Gemini analysis: ${error.message}`);

      // Return default analysis structure
      return {
        tone: 'unknown',
        sentiment: 'neutral',
        keyThemes: [],
        writingStyle: 'unknown',
        targetAudience: 'general',
        callToAction: null,
        hashtags: [],
        mentions: [],
        wordCount: content.content.split(/\s+/).length,
        readabilityScore: 'moderate',
        emotionalAppeal: 'not analyzed',
        structureAnalysis: 'not analyzed',
      };
    }
  }

  private cleanTwitterContent(text: string): string {
    return text
      .replace(/https?:\/\/t\.co\/\S+/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private cleanLinkedInContent(text: string): string {
    return text
      .replace(/…see more$/i, '')
      .replace(/\.{3,}/g, '...')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private extractFacebookContent(data: FacebookPostData): string {
    const parts: string[] = [];

    if (data.text) parts.push(data.text);
    if (data.postText) parts.push(data.postText);
    if (data.description) parts.push(data.description);

    return parts
      .filter((p) => p && p.length > 0)
      .join('\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private cleanExtractedText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .substring(0, 10000);
  }

  async analyzeProfile(user: any) {
    this.logger.log(`Analyzing profile for user ${user}`);

    const pastPosts = await this.prisma.pastPost.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!pastPosts || pastPosts.length < 3) {
      throw new BadRequestException(
        `At least 3 posts are required for analysis. Found: ${pastPosts.length}`,
      );
    }

    this.logger.log(
      `Found ${pastPosts.length} posts. Analyzing writing style...`,
    );

    const styleAnalysis = await this.analyzeWritingStyleWithGemini(
      pastPosts.map((p) => p.content),
    );

    await this.persistBrandProfile(user, styleAnalysis);

    return {
      success: true,
      message: 'Brand profile created/updated successfully',
      postsAnalyzed: pastPosts.length,
      profile: styleAnalysis,
    };
  }

  private async analyzeWritingStyleWithGemini(posts: string[]) {
    const model = this.gemini.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = this.buildStyleAnalysisPrompt(posts);

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    try {
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanedText);
    } catch (e) {
      this.logger.error('Gemini returned invalid JSON');
      throw new BadRequestException('Failed to analyze writing style');
    }
  }

  private async persistBrandProfile(user: any, style: any) {
    const existingProfile = await this.prisma.brandProfile.findUnique({
      where: { userId: user.id },
    });

    if (existingProfile) {
      await this.prisma.brandProfile.update({
        where: { userId: user.id },
        data: {
          styleSummary: style.styleSummary,
          avgSentenceLength: style.avgSentenceLength,
          vocabularyComplexity: style.vocabularyComplexity,
          commonPhrases: style.commonPhrases,
          topicPreferences: style.topicPreferences,
          formalityScore: style.formalityScore,
          emotionalTone: style.emotionalTone,
          humorUsage: style.humorUsage,
          storytellingStyle: style.storytellingStyle,
        },
      });
    } else {
      await this.prisma.brandProfile.create({
        data: {
          userId: user.id,
          styleSummary: style.styleSummary,
          avgSentenceLength: style.avgSentenceLength,
          vocabularyComplexity: style.vocabularyComplexity,
          commonPhrases: style.commonPhrases,
          topicPreferences: style.topicPreferences,
          formalityScore: style.formalityScore,
          emotionalTone: style.emotionalTone,
          humorUsage: style.humorUsage,
          storytellingStyle: style.storytellingStyle,
        },
      });
    }
  }

  private buildStyleAnalysisPrompt(posts: string[]): string {
    return `
You are an expert writing-style analyst.

Analyze the user's writing based on the following past posts.
Your task is to extract their consistent writing voice so it can be reused
to generate new posts that sound indistinguishable from the original author.

POSTS:
${posts.map((p, i) => `${i + 1}. ${p}`).join('\n\n')}

RETURN STRICT JSON WITH THESE FIELDS ONLY:

{
  "styleSummary": string,
  "tone": "PROFESSIONAL" | "CASUAL" | "INSPIRING" | "EDUCATIONAL",
  "storytellingStyle": "direct" | "narrative" | "conversational",
  "humorUsage": boolean,
  "vocabularyComplexity": "simple" | "moderate" | "advanced",
  "formalityScore": number (0 to 1),
  "emotionalTone": string,
  "commonPhrases": string[],
  "topicPreferences": string[],
  "avgSentenceLength": number
}

RULES:
- Infer tone from writing, not topic
- Be precise and conservative
- Do not hallucinate
- JSON only, no markdown
`;
  }
}
