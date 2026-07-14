import { apiSlice } from "@/store/api/apiSlice";

export const conversationsApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        // Find existing DM or create a new one
        findOrCreateConversation: builder.mutation({
            query: (body) => ({
                url: "conversations/find-or-create",
                method: "POST",
                body,
            }),
            transformResponse: (response) => response?.data ?? response,
        }),

        createConversation: builder.mutation({
            query: (body) => ({
                url: "conversations",
                method: "POST",
                body,
            }),
            transformResponse: (response) => response?.data ?? response,
        }),

        // Fetch all conversations for the sidebar
        getConversations: builder.query({
            query: () => "conversations",
            transformResponse: (response) => response?.data ?? response ?? [],
        }),

        // Paginated message fetch (limit + before cursor)
        getMessages: builder.query({
            query: ({ id, limit = 20, before } = {}) => {
                const params = new URLSearchParams({ limit });
                if (before) params.set("before", before);
                return `conversations/${id}/messages?${params}`;
            },
            transformResponse: (response) =>
                response?.data?.messages ?? response?.data ?? [],
        }),

        createMessage: builder.mutation({
            query: ({ conversationId, ...body }) => ({
                url: `conversations/${conversationId}/messages`,
                method: "POST",
                body,
            }),
            transformResponse: (response) => response?.data ?? response,
        }),
    }),
});

export const {
    useFindOrCreateConversationMutation,
    useCreateConversationMutation,
    useGetConversationsQuery,
    useGetMessagesQuery,
    useCreateMessageMutation,
} = conversationsApi;
