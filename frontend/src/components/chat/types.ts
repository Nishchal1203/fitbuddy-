/* ─────────────────────────────────────────────
   SHARED TYPES — components/chat/types.ts
───────────────────────────────────────────── */

export type MessageRole = "user" | "assistant";

export type Message = {
  id: string;
  role: MessageRole;
  text: string;
  image?: string; // object URL or base64 preview
  timestamp: Date;
  liked?: boolean | null;
};

export type Conversation = {
  id: string;
  title: string; // auto-generated from first message
  preview: string; // truncated last message
  timestamp: Date;
  messages: Message[];
  pinned?: boolean;
};

export type QuickTopic = {
  icon: React.ReactNode;
  label: string;
  prompt: string;
  color: string; // tailwind gradient classes
};
