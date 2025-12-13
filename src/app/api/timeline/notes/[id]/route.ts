import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextResponse, type NextRequest } from 'next/server';
import { deleteTimelineNote } from '@/db/goals';
import type { EnvWithD1 } from '@/db/client';
import { requireUserIdFromRequest } from '@/lib/auth/user';

const getEnv = () => getCloudflareContext().env as EnvWithD1;

const handleDelete = async (
  request: NextRequest,
  params: Promise<{ id: string }>
) => {
  const { id } = await params;
  const noteId = Number(id);

  if (!noteId) {
    return NextResponse.json(
      { success: false, message: 'Missing note ID' },
      { status: 400 }
    );
  }

  try {
    const userId = await requireUserIdFromRequest(request);
    await deleteTimelineNote(getEnv(), userId, noteId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/timeline/notes/[id] error', error);
    if (error instanceof Error && error.message === 'unauthorized') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { success: false, message: 'Delete failed. Please try again soon.' },
      { status: 500 }
    );
  }
};

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleDelete(request, context.params);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleDelete(request, context.params);
}
