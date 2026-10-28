import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Comment, { IComment } from '@/models/Comment';
import { containsProfanity, censorProfanity } from '@/lib/filter';
import mongoose from 'mongoose';

const DAILY_COMMENT_LIMIT = 3;

/** Extract client IP cleanly without exposing it to the UI */
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIP = req.headers.get('x-real-ip');
  if (realIP) return realIP.trim();
  const cfIP = req.headers.get('cf-connecting-ip');
  if (cfIP) return cfIP.trim();
  return '127.0.0.1';
}

/** Check how many comments this IP has made today */
async function getDailyCount(ip: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return Comment.countDocuments({
    ip,
    createdAt: { $gte: startOfDay },
  });
}

/** Sanitize author name to ensure IP is never used as a name */
function sanitizeAuthorName(name?: string): string {
  if (!name || typeof name !== 'string') return 'Qytetar Anonim';
  const trimmed = name.trim();
  if (!trimmed) return 'Qytetar Anonim';

  // Do not allow IP addresses as names
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-fA-F]{1,4}:){1,7}[0-9a-fA-F]{1,4}$/;
  if (ipPattern.test(trimmed)) {
    return 'Qytetar Anonim';
  }

  // Cap length
  return trimmed.substring(0, 50);
}

// ─── GET: Fetch comments tree + user daily limit status ──────────────────────
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const ip = getClientIP(req);

    const todayCount = await getDailyCount(ip);
    const remainingToday = Math.max(0, DAILY_COMMENT_LIMIT - todayCount);

    // Fetch all comments, sorted newest first
    // Note: NEVER select or expose `ip` to the response!
    const rawComments = await Comment.find({})
      .select('_id text authorName authorAvatarSeed stance parentId likes createdAt')
      .sort({ createdAt: -1 })
      .lean();

    // Separate top-level comments and replies
    const topLevel: Array<any> = [];
    const repliesMap: Record<string, Array<any>> = {};

    for (const item of rawComments) {
      const sanitized = {
        _id: item._id.toString(),
        text: censorProfanity(item.text),
        authorName: item.authorName || 'Qytetar Anonim',
        authorAvatarSeed: item.authorAvatarSeed || 'default',
        stance: item.stance || null,
        parentId: item.parentId ? item.parentId.toString() : null,
        likes: item.likes || 0,
        createdAt: item.createdAt,
        replies: [] as any[],
      };

      if (item.parentId) {
        const pId = item.parentId.toString();
        if (!repliesMap[pId]) repliesMap[pId] = [];
        repliesMap[pId].push(sanitized);
      } else {
        topLevel.push(sanitized);
      }
    }

    // Attach replies sorted chronologically (oldest first so it reads as a thread)
    for (const parent of topLevel) {
      if (repliesMap[parent._id]) {
        parent.replies = repliesMap[parent._id].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      }
    }

    return NextResponse.json({
      success: true,
      comments: topLevel,
      totalCount: rawComments.length,
      limit: {
        maxPerDay: DAILY_COMMENT_LIMIT,
        usedToday: todayCount,
        remainingToday,
      },
    });
  } catch (error: any) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Ndodhi një gabim gjatë ngarkimit të komenteve.' },
      { status: 500 }
    );
  }
}

// ─── POST: Add a new comment or reply ───────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const ip = getClientIP(req);

    // 1. IP Rate Limiting: max 3 comments per day
    const todayCount = await getDailyCount(ip);
    if (todayCount >= DAILY_COMMENT_LIMIT) {
      return NextResponse.json(
        {
          error:
            'Keni arritur limitin prej 3 komenteve në ditë me këtë pajisje/IP. Ju lutem provoni përsëri nesër!',
          remainingToday: 0,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { text, authorName, parentId, stance } = body;

    // 2. Validate text
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Komenti nuk mund të jetë bosh.' },
        { status: 400 }
      );
    }

    if (text.trim().length > 1000) {
      return NextResponse.json(
        { error: 'Komenti nuk mund të jetë më i gjatë se 1000 karaktere.' },
        { status: 400 }
      );
    }

    // 3. Profanity Check
    const cleanAuthor = sanitizeAuthorName(authorName);
    if (containsProfanity(text) || containsProfanity(cleanAuthor)) {
      return NextResponse.json(
        {
          error:
            'Komenti juaj nuk u pranua sepse përmban fjalë fyese ose të papërshtatshme.',
        },
        { status: 400 }
      );
    }

    // 4. Validate parentId if replying
    let validParentId: mongoose.Types.ObjectId | null = null;
    if (parentId) {
      if (!mongoose.Types.ObjectId.isValid(parentId)) {
        return NextResponse.json(
          { error: 'Komenti prind nuk është i vlefshëm.' },
          { status: 400 }
        );
      }
      const parentExists = await Comment.findById(parentId);
      if (!parentExists) {
        return NextResponse.json(
          { error: 'Komenti të cilit po i përgjigjeni nuk u gjet.' },
          { status: 404 }
        );
      }
      validParentId = new mongoose.Types.ObjectId(parentId);
    }

    // 5. Valid stance
    const validStances = ['doreheqjen', 'rrezimin', 'te-dyja', 'tjeter'];
    const sanitizedStance = validStances.includes(stance) ? stance : '';

    // 6. Create comment
    const newComment = await Comment.create({
      text: text.trim(),
      authorName: cleanAuthor,
      authorAvatarSeed: Math.random().toString(36).substring(2, 10),
      stance: sanitizedStance,
      ip, // stored in DB for rate limiting, never returned
      parentId: validParentId,
      likes: 0,
    });

    const newTodayCount = todayCount + 1;
    const remainingToday = Math.max(0, DAILY_COMMENT_LIMIT - newTodayCount);

    return NextResponse.json({
      success: true,
      message: 'Komenti u shtua me sukses!',
      comment: {
        _id: newComment._id.toString(),
        text: censorProfanity(newComment.text),
        authorName: newComment.authorName,
        authorAvatarSeed: newComment.authorAvatarSeed,
        stance: newComment.stance || null,
        parentId: newComment.parentId ? newComment.parentId.toString() : null,
        likes: newComment.likes,
        createdAt: newComment.createdAt,
        replies: [],
      },
      remainingToday,
    });
  } catch (error: any) {
    console.error('Error posting comment:', error);
    return NextResponse.json(
      { error: 'Ndodhi një gabim gjatë ruajtjes së komentit.' },
      { status: 500 }
    );
  }
}
