"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChatSidebar, ChatMessages, ChatInput } from "@/components/chat";
import type { Conversation, Message } from "@/components/chat";
import { useToast } from "@/components/ui";
import Navbar from "@/components/Navbar";
import {
  createConversation,
  deleteConversation,
  fetchConversation,
  fetchConversations,
  pollMessageStatus,
  sendMessage as sendMessageRequest,
  updateConversation,
  updateMessageFeedback,
  type ChatApiConversation,
  type ChatApiMessage,
} from "@/Utils/trainerChatApi";

function toUiMessage(message: ChatApiMessage): Message {
  return {
    id: String(message.id),
    role: message.role,
    text: message.text,
    image: message.image_data ?? undefined,
    liked: message.liked,
    timestamp: new Date(message.created_at),
  };
}

function toUiConversation(item: ChatApiConversation, messages: Message[] = []): Conversation {
  return {
    id: String(item.id),
    title: item.title,
    preview: item.preview,
    pinned: item.pinned,
    timestamp: new Date(item.updated_at),
    messages,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function ChatPage() {
  const { showToast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [input, setInput] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId],
  );
  const messages = activeConversation?.messages ?? [];

  const upsertConversation = useCallback((incoming: Conversation) => {
    setConversations((prev) => {
      const existing = prev.find((c) => c.id === incoming.id);
      if (!existing) return [incoming, ...prev];
      const merged: Conversation = {
        ...incoming,
        messages: incoming.messages.length > 0 ? incoming.messages : existing.messages,
      };
      return [merged, ...prev.filter((c) => c.id !== incoming.id)];
    });
  }, []);

  const loadConversations = useCallback(
    async (q: string) => {
      const rows = await fetchConversations(q);
      setConversations((prev) => {
        const prevMap = new Map(prev.map((c) => [c.id, c]));
        return rows.map((row) => {
          const id = String(row.id);
          return toUiConversation(row, prevMap.get(id)?.messages ?? []);
        });
      });
    },
    [],
  );

  useEffect(() => {
    let isActive = true;
    const timer = setTimeout(async () => {
      try {
        await loadConversations(searchTerm);
      } catch (error) {
        if (isActive) {
          setErrorMessage((error as Error).message || "Failed to load chat history");
        }
      }
    }, 250);

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [searchTerm, loadConversations]);

  /* ── new chat ── */
  const handleNewChat = useCallback(async () => {
    try {
      setErrorMessage(null);
      setInput("");
      setImagePreview(null);
      setImageData(null);

      const created = await createConversation();
      const newId = String(created.id);
      upsertConversation(toUiConversation(created, []));
      setActiveConversationId(newId);
    } catch (error) {
      setActiveConversationId(null);
      setErrorMessage((error as Error).message || "Failed to start new chat");
    }
  }, [upsertConversation]);

  /* ── select conversation ── */
  const handleSelectConversation = useCallback(
    async (id: string) => {
      try {
        setErrorMessage(null);
        setActiveConversationId(id);
        setInput("");
        setImagePreview(null);
        setImageData(null);

        const detail = await fetchConversation(id);
        upsertConversation(
          toUiConversation(detail, detail.messages.map(toUiMessage)),
        );
      } catch (error) {
        setErrorMessage((error as Error).message || "Failed to open conversation");
      }
    },
    [upsertConversation],
  );

  /* ── delete conversation ── */
  const handleDeleteConversation = useCallback(
    async (id: string) => {
      try {
        const deletedConversation = conversations.find((c) => c.id === id);
        await deleteConversation(id);
        setConversations((prev) => prev.filter((c) => c.id !== id));
        setActiveConversationId((curr) => (curr === id ? null : curr));
        showToast({
          title: "Chat history deleted",
          description: deletedConversation
            ? `Deleted: ${deletedConversation.title}`
            : "The selected chat has been removed.",
          variant: "success",
        });
      } catch (error) {
        setErrorMessage((error as Error).message || "Failed to delete conversation");
      }
    },
    [conversations, showToast],
  );

  /* ── pin conversation ── */
  const handlePinConversation = useCallback(
    async (id: string) => {
      const conversation = conversations.find((item) => item.id === id);
      if (!conversation) return;

      const nextPinned = !conversation.pinned;
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, pinned: nextPinned } : c)),
      );

      try {
        const updated = await updateConversation(id, { pinned: nextPinned });
        upsertConversation(
          toUiConversation(updated, conversation.messages),
        );
      } catch (error) {
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, pinned: !nextPinned } : c)),
        );
        setErrorMessage((error as Error).message || "Failed to update conversation");
      }
    },
    [conversations, upsertConversation],
  );

  /* ── like / dislike ── */
  const handleLike = useCallback(
    async (msgId: string) => {
      const next = messages.find((m) => m.id === msgId)?.liked === true ? null : true;
      setConversations((prev) =>
        prev.map((c) =>
          c.id !== activeConversationId
            ? c
            : {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === msgId ? { ...m, liked: next } : m,
                ),
              },
        ),
      );

      try {
        await updateMessageFeedback(msgId, next);
      } catch (error) {
        setErrorMessage((error as Error).message || "Failed to save feedback");
      }
    },
    [activeConversationId, messages],
  );

  const handleDislike = useCallback(
    async (msgId: string) => {
      const next = messages.find((m) => m.id === msgId)?.liked === false ? null : false;
      setConversations((prev) =>
        prev.map((c) =>
          c.id !== activeConversationId
            ? c
            : {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === msgId ? { ...m, liked: next } : m,
                ),
              },
        ),
      );

      try {
        await updateMessageFeedback(msgId, next);
      } catch (error) {
        setErrorMessage((error as Error).message || "Failed to save feedback");
      }
    },
    [activeConversationId, messages],
  );

  /* ── image upload ── */
  const handleImageChange = useCallback(async (file: File) => {
    try {
      const [previewUrl, encoded] = await Promise.all([
        Promise.resolve(URL.createObjectURL(file)),
        toBase64(file),
      ]);
      setImagePreview(previewUrl);
      setImageData(encoded);
      setErrorMessage(null);
    } catch {
      setErrorMessage("Failed to process selected image");
    }
  }, []);

  /* ── send message ── */
  const sendMessage = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? input).trim();
      if (!text && !imageData) return;

      try {
        setErrorMessage(null);

        let conversationId = activeConversationId;
        if (!conversationId) {
          const created = await createConversation();
          conversationId = String(created.id);
          setActiveConversationId(conversationId);
          upsertConversation(toUiConversation(created, []));
        }

        if (!conversationId) return;

        const response = await sendMessageRequest({
          conversationId,
          text: text || "Analyze the attached image.",
          imageData,
        });

        const userMessage = toUiMessage(response.user_message);
        setInput("");
        setImagePreview(null);
        setImageData(null);

        setConversations((prev) =>
          prev.map((c) =>
            c.id !== conversationId
              ? c
              : {
                  ...c,
                  preview: userMessage.text.slice(0, 80),
                  timestamp: userMessage.timestamp,
                  messages: [...c.messages, userMessage],
                },
          ),
        );

        setIsTyping(true);
        const startedAt = Date.now();
        while (Date.now() - startedAt < 60_000) {
          await sleep(1500);
          const status = await pollMessageStatus(conversationId, response.request.request_id);
          if (status.status === "completed" && status.assistant_message) {
            const assistant = toUiMessage(status.assistant_message);
            setConversations((prev) =>
              prev.map((c) =>
                c.id !== conversationId
                  ? c
                  : {
                      ...c,
                      preview: assistant.text.slice(0, 80),
                      timestamp: assistant.timestamp,
                      messages: [...c.messages, assistant],
                    },
              ),
            );
            break;
          }

          if (status.status === "failed") {
            throw new Error(status.error_text || "AI response generation failed");
          }
        }

        await loadConversations(searchTerm);
      } catch (error) {
        setErrorMessage((error as Error).message || "Failed to send message");
      } finally {
        setIsTyping(false);
      }
    },
    [
      activeConversationId,
      imageData,
      input,
      loadConversations,
      searchTerm,
      upsertConversation,
    ],
  );

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Navbar />
      <div className="flex h-[calc(100dvh-4rem)] min-h-0 overflow-hidden">
        {/* ── Sidebar ── */}
        <ChatSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          onDeleteConversation={handleDeleteConversation}
          onPinConversation={handlePinConversation}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          isOpen={sidebarOpen}
        />

        {/* ── Main chat area ── */}
        <div className="flex min-w-xl flex-1 flex-col overflow-hidden">
          <ChatMessages
            messages={messages}
            isTyping={isTyping}
            onLike={handleLike}
            onDislike={handleDislike}
            onTopicClick={sendMessage}
          />

          {errorMessage && (
            <div className="border-t border-brand-pale bg-red-50 px-4 py-2 text-xs text-red-600">
              {errorMessage}
            </div>
          )}

          <ChatInput
            input={input}
            imagePreview={imagePreview}
            isTyping={isTyping}
            showQuickPills={messages.length === 0}
            onChange={setInput}
            onSend={() => sendMessage()}
            onImageChange={handleImageChange}
            onImageRemove={() => setImagePreview(null)}
            onTopicClick={sendMessage}
          />
        </div>
      </div>
    </div>
  );
}
