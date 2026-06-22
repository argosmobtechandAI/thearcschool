import React, { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUsers, fetchCommunication } from "../features/dataSlice";
import api from "../services/api";
import { toast } from "react-toastify";
import { Search, Send, Megaphone, PenSquare, MessageSquare } from "lucide-react";
import DateRangePicker from "../components/DateRangePicker";

const Communication = () => {
    const dispatch = useDispatch();
    const [activeTab, setActiveTab] = useState("inbox");
    const [searchInboxQuery, setSearchInboxQuery] = useState("");
    const { users, chats } = useSelector((state) => state.data);
    const [content, setContent] = useState("");
    const [selectedRole, setSelectedRole] = useState("all");
    const [selectedChatUser, setSelectedChatUser] = useState(null);
    const [showNewChat, setShowNewChat] = useState(false);
    const [dateRange, setDateRange] = useState({ start: "", end: "" });

    useEffect(() => {
        if (!users || users.length === 0) dispatch(fetchUsers());
        dispatch(fetchCommunication(activeTab));
    }, [dispatch, activeTab]);

    const myself = users?.find(u => u.type === 'admin') || null;

    const filteredUsers = users?.filter((user) => 
        user.name?.toLowerCase().includes(searchInboxQuery?.toLowerCase())
    );

    const showToast = (message, type = "success") => {
        if (type === "success") toast.success(message);
        else toast.error(message);
    };

    const handleSend = async () => {
        if (!content.trim()) return showToast("Message cannot be empty", "error");

        let secondPersonIds = [];

        if (activeTab === "broadcast") {
            secondPersonIds = users.map((u) => u.id);
        } else if (activeTab === "post") {
            const filtered = selectedRole === "all" ? users : users.filter((u) => u.type === selectedRole);
            secondPersonIds = filtered.map((u) => u.id);
        } else if (activeTab === "inbox" && selectedChatUser) {
            secondPersonIds = [selectedChatUser.id];
        } else {
            return showToast("Please select a recipient", "error");
        }

        const payload = {
            firstPerson: myself?.id,
            title: content,
            type: activeTab,
            secondPerson: secondPersonIds,
        };

        try {
            await api.createCommunication(payload);
            setContent("");
            dispatch(fetchCommunication(activeTab));
            showToast("Message sent successfully!", "success");
            setShowNewChat(false);
        } catch (error) {
            showToast(error.response?.data?.message || "Failed to send message", "error");
        }
    };

    const broadcastList = useMemo(() => {
        let list = chats?.filter((c) => c.type === "broadcast");
        if (dateRange.start || dateRange.end) {
            list = list?.filter(msg => {
                const msgDate = new Date(msg.createdAt);
                if (dateRange.start && dateRange.end) {
                    return msgDate >= new Date(dateRange.start) && msgDate <= new Date(dateRange.end);
                } else if (dateRange.start) {
                    return msgDate >= new Date(dateRange.start);
                } else if (dateRange.end) {
                    return msgDate <= new Date(dateRange.end);
                }
                return true;
            });
        }
        return list;
    }, [chats, dateRange]);

    const postList = useMemo(() => {
        let list = chats?.filter((c) => c.type === "post" && c.firstPerson == myself?.id);
        if (dateRange.start || dateRange.end) {
            list = list?.filter(msg => {
                const msgDate = new Date(msg.createdAt);
                if (dateRange.start && dateRange.end) {
                    return msgDate >= new Date(dateRange.start) && msgDate <= new Date(dateRange.end);
                } else if (dateRange.start) {
                    return msgDate >= new Date(dateRange.start);
                } else if (dateRange.end) {
                    return msgDate <= new Date(dateRange.end);
                }
                return true;
            });
        }
        return list;
    }, [chats, myself, dateRange]);

    const inboxUsers = useMemo(() => {
        if (!chats || !myself || !users) return [];
        const uniqueUsers = new Map();
        
        chats.filter(c => c.type === "inbox" && (c.firstPerson == myself.id || c.secondPerson?.includes(myself.id)))
             .forEach(c => {
                 const otherId = c.firstPerson == myself.id ? c.secondPerson[0] : c.firstPerson;
                 const user = users.find(u => u.id == otherId);
                 if (user && !uniqueUsers.has(otherId)) {
                     uniqueUsers.set(otherId, user);
                 }
             });
        return Array.from(uniqueUsers.values());
    }, [chats, users, myself]);

    const selectedChatMessages = useMemo(() => {
        if (!selectedChatUser || !chats || !myself) return [];
        return chats.filter(c => c.type === "inbox" && 
            ((c.firstPerson == myself.id && c.secondPerson?.includes(`${selectedChatUser.id}`)) ||
             (c.firstPerson == selectedChatUser.id && c.secondPerson?.includes(`${myself.id}`)))
        );
    }, [chats, selectedChatUser, myself]);

    const getUserName = (id) => users?.find(usr => usr.id == id)?.name || "Unknown";

    return (
        <div className="space-y-6">

            {/* Header & Tabs */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Communication Center</h1>
                    <p className="text-slate-600 text-sm">Manage messages, announcements, and posts.</p>
                </div>
                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                    <button onClick={() => setActiveTab('inbox')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${activeTab === 'inbox' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}>
                        <MessageSquare size={16} /> Inbox
                    </button>
                    <button onClick={() => setActiveTab('broadcast')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${activeTab === 'broadcast' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}>
                        <Megaphone size={16} /> Broadcasts
                    </button>
                    <button onClick={() => setActiveTab('post')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${activeTab === 'post' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}>
                        <PenSquare size={16} /> Posts
                    </button>
                </div>
                <div>
                    <DateRangePicker onRangeChange={setDateRange} />
                </div>
            </div>

            {/* BROADCAST */}
            {activeTab === "broadcast" && (
                <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row">
                    <div className="p-6 border-b md:border-b-0 md:border-r border-slate-200 md:w-1/3 bg-emerald-50/30">
                        <h2 className="text-lg font-bold text-slate-900 mb-2">New Broadcast</h2>
                        <p className="text-sm text-slate-600 mb-4">Send a mass announcement to all users in the system.</p>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Write broadcast message..."
                            className="w-full border border-slate-300 rounded-xl p-4 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all resize-none h-32"
                        />
                        <button onClick={handleSend} className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-medium shadow-md shadow-emerald-500/20 transition-all active:scale-95 flex justify-center items-center gap-2">
                            <Send size={18} /> Send Broadcast
                        </button>
                    </div>
                    <div className="p-6 md:w-2/3 bg-white">
                        <h3 className="font-semibold text-slate-800 mb-4">Recent Broadcasts</h3>
                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                            {broadcastList?.map((msg) => {
                                const isMe = msg.firstPerson == myself?.id;
                                return (
                                    <div key={msg.id} className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-base font-medium text-slate-800">{msg.title}</h3>
                                            <span className="text-xs text-slate-400 whitespace-nowrap bg-slate-100 px-2 py-1 rounded-md">{new Date(msg.createdAt).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100">
                                            <div className="text-sm text-slate-500">
                                                Sent By <span className={`font-medium ${isMe ? "text-emerald-600" : "text-slate-700"}`}>{isMe ? "You" : getUserName(msg.firstPerson)}</span>
                                            </div>
                                            {isMe && <span className="px-2 py-1 text-[10px] uppercase tracking-wider rounded-full bg-emerald-100 text-emerald-700 font-bold">Your Broadcast</span>}
                                        </div>
                                    </div>
                                );
                            })}
                            {broadcastList?.length === 0 && <div className="text-center p-8 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">No broadcasts found.</div>}
                        </div>
                    </div>
                </div>
            )}

            {/* POST */}
            {activeTab === "post" && (
                <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row">
                    <div className="p-6 border-b md:border-b-0 md:border-r border-slate-200 md:w-1/3 bg-purple-50/30">
                        <h2 className="text-lg font-bold text-slate-900 mb-2">Create Post</h2>
                        <p className="text-sm text-slate-600 mb-4">Publish a post targeted to specific user groups.</p>
                        
                        <label className="block text-sm font-medium text-slate-700 mb-1">Target Audience</label>
                        <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="w-full mb-4 border border-slate-300 p-3 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all bg-white">
                            <option value="all">Everyone</option>
                            <option value="teacher">Teachers Only</option>
                            <option value="student">Students Only</option>
                            <option value="parent">Parents Only</option>
                        </select>

                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Write your post content..."
                            className="w-full border border-slate-300 rounded-xl p-4 focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all resize-none h-32"
                        />
                        <button onClick={handleSend} className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-medium shadow-md shadow-purple-500/20 transition-all active:scale-95 flex justify-center items-center gap-2">
                            <PenSquare size={18} /> Publish Post
                        </button>
                    </div>
                    <div className="p-6 md:w-2/3 bg-white">
                        <h3 className="font-semibold text-slate-800 mb-4">Your Posts</h3>
                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                            {postList?.map((post) => {
                                const isMe = post.firstPerson == myself?.id;
                                return (
                                    <div key={post.id} className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-base font-medium text-slate-800">{post.title}</h3>
                                            <span className="text-xs text-slate-400 whitespace-nowrap bg-slate-100 px-2 py-1 rounded-md">{new Date(post.createdAt).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100">
                                            <div className="text-sm text-slate-500">
                                                Posted By <span className={`font-medium ${isMe ? "text-purple-600" : "text-slate-700"}`}>{isMe ? "You" : getUserName(post.firstPerson)}</span>
                                            </div>
                                            {isMe && <span className="px-2 py-1 text-[10px] uppercase tracking-wider rounded-full bg-purple-100 text-purple-700 font-bold">Your Post</span>}
                                        </div>
                                    </div>
                                );
                            })}
                            {postList?.length === 0 && <div className="text-center p-8 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">No posts published yet.</div>}
                        </div>
                    </div>
                </div>
            )}

            {/* INBOX */}
            {activeTab === "inbox" && (
                <div className="flex h-[600px] border border-slate-200 rounded-2xl overflow-hidden bg-white/80 backdrop-blur-md shadow-sm">
                    {/* Sidebar */}
                    <div className="w-1/3 border-r border-slate-200 bg-slate-50/50 flex flex-col">
                        <div className="p-4 flex justify-between items-center border-b border-slate-200 bg-white">
                            <h2 className="font-bold text-slate-800">Messages</h2>
                            <button onClick={() => setShowNewChat(true)} className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition shadow-sm active:scale-95">
                                + New
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {inboxUsers?.map((user) => (
                                <div key={user?.id} onClick={() => setSelectedChatUser(user)} className={`p-4 cursor-pointer border-b border-slate-100 hover:bg-white transition-colors flex items-center gap-3 ${selectedChatUser?.id === user.id ? "bg-white border-l-4 border-l-blue-600 shadow-sm" : "border-l-4 border-l-transparent"}`}>
                                    <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                                        {user?.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-slate-800 text-sm truncate">{user?.name}</p>
                                        <p className="text-xs text-slate-500 truncate">{user?.type}</p>
                                    </div>
                                </div>
                            ))}
                            {inboxUsers?.length === 0 && <div className="p-6 text-center text-slate-400 text-sm">No active conversations.</div>}
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 flex flex-col bg-white">
                        {selectedChatUser ? (
                            <>
                                <div className="p-4 border-b border-slate-200 bg-white flex items-center gap-3 shadow-sm z-10">
                                    <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                                        {selectedChatUser.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">{selectedChatUser.name}</h3>
                                        <p className="text-xs text-slate-500 capitalize">{selectedChatUser.type}</p>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
                                    {selectedChatMessages?.map((msg) => {
                                        const isMe = msg.firstPerson == myself?.id;
                                        return (
                                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${isMe ? "bg-blue-600 text-white rounded-br-sm" : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"}`}>
                                                    <p>{msg.title}</p>
                                                    <span className={`text-[10px] block mt-1 ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {selectedChatMessages?.length === 0 && <div className="h-full flex items-center justify-center text-slate-400">Say hello to {selectedChatUser.name}!</div>}
                                </div>
                                <div className="p-4 bg-white border-t border-slate-200">
                                    <div className="flex gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                                        <input
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                            className="flex-1 bg-transparent px-3 py-2 focus:outline-none text-sm text-slate-700"
                                            placeholder="Type a message..."
                                        />
                                        <button onClick={handleSend} className="bg-blue-600 text-white p-2.5 rounded-lg hover:bg-blue-700 transition-all shadow-sm active:scale-95">
                                            <Send size={18} />
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                                <MessageSquare size={48} className="text-slate-300 mb-4" />
                                <h3 className="text-lg font-medium text-slate-600">Your Messages</h3>
                                <p className="text-sm mt-1">Select a chat to start messaging or start a new one.</p>
                            </div>
                        )}
                    </div>

                    {/* New Chat Modal */}
                    {showNewChat && (
                        <div onClick={() => setShowNewChat(false)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
                                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                                    <h2 className="text-lg font-bold text-slate-900">Start New Chat</h2>
                                    <button onClick={() => setShowNewChat(false)} className="text-slate-400 hover:text-slate-600 transition bg-white p-1 rounded-md border border-slate-200 hover:bg-slate-100">✕</button>
                                </div>
                                <div className="px-6 py-4 border-b border-slate-100 bg-white">
                                    <div className="relative">
                                        <input type="text" placeholder="Search users by name..." onChange={(e) => setSearchInboxQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 text-sm bg-slate-50 transition-all" />
                                        <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
                                    </div>
                                </div>
                                <div className="max-h-[350px] overflow-y-auto bg-white">
                                    {filteredUsers?.length > 0 ? (
                                        filteredUsers.map((user) => (
                                            <div key={user.id} onClick={() => { setSelectedChatUser(user); setSearchInboxQuery(""); setShowNewChat(false); }} className="flex items-center gap-3 px-6 py-3 cursor-pointer transition-colors hover:bg-blue-50 border-b border-slate-50">
                                                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-sm shadow-sm">{user.name?.charAt(0).toUpperCase()}</div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                                                    <p className="text-xs text-slate-500">{user.email} • <span className="capitalize">{user.type}</span></p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-10 text-center text-slate-400 text-sm">No users found</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Communication;
