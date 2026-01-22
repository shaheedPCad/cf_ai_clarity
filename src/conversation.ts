import { SYSTEM_PROMPT } from './prompts';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ConversationState {
  messages: Message[];
  decisionContext?: string;
}

interface Env {
  AI: Ai;
}

const MAX_MESSAGES = 20;

export class ConversationDO implements DurableObject {
  private state: DurableObjectState;
  private env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/chat':
        return this.handleChat(request);
      case '/history':
        return this.handleHistory();
      case '/reset':
        return this.handleReset();
      default:
        return new Response('Not Found', { status: 404 });
    }
  }

  private async handleChat(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const { message } = await request.json() as { message: string };

    if (!message || typeof message !== 'string') {
      return new Response('Invalid message', { status: 400 });
    }

    // Load existing conversation
    const stored = await this.state.storage.get<ConversationState>('conversation');
    const conversation: ConversationState = stored || { messages: [] };

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };
    conversation.messages.push(userMessage);

    // Build messages for AI (with context window management)
    const recentMessages = conversation.messages.slice(-MAX_MESSAGES);
    const aiMessages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...recentMessages.map(m => ({ role: m.role, content: m.content })),
    ];

    // Call Workers AI
    const aiResponse = await this.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: aiMessages,
      max_tokens: 1024,
    });

    const assistantContent = typeof aiResponse === 'object' && 'response' in aiResponse
      ? (aiResponse as { response: string }).response
      : String(aiResponse);

    // Add assistant message
    const assistantMessage: Message = {
      role: 'assistant',
      content: assistantContent,
      timestamp: Date.now(),
    };
    conversation.messages.push(assistantMessage);

    // Keep only recent messages in storage
    conversation.messages = conversation.messages.slice(-MAX_MESSAGES);

    // Save updated conversation
    await this.state.storage.put('conversation', conversation);

    return Response.json({
      response: assistantContent,
      timestamp: assistantMessage.timestamp,
    });
  }

  private async handleHistory(): Promise<Response> {
    const stored = await this.state.storage.get<ConversationState>('conversation');
    const messages = stored?.messages || [];

    return Response.json({ messages });
  }

  private async handleReset(): Promise<Response> {
    await this.state.storage.delete('conversation');
    return Response.json({ success: true });
  }
}
