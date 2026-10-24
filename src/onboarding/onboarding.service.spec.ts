import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { OnboardingService } from './onboarding.service';

const mockCall = jest.fn();
const mockActor = jest.fn(() => ({ call: mockCall }));
const mockListItems = jest.fn();
const mockDataset = jest.fn(() => ({ listItems: mockListItems }));

jest.mock('apify-client', () => ({
  ApifyClient: jest.fn().mockImplementation(() => ({
    actor: mockActor,
    dataset: mockDataset,
  })),
}));

jest.mock('src/prisma/prisma.service', () => ({ PrismaService: class {} }), {
  virtual: true,
});

const postUrl =
  'https://www.linkedin.com/posts/example-creator_activity-7381234567890123456-AbCd';

// One dataset row as johnvc/linkedin-posts-api returns it for a post URL
const postRow = {
  result_type: 'post',
  postId: '7381234567890123456',
  postUrl:
    'https://www.linkedin.com/posts/example-creator_activity-7381234567890123456',
  postType: 'post',
  mediaType: 'text',
  datePosted: '2026-09-30T14:05:00.000Z',
  text: 'Three things I learned shipping a creator tool this year.\n\n\n1. Talk to users weekly. #buildinpublic',
  hashtags: ['#buildinpublic'],
  authorName: 'Example Creator',
  authorHeadline: 'Founder at Example Studio',
  authorUrl: 'https://www.linkedin.com/in/example-creator',
  authorType: 'Person',
  numLikes: 248,
  numComments: 31,
  videos: [],
  embeddedLinks: [],
  taggedCompanies: [],
  taggedPeople: [],
  topComments: [],
  summary:
    'Post by Example Creator, 248 reactions, 31 comments, posted 2026-09-30',
  fromCache: false,
  fetched_at: '2026-10-23T12:00:00.000000+00:00',
};

const errorRow = {
  result_type: 'error',
  sourceUrl: postUrl,
  error_message:
    'LinkedIn did not show this post to a signed-out visitor. It may be deleted, private, or visible to members only.',
  error_type: 'CollectionError',
  fetched_at: '2026-10-23T12:00:00.000000+00:00',
};

describe('OnboardingService LinkedIn import', () => {
  let service: OnboardingService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCall.mockResolvedValue({ defaultDatasetId: 'dataset-1' });
    const config = { get: () => 'test-token' } as unknown as ConfigService;
    service = new OnboardingService({} as PrismaService, config);
  });

  it('reads a post URL with johnvc/linkedin-posts-api', async () => {
    mockListItems.mockResolvedValue({ items: [postRow] });

    const result = await service.extractContent(postUrl);

    expect(mockActor).toHaveBeenCalledTimes(1);
    expect(mockActor).toHaveBeenCalledWith('johnvc/linkedin-posts-api');
    expect(mockCall).toHaveBeenCalledWith({ postUrls: [postUrl] });
    expect(mockDataset).toHaveBeenCalledWith('dataset-1');
    expect(result).toEqual({
      platform: 'linkedin',
      content:
        'Three things I learned shipping a creator tool this year.\n\n1. Talk to users weekly. #buildinpublic',
      author: 'Example Creator',
      type: 'text',
      originalUrl: postUrl,
      metadata: {
        likes: 248,
        comments: 31,
        shares: undefined,
        timestamp: '2026-09-30T14:05:00.000Z',
      },
    });
  });

  it("raises the Actor's message instead of saving an error row", async () => {
    mockListItems.mockResolvedValue({ items: [errorRow] });

    await expect(service['scrapeLinkedIn'](postUrl)).rejects.toThrow(
      errorRow.error_message,
    );
  });
});
