import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { conversationUrl } from "@/config/routes";

function Sidebar({ conversations, activeId }) {
    return (
        <aside className="w-80 border-r border-slate-200 bg-white overflow-y-auto shrink-0 flex flex-col">
            <div className="p-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                <h2 className="font-semibold text-slate-800">Hội thoại</h2>
            </div>

            {conversations.length === 0 ? (
                <p className="text-sm text-slate-400 p-4">Chưa có hội thoại nào.</p>
            ) : (
                <ul className="divide-y divide-slate-100 flex-1">
                    {conversations.map((conversation) => {
                        const latestMessage = conversation.latestMessage;
                        const isActive =
                            conversation.id === Number(activeId);

                        return (
                            <li key={conversation.id}>
                                <Link
                                    to={conversationUrl(conversation.id)}
                                    className={`block px-4 py-3 transition-colors hover:bg-slate-50 ${
                                        isActive
                                            ? "bg-blue-50 border-l-2 border-blue-500"
                                            : "border-l-2 border-transparent"
                                    }`}
                                >
                                    <p className="text-sm font-medium text-slate-800 truncate">
                                        {conversation.participantEmail ||
                                            "Người dùng"}
                                    </p>
                                    {latestMessage ? (
                                        <>
                                            <p className="text-xs text-slate-500 truncate mt-0.5">
                                                {latestMessage.content}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {new Date(
                                                    latestMessage.createdAt,
                                                ).toLocaleTimeString("vi-VN", {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-xs text-slate-400 mt-0.5 italic">
                                            Chưa có tin nhắn
                                        </p>
                                    )}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </aside>
    );
}

Sidebar.propTypes = {
    conversations: PropTypes.array.isRequired,
    activeId: PropTypes.string,
};

export default Sidebar;
