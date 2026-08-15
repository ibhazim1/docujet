"use client";

/**
 * The floating assistant on the public site.
 *
 * Mounted once by `SiteChrome`, so it rides along on every visitor-facing page
 * — including the ones Plasmic renders — and never appears on /admin, /login,
 * or the Plasmic host. Because the root layout persists across client
 * navigations, an open conversation survives moving between pages; the copy in
 * `sessionStorage` is what carries it across a hard reload.
 *
 * It knows nothing about n8n. It posts to `/api/chat` and renders whatever
 * comes back, which is what keeps the workflow swappable.
 */

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * The markdown parser is a good deal larger than the panel it serves, and most
 * visitors never open the panel — so it is fetched on open rather than on page
 * load. Until the chunk lands, the fallback shows the same text unparsed, which
 * means a slow network costs the reply's formatting for a moment and never the
 * reply itself.
 */
const MessageText = lazy(() => import("./MessageText"));

function AssistantText({ text }: { text: string }) {
  return (
    <Suspense fallback={<PlainText text={text} />}>
      <MessageText text={text} />
    </Suspense>
  );
}

/** Verbatim text: the greeting, and anything the visitor typed themselves. */
function PlainText({ text }: { text: string }) {
  return <span className="whitespace-pre-wrap">{text}</span>;
}

type Message = {
  id: string;
  /** `error` is rendered as a notice rather than a bubble, and never sent back as history. */
  role: "user" | "assistant" | "error";
  content: string;
};

const GREETING =
  "Hi! I'm the DocuJet assistant. Ask me about the WorkForce Enterprise range, pricing direction, or booking a consultation.";

const SUGGESTIONS = [
  "What resolution and geometry do the Epson MicroTFP print chips have?",
  "What is Heat-Free Technology?",
  "How fast do the Epson WorkForce Enterprise printers print on A4?",
];

const MAX_MESSAGE_CHARS = 1000;

/** Turns kept in the panel and forwarded as context. Matches the API's own cap. */
const MAX_HISTORY_TURNS = 8;

