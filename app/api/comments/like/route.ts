import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Comment from '@/models/Comment';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { commentId } = body;

    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
      return NextResponse.json({ error: 'ID e pavlefshme' }, { status: 400 });
    }

    const updated = await Comment.findByIdAndUpdate(
      commentId,
      { $inc: { likes: 1 } },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: 'Komenti nuk u gjet' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      likes: updated.likes,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Gabim serveri' }, { status: 500 });
  }
}
