import mongoose, { Schema, Document, Model } from 'mongoose';

// ─── Vote Schema ──────────────────────────────────────────────────────────────
export interface IVote extends Document {
  ip: string;        // Voter's IP address (used to prevent duplicate votes)
  choice: 'PO' | 'JO'; // PO = Yes, JO = No
  votedAt: Date;
}

const VoteSchema: Schema<IVote> = new Schema(
  {
    ip: {
      type: String,
      required: true,
      unique: true,  // One vote per IP
      trim: true,
    },
    choice: {
      type: String,
      enum: ['PO', 'JO'],
      required: true,
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

// ─── Vote Tally Schema ────────────────────────────────────────────────────────
export interface IVoteTally extends Document {
  po: number;
  jo: number;
  lastUpdated: Date;
}

const VoteTallySchema: Schema<IVoteTally> = new Schema(
  {
    po: { type: Number, default: 0 },
    jo: { type: Number, default: 0 },
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