const STORAGE_KEY = "docujet.chat.transcript";
const SESSION_KEY = "docujet.chat.session";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function ChatWidget() {
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isPending, setIsPending] = useState(false);

  const sessionIdRef = useRef<string>("");
  const restoredRef = useRef(false);
  const refocusLauncherRef = useRef(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  /**
   * The id a memory node in the workflow can thread the conversation on.
   *
   * Created on first use rather than on mount, because most visitors never open
   * the panel and a page load should not be writing to their storage.
   */
  function sessionId(): string {
    if (sessionIdRef.current) return sessionIdRef.current;

    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      sessionIdRef.current = stored ?? newId();
      if (!stored) sessionStorage.setItem(SESSION_KEY, sessionIdRef.current);
    } catch {
      // Private browsing, or storage disabled. The id then lasts as long as the
      // page does, which is enough for one visit's conversation.
      sessionIdRef.current = newId();
    }

    return sessionIdRef.current;
  }

  /**
   * Reads back a conversation left behind by a reload.
   *
   * Deliberately done on open rather than on mount: it keeps the restore out of
   * an effect (where it would cascade a render for every visitor) and costs
   * nothing for the ones who never open the panel.
   */
  function open() {
    // Start fetching the markdown chunk now. A reply takes seconds to arrive,
    // so by the time there is anything to format it is almost always ready.
    void import("./MessageText");

    if (!restoredRef.current) {
      restoredRef.current = true;
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        const parsed = stored ? (JSON.parse(stored) as Message[]) : null;
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      } catch {
        // A corrupt or unreadable transcript is not worth a visible error.
      }
    }

    setIsOpen(true);
  }

  useEffect(() => {
    if (messages.length === 0) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Not worth telling the visitor about — the panel still works.
    }
  }, [messages]);

  // Pin to the newest message whenever the transcript grows or the typing
  // indicator appears.
  useEffect(() => {
    if (!isOpen) return;
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, isPending, isOpen]);

  // Keyboard focus follows the panel. Closing has to hand focus back in an
  // effect rather than in the handler, because the launcher does not exist
  // again until the render that unmounts the panel has happened.
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    } else if (refocusLauncherRef.current) {
      refocusLauncherRef.current = false;
      launcherRef.current?.focus();
    }
  }, [isOpen]);

  // Grow the composer with its content, up to a few lines, then scroll.
  useEffect(() => {
    const node = inputRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 120)}px`;
  }, [input]);

  const close = useCallback(() => {
    refocusLauncherRef.current = true;
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, close]);

  async function send(text: string) {
    const question = text.trim();
    if (question === "" || isPending) return;

    // Snapshot before the state update so the request carries the turns the
    // visitor can actually see, minus any failure notices.
    const history = messages
      .filter((message) => message.role !== "error")
      .slice(-MAX_HISTORY_TURNS)
      .map(({ role, content }) => ({ role: role as "user" | "assistant", content }));

    setMessages((current) => [
      ...current,
      { id: newId(), role: "user", content: question },
    ]);
    setInput("");
    setIsPending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          sessionId: sessionId(),
          page: pathname,
          history,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        reply?: string;
        error?: string;
      };

      setMessages((current) => [
        ...current,
        response.ok && data.reply
          ? { id: newId(), role: "assistant", content: data.reply }
          : {
              id: newId(),
              role: "error",
              content:
                data.error ??
                "The assistant is unavailable right now. Please try again shortly.",
            },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: newId(),
          role: "error",
          content:
            "We could not reach the assistant. Check your connection and try again.",
        },
      ]);
    } finally {
      setIsPending(false);
      inputRef.current?.focus();
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends; Shift+Enter is a new line — the convention every messaging
    // app has trained visitors on.
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send(input);
    }
  }

  return (
    <>
      {!isOpen && (
        <button
          ref={launcherRef}
          type="button"
          onClick={open}
          aria-label="Open the DocuJet assistant"
          className="fixed bottom-6 right-6 z-50 inline-flex h-14 items-center gap-2.5 rounded-full bg-sky-800 px-4 text-white shadow-[0_20px_45px_-20px_rgba(3,105,161,0.9)] transition hover:bg-sky-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-200 sm:px-5"
        >
          <ChatIcon className="h-6 w-6" />
          <span className="hidden text-sm font-semibold sm:inline">
            Ask DocuJet
          </span>
        </button>
      )}

      {isOpen && (
        <div
          role="dialog"
          aria-label="DocuJet assistant"
          className="docujet-chat-panel fixed bottom-4 left-4 right-4 z-50 flex h-[min(34rem,calc(100dvh-2rem))] flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.55)] sm:bottom-6 sm:left-auto sm:right-6 sm:w-[24rem]"
        >
          <header className="flex items-start justify-between gap-3 bg-slate-950 px-5 py-4 text-white">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-sky-200">
                DocuJet Assistant
              </p>
              <p className="mt-1 text-sm text-slate-300">
                Products, pricing direction, and bookings
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close the assistant"
              className="-mr-1 -mt-1 rounded-full p-2 text-slate-400 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </header>

          <div
            ref={scrollRef}
            role="log"
            aria-live="polite"
            aria-label="Conversation"
            className="flex flex-1 flex-col gap-3 overflow-y-auto bg-stone-50 px-4 py-4"
          >
            <Bubble role="assistant">
              <PlainText text={GREETING} />
            </Bubble>

            {messages.map((message) =>
              message.role === "error" ? (
                <p
                  key={message.id}
                  role="alert"
                  className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900"
                >
                  {message.content}
                </p>
              ) : (
                <Bubble key={message.id} role={message.role}>
                  {message.role === "assistant" ? (
                    <AssistantText text={message.content} />
                  ) : (
                    <PlainText text={message.content} />
                  )}
                </Bubble>
              ),
            )}

            {isPending && <TypingIndicator />}

            {messages.length === 0 && (
              <div className="mt-1 flex flex-wrap gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void send(suggestion)}
                    className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-sky-700 hover:text-sky-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send(input);
            }}
            className="border-t border-slate-200 bg-white p-3"
          >
            <div className="flex items-end gap-2">
              <label htmlFor="docujet-chat-input" className="sr-only">
                Your question
              </label>
              <textarea
                id="docujet-chat-input"
                ref={inputRef}
                rows={1}
                value={input}
                maxLength={MAX_MESSAGE_CHARS}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask a question..."
                className="max-h-[120px] w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-700 focus:ring-4 focus:ring-sky-100"
              />
              <button
                type="submit"
                disabled={isPending || input.trim() === ""}
                aria-label="Send message"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-800 text-white transition hover:bg-sky-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-200 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <SendIcon className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 px-1 text-[0.7rem] leading-5 text-slate-500">
              Answers are AI-generated. Confirm details before purchase.
            </p>
          </form>
        </div>
      )}
    </>
  );
}

function Bubble({
  role,
  children,
}: {
  role: "user" | "assistant";
  children: React.ReactNode;
}) {
  const isUser = role === "user";

  return (
    <div
      className={
        isUser
          ? "max-w-[85%] self-end rounded-2xl rounded-br-md bg-sky-800 px-4 py-3 text-sm leading-6 text-white"
          // Slightly wider than the visitor's side: this is where the tables and
          // spec lists land, and every millimetre helps them stay readable.
          : "max-w-[92%] self-start rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.6)]"
      }
    >
      {children}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="max-w-[85%] self-start rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3.5 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.6)]">
      <span className="sr-only">The assistant is typing</span>
      <span aria-hidden className="flex gap-1.5">
        <Dot delay="-0.32s" />
        <Dot delay="-0.16s" />
        <Dot delay="0s" />
      </span>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
      style={{ animationDelay: delay }}
    />
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4.5 12h15M13 5.5l6.5 6.5L13 18.5" />
    </svg>
  );
}
