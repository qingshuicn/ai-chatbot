import { auth } from '@/app/(auth)/auth';
import { getSuggestionsByDocumentId } from '@/lib/db/queries';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get('documentId');

  if (!documentId) {
    return new Response('未找到', { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    // 未登录用户返回空数组
    return Response.json([], { status: 200 });
  }

  const suggestions = await getSuggestionsByDocumentId({
    documentId,
  });

  const [suggestion] = suggestions;

  if (!suggestion) {
    return Response.json([], { status: 200 });
  }

  if (suggestion.userId !== session.user.id) {
    return new Response('未授权', { status: 401 });
  }

  return Response.json(suggestions, { status: 200 });
}
