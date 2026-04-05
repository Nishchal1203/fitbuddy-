import { API_BASE_URL, buildAuthHeaders, readErrorMessage } from "@/Utils/api";

export type ChatApiConversation = {
  id: number;
  title: string;
  preview: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type ChatApiMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
  image_data: string | null;
  liked: boolean | null;
  created_at: string;
};

export type ChatApiConversationDetail = ChatApiConversation & {
  messages: ChatApiMessage[];
};

export type ChatApiMessageRequest = {
  request_id: number;
  task_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  error_text: string | null;
  assistant_message: ChatApiMessage | null;
};

function parseId(id: string): number {
  const num = Number(id);
  if (!Number.isFinite(num) || num <= 0) {
    throw new Error("Invalid chat identifier");
  }
  return num;
}

async function parseJsonOrThrow<T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, fallbackMessage));
  }
  return response.json() as Promise<T>;
}

export async function fetchConversations(
  search?: string,
): Promise<ChatApiConversation[]> {
  const query = new URLSearchParams();
  if (search?.trim()) {
    query.set("q", search.trim());
  }
  query.set("limit", "80");
  query.set("offset", "0");

  const response = await fetch(
    `${API_BASE_URL}/api/trainer-chat/conversations?${query.toString()}`,
    {
      headers: buildAuthHeaders(),
      cache: "no-store",
    },
  );

  return parseJsonOrThrow<ChatApiConversation[]>(
    response,
    "Failed to load conversations",
  );
}

export async function createConversation(
  title?: string,
): Promise<ChatApiConversation> {
  const response = await fetch(
    `${API_BASE_URL}/api/trainer-chat/conversations`,
    {
      method: "POST",
      headers: buildAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ title }),
    },
  );

  return parseJsonOrThrow<ChatApiConversation>(
    response,
    "Failed to create conversation",
  );
}

export async function fetchConversation(
  conversationId: string,
): Promise<ChatApiConversationDetail> {
  const id = parseId(conversationId);
  const response = await fetch(
    `${API_BASE_URL}/api/trainer-chat/conversations/${id}`,
    {
      headers: buildAuthHeaders(),
      cache: "no-store",
    },
  );

  return parseJsonOrThrow<ChatApiConversationDetail>(
    response,
    "Failed to load conversation",
  );
}

export async function sendMessage(payload: {
  conversationId: string;
  text: string;
  imageData?: string | null;
}): Promise<{
  conversation_id: number;
  user_message: ChatApiMessage;
  request: ChatApiMessageRequest;
}> {
  const id = parseId(payload.conversationId);
  const response = await fetch(
    `${API_BASE_URL}/api/trainer-chat/conversations/${id}/messages`,
    {
      method: "POST",
      headers: buildAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        text: payload.text,
        image_data: payload.imageData ?? null,
      }),
    },
  );

  return parseJsonOrThrow(response, "Failed to send message");
}

export async function pollMessageStatus(
  conversationId: string,
  requestId: number,
): Promise<ChatApiMessageRequest> {
  const id = parseId(conversationId);
  const response = await fetch(
    `${API_BASE_URL}/api/trainer-chat/conversations/${id}/messages/status?request_id=${requestId}`,
    {
      headers: buildAuthHeaders(),
      cache: "no-store",
    },
  );

  return parseJsonOrThrow<ChatApiMessageRequest>(
    response,
    "Failed to fetch message status",
  );
}

export async function updateConversation(
  conversationId: string,
  payload: { pinned?: boolean; title?: string },
): Promise<ChatApiConversation> {
  const id = parseId(conversationId);
  const response = await fetch(
    `${API_BASE_URL}/api/trainer-chat/conversations/${id}`,
    {
      method: "PATCH",
      headers: buildAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    },
  );

  return parseJsonOrThrow<ChatApiConversation>(
    response,
    "Failed to update conversation",
  );
}

export async function deleteConversation(
  conversationId: string,
): Promise<void> {
  const id = parseId(conversationId);
  const response = await fetch(
    `${API_BASE_URL}/api/trainer-chat/conversations/${id}`,
    {
      method: "DELETE",
      headers: buildAuthHeaders(),
    },
  );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Failed to delete conversation"),
    );
  }
}

export async function updateMessageFeedback(
  messageId: string,
  liked: boolean | null,
): Promise<ChatApiMessage> {
  const id = parseId(messageId);
  const response = await fetch(
    `${API_BASE_URL}/api/trainer-chat/messages/${id}/feedback`,
    {
      method: "PATCH",
      headers: buildAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ liked }),
    },
  );

  return parseJsonOrThrow<ChatApiMessage>(
    response,
    "Failed to update feedback",
  );
}
