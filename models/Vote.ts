import mongoose, { Schema, Document, Model } from 'mongoose';
import { DEFAULT_POLL_ID } from '@/lib/polls';

// ─── Vote Schema ──────────────────────────────────────────────────────────────
export interface IVote extends Document {
  ip: string;
  pollId: string;
  choice: string;
  votedAt: Date;
}

const VoteSchema: Schema<IVote> = new Schema(
  {
    ip: {
      type: String,
      required: true,
      trim: true,
    },
    pollId: {
      type: String,
      required: true,
      default: DEFAULT_POLL_ID,
      trim: true,
      index: true,
    },
    choice: {
      type: String,
      required: true,
      trim: true,
    },
    votedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'votes',
    timestamps: false,
  }
);

// One vote per IP per question
VoteSchema.index({ ip: 1, pollId: 1 }, { unique: true });

// ─── Vote Tally Schema ────────────────────────────────────────────────────────
export interface IVoteTally extends Document {
  pollId: string;
  /** Flexible option counts, e.g. { PO: 10, JO: 5 } or { "600": 3, "800": 7 } */
  counts: Record<string, number>;
  /** Legacy fields kept for migration of older documents */
  po?: number;
  jo?: number;
  lastUpdated: Date;
}

const VoteTallySchema: Schema<IVoteTally> = new Schema(
  {
    pollId: {
      type: String,
      required: true,
      unique: true,
      default: DEFAULT_POLL_ID,
      trim: true,
    },
    counts: {
      type: Schema.Types.Mixed,
      default: {},
    },
    // legacy (pre multi-option)
    po: { type: Number, required: false },
    jo: { type: Number, required: false },
    lastUpdated: { type: Date, default: Date.now },
  },
  {
    collection: 'vote_tally',
    timestamps: false,
  }
);

// Prevent model re-registration in Next.js hot-reload
const Vote: Model<IVote> =
  (mongoose.models.Vote as Model<IVote>) ||
  mongoose.model<IVote>('Vote', VoteSchema);

const VoteTally: Model<IVoteTally> =
  (mongoose.models.VoteTally as Model<IVoteTally>) ||
  mongoose.model<IVoteTally>('VoteTally', VoteTallySchema);

export { Vote, VoteTally };
