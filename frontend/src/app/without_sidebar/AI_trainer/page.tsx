'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ImagePlus,
  Mic,
  Send,
  ThumbsDown,
  ThumbsUp,
  X,
  ChevronDown,
  Dumbbell,
  Utensils,
  Moon,
  Heart,
  Zap,
  Target,
} from 'lucide-react'
import Image from 'next/image'
import AiIcon from '@/assets/AI_icon.svg'
import usericon from '@/assets/user.svg'

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
type MessageRole = 'user' | 'assistant'

type Message = {
  id: string
  role: MessageRole
  text: string
  image?: string       // base64 or object URL for user-uploaded images
  timestamp: Date
  liked?: boolean | null
}

type QuickTopic = {
  icon: React.ReactNode
  label: string
  prompt: string
  color: string
}

/* ─────────────────────────────────────────────
   QUICK TOPICS
───────────────────────────────────────────── */
const QUICK_TOPICS: QuickTopic[] = [
  {
    icon:   <Dumbbell size={14} />,
    label:  'Form Check',
    prompt: 'Can you help me check my squat form? What are the most common mistakes to avoid?',
    color:  'from-brand-soft to-brand-purple',
  },
  {
    icon:   <Target size={14} />,
    label:  'Workout Plan',
    prompt: 'Build me a 4-day workout split for muscle gain as an intermediate lifter.',
    color:  'from-brand-purple to-brand-deep',
  },
  {
    icon:   <Utensils size={14} />,
    label:  'Diet Advice',
    prompt: 'What should I eat before and after a workout to maximise muscle growth?',
    color:  'from-brand-gold to-[#e6a800]',
  },
  {
    icon:   <Zap size={14} />,
    label:  'Reps & Sets',
    prompt: 'How many reps and sets should I do for hypertrophy vs strength training?',
    color:  'from-[#C98CE8] to-brand-deep',
  },
  {
    icon:   <Heart size={14} />,
    label:  'Recovery',
    prompt: 'How long should I rest between sets and between workout days for optimal recovery?',
    color:  'from-[#F97316] to-[#EF4444]',
  },
  {
    icon:   <Moon size={14} />,
    label:  'Sleep & Rest',
    prompt: 'How does sleep affect muscle growth and what can I do to optimise my sleep for fitness?',
    color:  'from-brand-deep to-[#4C1D95]',
  },
]

/* ─────────────────────────────────────────────
   MOCK AI REPLIES  (swap with real API later)
───────────────────────────────────────────── */
const MOCK_REPLIES: Record<string, string> = {
  default: `Great question! Here's what I recommend based on your fitness profile:

**Key Points:**
• Focus on progressive overload — increase weight or reps every 1–2 weeks
• Compound movements (squat, deadlift, bench, row) should be your foundation
• Aim for 7–9 hours of sleep — this is when your muscles actually grow
• Protein intake: 1.6–2.2g per kg of bodyweight daily

Want me to go deeper on any of these? I can also build you a personalised plan based on your current stats. 💪`,

  form: `**Squat Form Checklist ✅**

**Setup:**
• Feet shoulder-width apart, toes slightly out (15–30°)
• Bar on upper traps (high bar) or rear delts (low bar)
• Core braced like you're about to take a punch

**The Descent:**
• Hinge hips back first, then bend knees
• Knees track over toes — don't cave inward
• Chest tall, spine neutral throughout

**The Drive:**
• Push the floor away — don't think "stand up"
• Drive knees out as you ascend
• Lock out hips fully at the top

**Common mistakes I see most:**
1. Butt wink (pelvis tucks under at the bottom)
2. Heels rising — may need ankle mobility work
3. Forward lean — check hip flexor tightness

Want me to analyse a video of your squat? 🎥`,

  diet: `**Pre & Post Workout Nutrition 🍽️**

**Pre-Workout (1–2 hrs before):**
• Complex carbs: oats, rice, sweet potato
• Moderate protein: chicken, Greek yogurt, eggs
• Low fat & fibre — digests slowly, avoid GI issues
• Example: 100g oats + 30g whey + banana

**Post-Workout (within 30–60 mins):**
• Fast carbs: white rice, potato, fruit
• High protein: 30–40g to maximise MPS
• Example: rice + chicken breast + veggies

**The real truth:** The total daily intake matters more than timing. Hit your protein goal first — everything else is secondary.

Want me to calculate your exact macros? Drop your weight and goal. 📊`,
}

