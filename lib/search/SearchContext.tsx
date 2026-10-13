"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { AIRecipe, SearchResult } from "@/lib/types";
import type { ChatPanelMessage } from "@/components/ChatPanel/ChatPanel";
import { useCart } from "@/components/Cart/CartContext";

/*
 * The shared search result.
 * ---------------------------------------------------------------------------
 * Two pages need the same answer: /results shows the chat and the tables, and
 * /results/products shows the same tables plus the product cards. Asking the
 * AI twice would be slow, wasteful, and could return a slightly different list
 * the second time.
 *
 * So one React Context holds it, and both pages read from it.
 *
 * It is also mirrored into sessionStorage. Without that, a refresh on the
 * products page - or opening it directly - would find an empty context and
 * have nothing to show. sessionStorage is per-tab and clears when the tab
 * closes, which is exactly the lifetime a search result should have.
 */

/**
 * Versioned, because what is stored changed shape.
 *
 * v1 results carried finished product cards but not the AI's shopping list,
 * so they can never be refreshed - they would show their old photos forever.
 * Bumping the key means v1 results are simply never read again, and the
 * restore below deletes them, so nobody is left looking at a stale basket.
 */
const STORAGE_KEY = "dailyvalue:search:v2";
const LEGACY_STORAGE_KEY = "dailyvalue:search";

export type SearchStatus = "idle" | "loading" | "ready" | "error";

interface StoredState {
  result: SearchResult | null;
  messages: ChatPanelMessage[];
}

interface SearchContextValue {
  result: SearchResult | null;
  messages: ChatPanelMessage[];
  status: SearchStatus;
  error: string | null;
  /**
   * Run a search.
   *
   * By default this is a follow-up: the existing thread is sent along, so
   * "I don't like graham crackers" edits the current list. Pass `fresh` to
   * start a new conversation instead, which is what a `?q=` in the URL means.
   */
  runSearch: (query: string, options?: { fresh?: boolean }) => Promise<void>;
  /**
   * Rewrite one of the shopper's own messages and answer it again.
   *
   * Everything from that message onwards is discarded first, because it was
   * all an answer to a question that no longer exists. Editing the third
   * message of five leaves two.
   *
   * Editing to exactly the same text does nothing at all - opening the editor
   * and changing your mind must not cost an AI request or replace an answer
   * that was perfectly good.
   */
  editMessage: (id: string, nextText: string) => Promise<void>;
  /** Throw away the current result, e.g. when starting a fresh search. */
  reset: () => void;
  /**
   * Record which cart lines came from this search.
   *
   * The products page calls this when the shopper confirms their basket. The
   * next search then removes exactly these lines, so one search's list does
   * not pile on top of the last one's - while anything added from the landing
   * storefront, which was a separate deliberate choice, is left alone.
   */
  registerCommitted: (ids: string[]) => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

/** The recipe most recently shown in the thread, if any. */
function latestRecipe(messages: ChatPanelMessage[]): AIRecipe | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].recipe) return messages[i].recipe;
  }
  return undefined;
}

/**
 * Should this reply print the recipe, or is it already on screen?
 *
 * The complaint was that asking "add a wine that goes with it" printed the
 * whole fried rice method again, which does not read like a conversation. The
 * obvious fix - compare the new recipe with the old one and skip it if they
 * match - cannot work, and finding out why was the useful part.
 *
 * The model does not carry the recipe forward. It writes a new one every turn.
 * On the wine turn, with nothing about the dish asked, it came back with every
 * step reworded, the tips rewritten, an onion gone and the rice up from 4 cups
 * to 6. The same recipe to a reader, a completely different object to `===`.
 * No comparison of the payload can tell a rewrite from a revision, because the
 * payload changes either way.
 *
 * So the question is about intent, and intent is not in the payload. The model
 * is asked directly - `recipeChanged` - and code covers the two ways that can
 * be wrong:
 *
 *   - a false on the very first recipe would hide it completely, so the first
 *     one always prints;
 *   - a false while the dish really did change would hide a revision the
 *     shopper asked for, so a different title or serving count overrides it.
 *
 * When it does not print, the earlier card keeps the recipe the shopper
 * already has - which also stops their rice quietly becoming 6 cups.
 */
