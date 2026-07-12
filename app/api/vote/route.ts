import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import {
  isValidPollId,
  isValidChoice,
  getAllPolls,
  emptyCounts,
  DEFAULT_POLL_ID,
} from '@/lib/polls';
import { Vote, VoteTally, type IVoteTally } from '@/models/Vote';

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIP = req.headers.get('x-real-ip');
  if (realIP) return realIP.trim();
  return '127.0.0.1';
}

/** Normalize tally document into a counts map (handles legacy po/jo). */
function normalizeCounts(pollId: string, tally: IVoteTally | null): Record<string, number> {
  const base = emptyCounts(pollId);
  if (!tally) return base;

  const fromCounts =
    tally.counts && typeof tally.counts === 'object' ? { ...tally.counts } : {};

  // Merge legacy PO/JO fields if present
  if (typeof tally.po === 'number') {
    fromCounts.PO = (fromCounts.PO ?? 0) + tally.po;
  }
  if (typeof tally.jo === 'number') {
    fromCounts.JO = (fromCounts.JO ?? 0) + tally.jo;
  }

  for (const key of Object.keys(base)) {
    base[key] = Number(fromCounts[key] ?? 0);
  }
  // Also include any extra keys already stored
  for (const [key, val] of Object.entries(fromCounts)) {
    if (!(key in base)) base[key] = Number(val ?? 0);
  }
  return base;
}

async function getOrCreateTally(pollId: string): Promise<IVoteTally> {
  let tally = await VoteTally.findOne({ pollId });

  if (!tally && pollId === DEFAULT_POLL_ID) {
    const legacy = await VoteTally.findOne({
      $or: [{ pollId: { $exists: false } }, { pollId: null }],
    });
    if (legacy) {
      legacy.pollId = DEFAULT_POLL_ID;
      if (!legacy.counts || Object.keys(legacy.counts).length === 0) {
        legacy.counts = {
          PO: legacy.po ?? 0,
          JO: legacy.jo ?? 0,
        };
      }
      await legacy.save();
      tally = legacy;
    }
  }

  if (!tally) {
    tally = await VoteTally.create({
      pollId,
      counts: emptyCounts(pollId),
    });
  }

  return tally;
}

async function findExistingVote(ip: string, pollId: string) {
  let existing = await Vote.findOne({ ip, pollId });
  if (!existing && pollId === DEFAULT_POLL_ID) {
    existing = await Vote.findOne({
      ip,
      $or: [{ pollId: { $exists: false } }, { pollId: null }, { pollId: DEFAULT_POLL_ID }],
    });
  }
  return existing;
}

// ─── GET /api/vote ────────────────────────────────────────────────────────────
// No pollId → all questions (for home page).
// ?pollId=… → single question.
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const ip = getClientIP(req);
    const singleId = req.nextUrl.searchParams.get('pollId');

    if (singleId) {
      if (!isValidPollId(singleId)) {
        return NextResponse.json({ error: 'Invalid poll' }, { status: 400 });
      }
      const tally = await getOrCreateTally(singleId);
      const existingVote = await findExistingVote(ip, singleId);
      return NextResponse.json({
        pollId: singleId,
        counts: normalizeCounts(singleId, tally),
        hasVoted: !!existingVote,
        userChoice: existingVote?.choice ?? null,
      });
    }

    // All polls for the multi-question page
    const results = await Promise.all(
      getAllPolls().map(async (poll) => {
        const tally = await getOrCreateTally(poll.id);
        const existingVote = await findExistingVote(ip, poll.id);
        return {
          pollId: poll.id,
          counts: normalizeCounts(poll.id, tally),
          hasVoted: !!existingVote,
          userChoice: existingVote?.choice ?? null,
        };
      })
    );

    return NextResponse.json({ polls: results });
  } catch (err) {
    console.error('[GET /api/vote]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ─── POST /api/vote ───────────────────────────────────────────────────────────
// Body: { choice: string, pollId: string }
export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const ip = getClientIP(req);
    const body = await req.json();
    const choice = String(body.choice ?? '');
    const pollId = body.pollId ? String(body.pollId) : DEFAULT_POLL_ID;

    if (!isValidPollId(pollId)) {
      return NextResponse.json({ error: 'Invalid poll' }, { status: 400 });
    }

    if (!isValidChoice(pollId, choice)) {
      return NextResponse.json({ error: 'Invalid choice' }, { status: 400 });
    }

    const existing = await findExistingVote(ip, pollId);
    if (existing) {
      return NextResponse.json(
        { error: 'already_voted', message: 'Keni votuar tashmë nga ky pajisje.' },
        { status: 409 }
      );
    }

    await Vote.create({ ip, pollId, choice });

    const tally = await VoteTally.findOneAndUpdate(
      { pollId },
      {
        $inc: { [`counts.${choice}`]: 1 },
        lastUpdated: new Date(),
        $setOnInsert: { pollId },
      },
      { new: true, upsert: true }
    );

    return NextResponse.json({
      success: true,
      pollId,
      counts: normalizeCounts(pollId, tally),
      userChoice: choice,
    });
  } catch (err: unknown) {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: number }).code === 11000
    ) {
      return NextResponse.json(
        { error: 'already_voted', message: 'Keni votuar tashmë nga ky pajisje.' },
        { status: 409 }
      );
    }
    console.error('[POST /api/vote]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
