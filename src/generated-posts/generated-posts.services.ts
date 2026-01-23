import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class GeneratedPostsService {
  constructor(private prisma: PrismaService) {}

  async getPosts(
    userId: string,
    options: {
      page: number;
      limit: number;
      search?: string;
      sort: 'asc' | 'desc';
      orderBy: string;
    },
  ) {
    const { page, limit, search, sort, orderBy } = options;
    const skip = (page - 1) * limit;

    const where: any = {
      userId: userId,
      ...(search && {
        OR: [
          { content: { contains: search, mode: 'insensitive' } },
          { platform: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [total, data] = await Promise.all([
      this.prisma.generatedPost.count({ where }),
      this.prisma.generatedPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [orderBy]: sort,
        },
        include: {
          sourceIdea: true,
        },
      }),
    ]);

    const noofpages = Math.ceil(total / limit) || 1;

    return {
      data,
      meta: {
        total,
        noofpages,
        page,
        limit,
      },
    };
  }

  async getPostById(userId: string, postId: string) {
    return this.prisma.generatedPost.findFirst({
      where: {
        id: postId,
        userId: userId, 
      },
      include: {
        sourceIdea: true, 
      },
    });
  }
}