function shouldShowRecipe(
  incoming: AIRecipe | null | undefined,
  changed: boolean | null | undefined,
  previous: AIRecipe | undefined,
): boolean {
  if (!incoming) return false;
  if (!previous) return true; // nothing on screen yet: always show the first

  if (incoming.title !== previous.title) return true;
  if (incoming.servings !== previous.servings) return true;

  return changed !== false;
}

/** Read the saved state. Returns empty state if anything at all goes wrong. */
function readStored(): StoredState {
  if (typeof window === "undefined") return { result: null, messages: [] };
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { result: null, messages: [] };
    const parsed = JSON.parse(raw) as StoredState;
    return {
      result: parsed?.result ?? null,
      messages: Array.isArray(parsed?.messages) ? parsed.messages : [],
    };
  } catch {
    // Private browsing, cleared storage, or malformed JSON. Not worth a crash.
    return { result: null, messages: [] };
  }
}

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [result, setResult] = useState<SearchResult | null>(null);
  const [messages, setMessages] = useState<ChatPanelMessage[]>([]);
  const [status, setStatus] = useState<SearchStatus>("idle");
  // SearchProvider sits inside CartProvider (see app/layout.tsx), so it can
  // clear the previous search's lines when a new one lands.
  const { dropItems } = useCart();
  const committedIds = useRef<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Restore once on mount.
  //
  // This has to be an effect. sessionStorage only exists in the browser, so
  // the server renders with nothing. If we read it during the first client
  // render instead, the client would produce different HTML from the server
  // and React would report a hydration mismatch. An effect runs after
  // hydration has finished, which is the one safe moment.
  //
  // The lint rule below flags setState-inside-an-effect because it usually
  // signals derived state that should have been computed during render. This
  // is the documented exception: syncing FROM an external system (browser
  // storage) that React cannot see, exactly once.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;

    try {
      window.sessionStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // Blocked storage. Nothing was going to be read from it anyway.
    }

    const stored = readStored();
    const saved = stored.result;
    if (!saved) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResult(saved);
    setMessages(stored.messages);
    setStatus("ready");

    // Show the saved result straight away, then rebuild its product cards from
    // current data. The AI's answer is still good; the cards may not be - a
    // photo, a price or a matching rule may have changed since it was saved.
    if (!saved.items?.length) return;

    void (async () => {
      try {
        const response = await fetch("/api/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: saved.items }),
        });
        if (!response.ok) return;
        const fresh = (await response.json()) as Pick<
          SearchResult,
          "products" | "unresolved"
        >;

        // Only swap if the shopper is still looking at this same result. If
        // they started a new search while this was in flight, `current` is a
        // different object and must be left alone.
        setResult((current) =>
          current && current.items === saved.items
            ? { ...current, products: fresh.products, unresolved: fresh.unresolved }
            : current,
        );
      } catch {
        // Offline, or the server is restarting. The saved cards may be a little
        // stale, which is better than no cards at all.
      }
    })();
  }, []);

  // Mirror every change back to sessionStorage.
  useEffect(() => {
    if (!restored.current) return;
    try {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ result, messages } satisfies StoredState),
      );
    } catch {
      // Storage can be full or blocked. The app works fine without it.
    }
  }, [result, messages]);

  // Ids for chat messages. A ref rather than state, because bumping it must
  // not trigger a re-render.
  const nextId = useRef(1);
  const makeId = () => String(nextId.current++);

  /**
   * Ask the server one question and fold the answer into the thread.
   *
   * Shared by runSearch and editMessage. Those two differ only in what the
   * thread looks like at the moment the question is asked - a follow-up has
   * appended a message, an edit has rewound to one - so everything from the
   * network call onwards lives here once instead of twice.
   */
  const ask = useCallback(
    async (trimmed: string, history: { role: "user" | "ai"; text: string }[]) => {
      setStatus("loading");
      setError(null);

      try {
        const response = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed, history }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error ?? "That search did not work.");
        }

        const searchResult = data as SearchResult;

        setMessages((prev) => {
          // The recipe lives on the message, not on the page, so each reply
          // keeps the version of the recipe it was given. A later "make it
          // no-bake" adds a new message with the updated recipe, and the
          // earlier one still shows what was said at the time.
          //
          // A turn that did not change the dish prints no recipe at all - see
          // shouldShowRecipe above.
          const show = shouldShowRecipe(
            searchResult.recipe,
            searchResult.recipeChanged,
            latestRecipe(prev),
          );

          return [
            ...prev,
            {
              id: makeId(),
              role: "ai",
              text: searchResult.reply,
              recipe: show ? (searchResult.recipe ?? undefined) : undefined,
            },
          ];
        });

        const hasSomethingToShow = searchResult.tables.length > 0;
        // No history means this is the opening question of a conversation -
        // true for a fresh search, and true again when the FIRST message in
        // the thread is edited.
        const isFirstResult = history.length === 0 || result === null;

        // A new list replaces the old one, so anything the shopper confirmed
        // from the PREVIOUS search leaves the cart now. Without this the badge
        // just climbs forever as they try one query after another.
        //
        // Only lines this search committed are dropped. Anything added from
        // the landing storefront was a separate deliberate choice and stays.
        if (searchResult.inScope && hasSomethingToShow) {
          dropItems(committedIds.current);
          committedIds.current = [];
        }

        // An answer with nothing to buy updates the thread but must NOT wipe a
        // list the shopper already has. Two cases hit this:
        //   - a refusal ("what's the weather") mid-session
        //   - a conversational reply the model chose not to attach a table to
        // In both, emptying the basket would be the wrong response to a
        // question that was never about the basket.
        if (searchResult.inScope && (hasSomethingToShow || isFirstResult)) {
          setResult(searchResult);
        }

        setStatus("ready");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "That search did not work.";
        setError(message);
        setStatus("error");
        setMessages((prev) => [
          ...prev,
          {
            id: makeId(),
            role: "ai",
            text: `${message} Please try again in a moment.`,
          },
        ]);
      }
    },
    [result, dropItems],
  );

  const runSearch = useCallback(
    async (query: string, options?: { fresh?: boolean }) => {
      const trimmed = query.trim();
      if (!trimmed) return;

      // A fresh search starts a new conversation: no history is sent, and any
      // lines the previous search put in the cart are taken out now rather
      // than waiting for the answer.
      const fresh = options?.fresh === true;
      if (fresh) {
        dropItems(committedIds.current);
        committedIds.current = [];
      }

      // Show the shopper's message immediately, before the network call. The
      // thread feels instant even though the answer takes a second or two.
      const userMessage: ChatPanelMessage = {
        id: makeId(),
        role: "user",
        text: trimmed,
      };

      // Capture the history BEFORE adding this message, so the server is not
      // sent the question twice.
      const history = fresh ? [] : messages.map((m) => ({ role: m.role, text: m.text }));

      setMessages((prev) => (fresh ? [userMessage] : [...prev, userMessage]));
      await ask(trimmed, history);
    },
    [messages, ask, dropItems],
  );

  const editMessage = useCallback(
    async (id: string, nextText: string) => {
      const trimmed = nextText.trim();
      if (!trimmed) return;

      const index = messages.findIndex((m) => m.id === id && m.role === "user");
      if (index === -1) return;

      // Opened the editor, changed nothing, closed it. Nothing should move -
      // not the thread, not the tables, and certainly not an AI request.
      if (messages[index].text === trimmed) return;

      const before = messages.slice(0, index);

      // The thread rewinds to just before the edited message, then carries the
      // rewritten question. Everything that followed was an answer to a
      // question that no longer exists.
      setMessages([...before, { ...messages[index], text: trimmed }]);

      await ask(
        trimmed,
        before.map((m) => ({ role: m.role, text: m.text })),
      );
    },
    [messages, ask],
  );

  const registerCommitted = useCallback((ids: string[]) => {
    committedIds.current = ids;
  }, []);

  const reset = useCallback(() => {
    dropItems(committedIds.current);
    committedIds.current = [];
    setResult(null);
    setMessages([]);
    setStatus("idle");
    setError(null);
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to do; the in-memory state is already cleared.
    }
  }, [dropItems]);

  // useMemo stops every consumer re-rendering whenever this component does.
  const value = useMemo<SearchContextValue>(
    () => ({
      result,
      messages,
      status,
      error,
      runSearch,
      editMessage,
      reset,
      registerCommitted,
    }),
    [result, messages, status, error, runSearch, editMessage, reset, registerCommitted],
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

/** Read the shared search state. Throws if used outside the provider. */
export function useSearch(): SearchContextValue {
  const ctx = useContext(SearchContext);
  if (!ctx) {
    throw new Error("useSearch must be used inside a SearchProvider");
  }
  return ctx;
}
