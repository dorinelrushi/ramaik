import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Vote, VoteTally } from '@/models/Vote';

// Helper to extract the real IP from Next.js request headers
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIP = req.headers.get('x-real-ip');
  if (realIP) return realIP.trim();

  // Fallback – during local development this will be '::1' or '127.0.0.1'
  return '127.0.0.1';
}

// ─── GET /api/vote ────────────────────────────────────────────────────────────
// Returns current tally + whether the calling IP has already voted
export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const ip = getClientIP(req);

    // Get or initialise the single tally document
    let tally = await VoteTally.findOne();
    if (!tally) {
      tally = await VoteTally.create({ po: 0, jo: 0 });
    }

    const existingVote = await Vote.findOne({ ip });

    return NextResponse.json({
      po: tally.po,
      jo: tally.jo,
      hasVoted: !!existingVote,
      userChoice: existingVote?.choice ?? null,
    });
  } catch (err) {
    console.error('[GET /api/vote]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ─── POST /api/vote ───────────────────────────────────────────────────────────
// Registers a vote. Body: { choice: 'PO' | 'JO' }
export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const ip = getClientIP(req);
    const body = await req.json();
    const { choice } = body;

    if (choice !== 'PO' && choice !== 'JO') {
      return NextResponse.json({ error: 'Invalid choice' }, { status: 400 });
    }

    // Check for duplicate vote
    const existing = await Vote.findOne({ ip });
    if (existing) {
      return NextResponse.json(
        { error: 'already_voted', message: 'Keni votuar tashmë nga ky pajisje.' },
        { status: 409 }
      );
    }

    // Save the individual vote
    await Vote.create({ ip, choice });

    // Atomically increment the tally
    const field = choice === 'PO' ? 'po' : 'jo';
    let tally = await VoteTally.findOneAndUpdate(
      {},
      { $inc: { [field]: 1 }, lastUpdated: new Date() },
      { new: true, upsert: true }
    );

    return NextResponse.json({
      success: true,
      po: tally!.po,
      jo: tally!.jo,
      userChoice: choice,
    });
  } catch (err) {
    console.error('[POST /api/vote]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
