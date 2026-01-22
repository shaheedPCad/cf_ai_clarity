import { ConversationDO } from './conversation';

export { ConversationDO };

interface Env {
  AI: Ai;
  CONVERSATION: DurableObjectNamespace;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function getUserId(request: Request): string {
  const cookies = request.headers.get('Cookie') || '';
  const match = cookies.match(/clarity_user_id=([^;]+)/);
  return match ? match[1] : crypto.randomUUID();
}

function setCookie(response: Response, userId: string): Response {
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Set-Cookie', `clarity_user_id=${userId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // API routes
    if (url.pathname.startsWith('/api/')) {
      const userId = getUserId(request);
      const id = env.CONVERSATION.idFromName(userId);
      const stub = env.CONVERSATION.get(id);

      let response: Response;

      switch (url.pathname) {
        case '/api/chat':
          response = await stub.fetch(new Request('http://do/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: request.body,
          }));
          break;

        case '/api/history':
          response = await stub.fetch(new Request('http://do/history'));
          break;

        case '/api/reset':
          response = await stub.fetch(new Request('http://do/reset', { method: 'POST' }));
          break;

        default:
          response = new Response('Not Found', { status: 404 });
      }

      // Add CORS headers and set cookie
      const corsResponse = new Response(response.body, {
        status: response.status,
        headers: {
          ...Object.fromEntries(response.headers),
          ...CORS_HEADERS,
        },
      });

      return setCookie(corsResponse, userId);
    }

    // For non-API routes, let the assets binding handle it (via wrangler.toml [assets])
    return new Response('Not Found', { status: 404 });
  },
};
