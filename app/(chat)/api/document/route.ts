import { auth } from '@/app/(auth)/auth';
import { ArtifactKind } from '@/components/artifact';
import {
  deleteDocumentsByIdAfterTimestamp,
  getDocumentsById,
  saveDocument,
} from '@/lib/db/queries';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('缺少ID', { status: 400 });
  }

  const session = await auth();

  if (!session || !session.user) {
    // 未登录用户返回空数组
    return Response.json([], { status: 200 });
  }

  const documents = await getDocumentsById({ id });

  const [document] = documents;

  if (!document) {
    return new Response('未找到', { status: 404 });
  }

  if (document.userId !== session.user.id) {
    return new Response('未授权', { status: 401 });
  }

  return Response.json(documents, { status: 200 });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('缺少ID', { status: 400 });
  }

  const session = await auth();

  if (!session) {
    // 未登录用户返回空对象
    return Response.json({}, { status: 200 });
  }

  const {
    content,
    title,
    kind,
  }: { content: string; title: string; kind: ArtifactKind } =
    await request.json();

  if (session.user?.id) {
    const document = await saveDocument({
      id,
      content,
      title,
      kind,
      userId: session.user.id,
    });

    return Response.json(document, { status: 200 });
  }
  // 未登录用户返回空对象
  return Response.json({}, { status: 200 });
}

export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  const { timestamp }: { timestamp: string } = await request.json();

  if (!id) {
    return new Response('缺少ID', { status: 400 });
  }

  const session = await auth();

  if (!session || !session.user) {
    // 未登录用户返回成功但不执行任何操作
    return new Response('未登录用户无法删除文档', { status: 200 });
  }

  const documents = await getDocumentsById({ id });

  const [document] = documents;

  if (document.userId !== session.user.id) {
    return new Response('未授权', { status: 401 });
  }

  await deleteDocumentsByIdAfterTimestamp({
    id,
    timestamp: new Date(timestamp),
  });

  return new Response('已删除', { status: 200 });
}
