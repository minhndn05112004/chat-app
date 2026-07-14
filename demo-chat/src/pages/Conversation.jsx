import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { ROUTES } from "@/config/routes";
import socketClient from "@/socketClient";
import {
    useGetMessagesQuery,
    useGetConversationsQuery,
    useCreateMessageMutation,
    conversationsApi,
} from "@/store/api/conversationsApi";
import { getApiErrorMessage } from "@/utils/errors";
import {
    BackLink,
    ErrorAlert,
    MessageBubble,
    PageTitle,
    SubmitButton,
    Textarea,
} from "@/components/ui";
import Sidebar from "@/components/Sidebar";

const INITIAL_LIMIT = 20;

function Conversation() {
    const dispatch = useDispatch();
    const { id: conversationId } = useParams();

    // ─── Sidebar conversations ───────────────────────────────────────────────
    const { data: conversations = [] } = useGetConversationsQuery();

    // ─── Initial message fetch (first page) ─────────────────────────────────
    const { data: initialMessages = [] } = useGetMessagesQuery(
        { id: conversationId, limit: INITIAL_LIMIT },
        { skip: !conversationId },
    );

    // ─── Local message list (for prepending older pages) ────────────────────
    const [allMessages, setAllMessages] = useState([]);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // Sync initial messages into local state whenever the conversation changes
    useEffect(() => {
        setAllMessages(initialMessages);
        setHasMore(initialMessages.length >= INITIAL_LIMIT);
    }, [initialMessages, conversationId]);

    // ─── Auto-scroll refs ────────────────────────────────────────────────────
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    const isNearBottom = useCallback(() => {
        const el = messagesContainerRef.current;
        if (!el) return true;
        return el.scrollHeight - el.scrollTop - el.clientHeight <= 50;
    }, []);

    // Scroll to bottom on first load / conversation switch
    useEffect(() => {
        scrollToBottom();
    }, [conversationId, scrollToBottom]);

    // ─── New-message notification badge ─────────────────────────────────────
    const [newMessageCount, setNewMessageCount] = useState(0);

    // Reset badge when switching conversations
    useEffect(() => {
        setNewMessageCount(0);
    }, [conversationId]);

    // ─── Realtime: subscribe to active conversation ──────────────────────────
    const handleNewMessage = useCallback(
        (message) => {
            setAllMessages((prev) => {
                // Avoid duplicates (optimistic update may already include it)
                if (prev.some((m) => m.id === message.id)) return prev;
                return [...prev, message];
            });

            if (isNearBottom()) {
                requestAnimationFrame(() => scrollToBottom());
                setNewMessageCount(0);
            } else {
                setNewMessageCount((prev) => prev + 1);
            }
        },
        [isNearBottom, scrollToBottom],
    );

    useEffect(() => {
        if (!conversationId) return;
        const channel = socketClient.subscribe(`conversation-${conversationId}`);
        channel.bind("created", handleNewMessage);
        return () => channel.unsubscribe();
    }, [conversationId, handleNewMessage]);

    // ─── Realtime: subscribe to ALL conversations for sidebar updates ─────────
    useEffect(() => {
        if (!conversations.length) return;

        const channels = conversations.map((conv) => {
            const ch = socketClient.subscribe(`conversation-${conv.id}`);
            ch.bind("created", (message) => {
                dispatch(
                    conversationsApi.util.updateQueryData(
                        "getConversations",
                        undefined,
                        (draft) => {
                            const idx = draft.findIndex(
                                (c) => c.id === conv.id,
                            );
                            if (idx !== -1) {
                                draft[idx].latestMessage = message;
                                // Bubble to top of sidebar list
                                const [item] = draft.splice(idx, 1);
                                draft.unshift(item);
                            }
                        },
                    ),
                );
            });
            return ch;
        });

        return () => {
            channels.forEach((ch) => ch.unsubscribe());
        };
    }, [conversations, dispatch]);

    // ─── Load older messages (infinite scroll up) ────────────────────────────
    const handleScroll = useCallback(async () => {
        const el = messagesContainerRef.current;
        if (!el || el.scrollTop > 60 || loadingMore || !hasMore) return;

        const oldestMessage = allMessages[0];
        if (!oldestMessage) return;

        setLoadingMore(true);
        try {
            const result = await dispatch(
                conversationsApi.endpoints.getMessages.initiate({
                    id: conversationId,
                    limit: INITIAL_LIMIT,
                    before: oldestMessage.id,
                }),
            ).unwrap();

            if (result.length < INITIAL_LIMIT) setHasMore(false);

            const prevScrollHeight = el.scrollHeight;
            setAllMessages((prev) => [...result, ...prev]);
            requestAnimationFrame(() => {
                el.scrollTop = el.scrollHeight - prevScrollHeight;
            });
        } catch {
            // ignore
        } finally {
            setLoadingMore(false);
        }
    }, [allMessages, conversationId, dispatch, hasMore, loadingMore]);

    // ─── Send message ─────────────────────────────────────────────────────────
    const [content, setContent] = useState("");
    const [error, setError] = useState("");
    const [createMessage, { isLoading: isSending }] = useCreateMessageMutation();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const text = content.trim();
        if (!text) return;
        setContent("");
        setError("");
        try {
            await createMessage({
                conversationId,
                type: "text",
                content: text,
            }).unwrap();
            // Optimistic: message arrives via socket; scroll now anyway
            requestAnimationFrame(() => scrollToBottom());
        } catch (err) {
            setContent(text);
            setError(
                getApiErrorMessage(
                    err,
                    "Không thể gửi tin nhắn. Vui lòng thử lại.",
                ),
            );
        }
    };

    // Allow Ctrl+Enter to submit
    const handleKeyDown = (e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            handleSubmit(e);
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="flex h-[calc(100vh-3.5rem)]">
            {/* ── Sidebar ── */}
            <Sidebar
                conversations={conversations}
                activeId={conversationId}
            />

            {/* ── Chat panel ── */}
            <div className="flex-1 flex flex-col min-w-0 p-6">
                <div className="mb-4">
                    <BackLink to={ROUTES.HOME} />
                </div>

                <PageTitle>Tin nhắn</PageTitle>

                <form
                    onSubmit={handleSubmit}
                    className="flex flex-col flex-1 min-h-0 relative"
                >
                    {error && (
                        <ErrorAlert className="mb-4">{error}</ErrorAlert>
                    )}

                    {/* Load-more indicator */}
                    {loadingMore && (
                        <div className="text-center py-2 text-sm text-slate-400">
                            Đang tải tin nhắn cũ hơn…
                        </div>
                    )}
                    {!hasMore && allMessages.length > 0 && (
                        <div className="text-center py-2 text-xs text-slate-300">
                            — Đầu cuộc hội thoại —
                        </div>
                    )}

                    {/* Message list */}
                    <ul
                        ref={messagesContainerRef}
                        onScroll={handleScroll}
                        className="flex-1 overflow-y-auto mb-4 space-y-2 pr-2"
                    >
                        {allMessages.map((message) => (
                            <MessageBubble key={message.id}>
                                {message.content}
                            </MessageBubble>
                        ))}
                        <div ref={messagesEndRef} />
                    </ul>

                    {/* New-message badge */}
                    {newMessageCount > 0 && (
                        <button
                            type="button"
                            onClick={() => {
                                scrollToBottom();
                                setNewMessageCount(0);
                            }}
                            className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full text-sm shadow-lg hover:bg-blue-700 transition-colors z-10"
                        >
                            ↓ {newMessageCount} tin nhắn mới
                        </button>
                    )}

                    {/* Input area */}
                    <div className="flex gap-2 shrink-0">
                        <Textarea
                            className="flex-1"
                            rows={2}
                            placeholder="Nhập tin nhắn… (Ctrl+Enter để gửi)"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <SubmitButton loading={isSending} loadingText="…">
                            Gửi
                        </SubmitButton>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Conversation;
