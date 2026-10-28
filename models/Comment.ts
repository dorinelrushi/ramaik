import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IComment extends Document {
  text: string;
  authorName: string;
  authorAvatarSeed: string;
  stance?: string;
  ip: string;
  parentId?: mongoose.Types.ObjectId | null;
  likes: number;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema: Schema<IComment> = new Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    authorName: {
      type: String,
      default: 'Qytetar Anonim',
      trim: true,
      maxlength: 60,
    },
    authorAvatarSeed: {
      type: String,
      default: () => Math.random().toString(36).substring(2, 10),
    },
    stance: {
      type: String,
      enum: ['doreheqjen', 'rrezimin', 'te-dyja', 'tjeter', ''],
      default: '',
    },
    ip: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
      index: true,
    },
    likes: {
      type: Number,
      default: 0,
    },
  },
  {
    collection: 'comments',
    timestamps: true,
  }
);

// Composite indexes for rapid lookups
CommentSchema.index({ ip: 1, createdAt: -1 });
CommentSchema.index({ parentId: 1, createdAt: -1 });

export const Comment: Model<IComment> =
  (mongoose.models.Comment as Model<IComment>) ||
  mongoose.model<IComment>('Comment', CommentSchema);

export default Comment;