function getMockReply(prompt: string): string {
  const lower = prompt.toLowerCase()
  if (lower.includes('squat') || lower.includes('form') || lower.includes('deadlift')) return MOCK_REPLIES.form
  if (lower.includes('eat') || lower.includes('diet') || lower.includes('protein') || lower.includes('macro')) return MOCK_REPLIES.diet
  return MOCK_REPLIES.default
}

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function genId() {
  return Math.random().toString(36).slice(2, 9)
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

/** render basic markdown bold + bullets */
function renderMarkdown(text: string) {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    // bold **text**
    const parts = line.split(/(\*\*[^*]+\*\*)/).map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j} className="font-bold text-brand-slate">{part.slice(2, -2)}</strong>
      }
      return part
    })

    if (line.startsWith('• ') || line.startsWith('* ')) {
      return (
        <div key={i} className="flex items-start gap-2 text-sm">
          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-purple" />
          <span>{parts.slice(1)}</span>
        </div>
      )
    }
    if (/^\d+\./.test(line)) {
      return <div key={i} className="flex items-start gap-2 text-sm"><span className="font-semibold text-brand-purple">{line.match(/^\d+\./)?.[0]}</span><span>{parts.slice(1)}</span></div>
    }
    if (line === '') return <div key={i} className="h-2" />
    return <p key={i} className="text-sm leading-relaxed">{parts}</p>
  })
}

/* ─────────────────────────────────────────────
   TYPING INDICATOR
───────────────────────────────────────────── */
function TypingIndicator() {
  return (
    <div className="flex items-end gap-2.5">
      {/* avatar */}
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-soft to-brand-deep shadow-sm">
        <Image src={AiIcon} alt="AI" width={18} height={18} />
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-sm border border-brand-pale">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-brand-purple/70"
          />
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   MESSAGE BUBBLE
───────────────────────────────────────────── */
function MessageBubble({
  message,
  onLike,
  onDislike,
}: {
  message: Message
  onLike:    (id: string) => void
  onDislike: (id: string) => void
}) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex items-end justify-end gap-2.5">
        <div className="max-w-[75%] space-y-1">
          {message.image && (
            <div className="overflow-hidden rounded-2xl rounded-br-sm border border-brand-pale">
              <img src={message.image} alt="Uploaded" className="max-h-48 w-full object-cover" />
            </div>
          )}
          {message.text && (
            <div className="rounded-2xl rounded-br-sm bg-gradient-to-br from-brand-soft to-brand-deep px-4 py-3 text-white shadow-md">
              <p className="text-sm leading-relaxed">{message.text}</p>
            </div>
          )}
          <p className="text-right text-[10px] text-brand-slate/40">{formatTime(message.timestamp)}</p>
        </div>
        {/* user avatar */}
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-bg text-white shadow-sm">
          <Image src={usericon} alt="User" width={20} height={20} />
        </div>
      </div>
    )
  }

  /* assistant bubble */
  return (
    <div className="flex items-end gap-2.5">
      {/* AI avatar */}
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-bg from-brand-soft to-brand-deep shadow-sm">
        <Image src={AiIcon} alt="AI Trainer" width={20} height={20} />
      </div>

      <div className="max-w-[78%] space-y-1">
        <div className="rounded-2xl rounded-bl-sm border border-brand-pale bg-white px-4 py-3.5 shadow-sm">
          <div className="space-y-1 text-brand-slate">
            {renderMarkdown(message.text)}
          </div>
        </div>

        {/* timestamp + feedback */}
        <div className="flex items-center gap-3 pl-1">
          <p className="text-[10px] text-brand-slate/40">{formatTime(message.timestamp)}</p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onLike(message.id)}
              className={`rounded-lg p-1 transition-colors ${
                message.liked === true
                  ? 'bg-green-50 text-green-500'
                  : 'text-brand-slate/30 hover:text-green-500 hover:bg-green-50'
              }`}
            >
              <ThumbsUp size={11} />
            </button>
            <button
              onClick={() => onDislike(message.id)}
              className={`rounded-lg p-1 transition-colors ${
                message.liked === false
                  ? 'bg-red-50 text-red-400'
                  : 'text-brand-slate/30 hover:text-red-400 hover:bg-red-50'
              }`}
            >
              <ThumbsDown size={11} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   EMPTY STATE  (shown before first message)
───────────────────────────────────────────── */
function EmptyState({ onTopicClick }: { onTopicClick: (prompt: string) => void }) {
  return (
    <>
      {/* hero */}
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-soft to-brand-deep shadow-xl">
            <Image src={AiIcon} alt="AI Trainer" width={40} height={40} />
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold text-brand-slate">Your AI Fitness Trainer</h2>
          <p className="mt-1 max-w-xs text-sm text-brand-slate/55">
            Ask me anything — form checks, workout plans, diet advice, recovery tips, and more.
          </p>
        </div>
      </div>

      {/* quick topics */}
      <div className="w-full">
        <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-widest text-brand-slate/40">
          Quick Topics
        </p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {QUICK_TOPICS.map((topic) => (
            <button
              key={topic.label}
              onClick={() => onTopicClick(topic.prompt)}
              className="group flex items-center gap-2.5 rounded-2xl border border-brand-pale bg-white px-3.5 py-3 text-left shadow-sm transition-colors hover:border-brand-mauve"
            >
              <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${topic.color} text-white shadow-sm`}>
                {topic.icon}
              </div>
              <span className="text-xs font-semibold text-brand-slate group-hover:text-brand-purple transition-colors">
                {topic.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* disclaimer */}
      <p className="text-center text-[10px] text-brand-slate/30">
        AI Trainer gives general fitness guidance. Always consult a professional before starting any new exercise program.
      </p>
    </>
  )
}

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function AITrainerPage() {
  const [messages,     setMessages]     = useState<Message[]>([])
  const [input,        setInput]        = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isTyping,     setIsTyping]     = useState(false)
  const [showScrollBtn, setShowScrollBtn] = useState(false)

  const bottomRef    = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef  = useRef<HTMLTextAreaElement>(null)
  const scrollRef    = useRef<HTMLDivElement>(null)

  /* ── auto scroll ── */
  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  useEffect(() => {
    if (messages.length || isTyping) scrollToBottom()
  }, [messages, isTyping, scrollToBottom])

  /* ── scroll button visibility ── */
  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 120)
  }

  /* ── textarea auto-grow ── */
  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    const ta = textareaRef.current
    if (ta) { ta.style.height = 'auto'; ta.style.height = `${Math.min(ta.scrollHeight, 140)}px` }
  }

  /* ── image upload ── */
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return
    setImagePreview(URL.createObjectURL(file))
  }

  /* ── like / dislike ── */
  function handleLike(id: string) {
    setMessages((prev) =>
      prev.map((m) => m.id === id ? { ...m, liked: m.liked === true ? null : true } : m)
    )
  }

  function handleDislike(id: string) {
    setMessages((prev) =>
      prev.map((m) => m.id === id ? { ...m, liked: m.liked === false ? null : false } : m)
    )
  }

  /* ── send message ── */
  async function sendMessage(overrideText?: string) {
    const text = (overrideText ?? input).trim()
    if (!text && !imagePreview) return

    const userMsg: Message = {
      id:        genId(),
      role:      'user',
      text,
      image:     imagePreview ?? undefined,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (textareaRef.current)  textareaRef.current.style.height = 'auto'

    /* simulate AI thinking */
    setIsTyping(true)
    await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000))
    setIsTyping(false)

    const aiMsg: Message = {
      id:        genId(),
      role:      'assistant',
      text:      getMockReply(text),
      timestamp: new Date(),
      liked:     null,
    }
    setMessages((prev) => [...prev, aiMsg])
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const canSend = (input.trim().length > 0 || imagePreview !== null) && !isTyping

  return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-brand-pale bg-white shadow-[0_4px_24px_-6px_#9567B925]">

      {/* ── Messages area ── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={`relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-brand-bg ${
          messages.length === 0 && !isTyping
            ? 'flex flex-col items-center justify-center gap-8 px-10 py-12'
            : ''
        }`}
      >
        {messages.length === 0 && !isTyping ? (
          <EmptyState onTopicClick={(prompt) => sendMessage(prompt)} />
        ) : (
          <div className="space-y-5 px-10 py-6">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onLike={handleLike}
                onDislike={handleDislike}
              />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>
        )}

        {/* scroll to bottom button */}
        {showScrollBtn && (
          <button
            onClick={() => scrollToBottom()}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-brand-pale bg-white px-4 py-2 text-xs font-semibold text-brand-slate shadow-lg transition hover:border-brand-purple hover:text-brand-purple"
          >
            <ChevronDown size={13} />
            Scroll to latest
          </button>
        )}
      </div>

      {/* ── Input area ── */}
      <div className="border-t border-brand-pale bg-white px-10 py-3">
        <div className="space-y-2.5">

          {/* image preview strip */}
          {imagePreview && (
            <div className="flex items-center gap-2 rounded-xl border border-brand-pale bg-brand-bg px-3 py-2">
              <img
                src={imagePreview}
                alt="Attached"
                className="h-12 w-12 rounded-lg object-cover border border-brand-pale"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-brand-slate">Image attached</p>
                <p className="text-[10px] text-brand-slate/45">AI will analyse this photo</p>
              </div>
              <button
                onClick={() => { setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                className="rounded-lg p-1 text-brand-slate/40 hover:bg-brand-pale hover:text-brand-slate transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* quick topic pills (always visible when chat is empty) */}
          {messages.length === 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {QUICK_TOPICS.map((t) => (
                <button
                  key={t.label}
                  onClick={() => sendMessage(t.prompt)}
                  className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-brand-pale bg-brand-bg px-3 py-1.5 text-xs font-semibold text-brand-slate/70 transition hover:border-brand-purple hover:text-brand-purple"
                >
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br ${t.color} text-white`}>
                    {React.cloneElement(t.icon as React.ReactElement, { size: 9 })}
                  </span>
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {/* main input row */}
          <div className="flex items-end gap-2">

            {/* image upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-brand-pale bg-brand-bg text-brand-slate/50 transition hover:border-brand-mauve hover:text-brand-purple"
              title="Attach photo"
            >
              <ImagePlus size={17} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* textarea */}
            <div className="relative flex-1 rounded-2xl border border-brand-pale bg-brand-bg focus-within:border-brand-purple focus-within:ring-2 focus-within:ring-brand-purple/15 transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask your trainer anything — form, diet, reps, recovery…"
                rows={1}
                className="w-full resize-none rounded-2xl bg-transparent px-4 py-2.5 text-sm text-brand-slate outline-none placeholder:text-brand-slate/35"
                style={{ minHeight: '42px', maxHeight: '140px' }}
              />
              {/* shift+enter hint */}
              {input.length > 0 && (
                <span className="absolute bottom-2 right-3 text-[9px] text-brand-slate/25">
                  Shift+Enter for new line
                </span>
              )}
            </div>

            {/* mic */}
            <button
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-brand-pale bg-brand-bg text-brand-slate/50 transition hover:border-brand-mauve hover:text-brand-purple"
              title="Voice input (coming soon)"
            >
              <Mic size={17} />
            </button>

            {/* send */}
            <button
              onClick={() => sendMessage()}
              disabled={!canSend}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-purple to-brand-deep text-white shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
              title="Send"
            >
              <Send size={16} />
            </button>

          </div>

          {/* footer note */}
          <p className="text-center text-[10px] text-brand-slate/30">
            AI Trainer · Powered by FitBuddy AI · Not a substitute for professional medical advice
          </p>

        </div>
      </div>
    </div>
  )
}