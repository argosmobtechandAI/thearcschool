import React, { useState, useMemo, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUsers, fetchCommunication, fetchSystemMonitorList, addLiveChatMessage } from "../features/dataSlice";
import api, { getSystemMonitorHistory, createCommunication } from "../services/api";
import { toast } from "react-toastify";
import { Search, Send, Megaphone, PenSquare, MessageSquare, Activity, Filter } from "lucide-react";
import DateRangePicker from "../components/DateRangePicker";
import { io } from "socket.io-client";

const Communication = () => {
    const dispatch = useDispatch();
    const socketRef = useRef(null);
    const [activeTab, setActiveTab] = useState("my_chats");
    const [socketStatus, setSocketStatus] = useState('Disconnected');
    const [socketUrl, setSocketUrl] = useState('');
    const [searchInboxQuery, setSearchInboxQuery] = useState("");
    const [searchMyChats, setSearchMyChats] = useState("");
    const [searchMonitor, setSearchMonitor] = useState("");
    const { users, chats, monitorChats } = useSelector((state) => state.data);
    const [content, setContent] = useState("");
    const [selectedRole, setSelectedRole] = useState("all");
    const [selectedChatUser, setSelectedChatUser] = useState(null);
    const [selectedMonitorChat, setSelectedMonitorChat] = useState(null);
    const [monitorHistory, setMonitorHistory] = useState([]);
    const [showNewChat, setShowNewChat] = useState(false);
    const [dateRange, setDateRange] = useState({ start: "", end: "" });
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        if (!users || users.length === 0) dispatch(fetchUsers());
    }, [dispatch, users]);

    useEffect(() => {
        if (activeTab === "my_chats") {
            dispatch(fetchCommunication('live_chat'));
        } else if (activeTab === "system_monitor") {
            dispatch(fetchSystemMonitorList());
        } else {
            dispatch(fetchCommunication(activeTab));
        }
    }, [dispatch, activeTab]);

    const myself = (() => {
        try {
            return JSON.parse(localStorage.getItem('adminUser')) || users?.find(u => u.type === 'admin') || null;
        } catch (e) {
            return users?.find(u => u.type === 'admin') || null;
        }
    })();

    useEffect(() => {
        if (!myself?.id) return;

        const SOCKET_URL = (import.meta.env.VITE_API_URL || "http://localhost:3002/api").replace(/\/api\/?$/, '');
        socketRef.current = io(SOCKET_URL);
        setSocketUrl(SOCKET_URL);

        socketRef.current.on('connect', () => {
            setSocketStatus('Connected');
            socketRef.current.emit('identify', myself.id);
        });

        socketRef.current.on('disconnect', () => {
            setSocketStatus('Disconnected');
        });

        socketRef.current.on('receive_message', (newChat) => {
            console.log("Socket received message:", newChat);
            // Optionally show a toast if the message is from someone else
            if (newChat.sender_id !== myself.id) {
                toast.info(`New message from ${users?.find(u => u.id === newChat.sender_id)?.name || 'User'}`);
            }
            dispatch(addLiveChatMessage(newChat));
            dispatch(fetchSystemMonitorList());
        });

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [myself?.id, dispatch]);

    useEffect(() => {
        if (socketRef.current && myself?.id && selectedChatUser?.id) {
            socketRef.current.emit('join_chat', { senderId: myself.id, receiverId: selectedChatUser.id });
        }
    }, [selectedChatUser?.id, myself?.id]);

    const filteredUsers = users?.filter((user) =>
        user.name?.toLowerCase().includes(searchInboxQuery?.toLowerCase())
    );

    const showToast = (message, type = "success") => {
        if (type === "success") toast.success(message);
        else toast.error(message);
    };

    const handleSend = async () => {
        if (!content.trim()) return showToast("Message cannot be empty", "error");

        let payload = null;

        if (activeTab === "broadcast") {
            const secondPersonIds = users.filter(u => u.id !== myself?.id).map((u) => u.id);
            payload = {
                sender_id: myself?.id,
                message: content,
                type: activeTab,
                secondPerson: secondPersonIds
            };
        } else if (activeTab === "post") {
            const filtered = selectedRole === "all" ? users : users.filter((u) => u.type === selectedRole);
            const secondPersonIds = filtered.filter(u => u.id !== myself?.id).map((u) => u.id);
            payload = {
                sender_id: myself?.id,
                message: content,
                type: activeTab,
                secondPerson: secondPersonIds
            };
        } else if (activeTab === "my_chats" && selectedChatUser) {
            payload = {
                sender_id: myself?.id,
                receiver_id: selectedChatUser.id,
                message: content,
                type: 'live_chat',
                secondPerson: [selectedChatUser.id]
            };
        } else {
            return showToast("Please select a recipient", "error");
        }

        try {
            await createCommunication(payload);
            setContent("");
            if (activeTab === "my_chats") dispatch(fetchCommunication('live_chat'));
            else dispatch(fetchCommunication(activeTab));
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
                const msgDate = new Date(msg.createdAt || msg.created_at);
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
        let list = chats?.filter((c) => c.type === "post" && (c.firstPerson == myself?.id || c.sender_id == myself?.id));
        if (dateRange.start || dateRange.end) {
            list = list?.filter(msg => {
                const msgDate = new Date(msg.createdAt || msg.created_at);
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

    const myChatUsers = useMemo(() => {
        if (!chats || !myself || !users) return [];
        const uniqueUsers = new Map();

        const sortedChats = [...chats].sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));

        sortedChats.filter(c => c.type === "live_chat" && (c.sender_id == myself.id || c.receiver_id == myself.id))
            .forEach(c => {
                const otherId = c.sender_id == myself.id ? c.receiver_id : c.sender_id;
                const user = users.find(u => u.id == otherId);
                if (user && !uniqueUsers.has(otherId)) {
                    uniqueUsers.set(otherId, { ...user, lastMessageTime: c.created_at || c.createdAt, lastMessage: c.message || c.title });
                }
            });
        return Array.from(uniqueUsers.values());
    }, [chats, users, myself]);

    const filteredMyChatUsers = useMemo(() => {
        return myChatUsers.filter(u => u.name?.toLowerCase().includes(searchMyChats.toLowerCase()));
    }, [myChatUsers, searchMyChats]);

    const filteredMonitorChats = useMemo(() => {
        return monitorChats?.filter(c =>
            c.user1_id != myself?.id &&
            c.user2_id != myself?.id &&
            (c.user1.name.toLowerCase().includes(searchMonitor.toLowerCase()) || c.user2.name.toLowerCase().includes(searchMonitor.toLowerCase()))
        );
    }, [monitorChats, searchMonitor, myself]);

    const myChatMessages = useMemo(() => {
        if (!selectedChatUser || !chats || !myself) return [];
        return chats.filter(c => c.type === "live_chat" &&
            ((c.sender_id == myself.id && c.receiver_id == selectedChatUser.id) ||
                (c.sender_id == selectedChatUser.id && c.receiver_id == myself.id))
        ).sort((a, b) => new Date(a.created_at || a.createdAt) - new Date(b.created_at || b.createdAt));
    }, [chats, selectedChatUser, myself]);

    const getUserName = (id) => users?.find(usr => usr.id == id)?.name || "Unknown";

    const loadMonitorHistory = async (chatPair) => {
        setSelectedMonitorChat(chatPair);
        try {
            const response = await getSystemMonitorHistory(chatPair.user1_id, chatPair.user2_id);
            setMonitorHistory(response.data.chats || []);
        } catch (error) {
            showToast("Failed to load chat history", "error");
        }
    };

    return (
        <div className="animate-fade-in" style={{ padding: "0 1rem" }}>
            <style>
                {`
                .comm-header {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                    margin-bottom: 1.5rem;
                }
                @media (min-width: 768px) {
                    .comm-header {
                        flex-direction: row;
                        justify-content: space-between;
                        align-items: center;
                    }
                }
                .tabs-container {
                    display: flex;
                    gap: 0.5rem;
                    background: var(--bg-secondary);
                    padding: 0.35rem;
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--glass-border);
                    overflow-x: auto;
                }
                .tab-btn {
                    padding: 0.5rem 1rem;
                    border-radius: var(--radius-md);
                    font-weight: 600;
                    font-size: 0.85rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    cursor: pointer;
                    transition: var(--transition);
                    border: none;
                    background: transparent;
                    color: var(--text-secondary);
                    white-space: nowrap;
                }
                .tab-btn:hover {
                    color: var(--text-primary);
                    background: rgba(0,0,0,0.03);
                }
                .tab-btn.active {
                    background: var(--accent-light);
                    color: var(--accent-primary);
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                }
                
                .split-panel {
                    display: flex;
                    flex-direction: column;
                    background: var(--glass-bg);
                    border: 1px solid var(--glass-border);
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    height: calc(100vh - 140px);
                    min-height: 500px;
                }
                @media (min-width: 768px) {
                    .split-panel { flex-direction: row; }
                }
                
                .sidebar-area {
                    width: 100%;
                    border-bottom: 1px solid var(--glass-border);
                    display: flex;
                    flex-direction: column;
                    background: #f8fafc;
                }
                @media (min-width: 768px) {
                    .sidebar-area { width: 320px; border-bottom: none; border-right: 1px solid var(--glass-border); }
                }
                
                .content-area {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    background: #ffffff;
                }
                
                .sidebar-item {
                    padding: 1rem;
                    border-bottom: 1px solid var(--glass-border);
                    cursor: pointer;
                    transition: var(--transition);
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                .sidebar-item:hover {
                    background: #ffffff;
                }
                .sidebar-item.active {
                    background: #ffffff;
                    border-left: 4px solid var(--accent-primary);
                }
                
                .chat-bubble {
                    max-width: 75%;
                    padding: 0.75rem 1rem;
                    border-radius: 1rem;
                    font-size: 0.9rem;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                    line-height: 1.4;
                }
                .chat-bubble.mine {
                    background: var(--accent-primary);
                    color: white;
                    border-bottom-right-radius: 0.25rem;
                }
                .chat-bubble.theirs {
                    background: #f1f5f9;
                    color: var(--text-primary);
                    border: 1px solid var(--glass-border);
                    border-bottom-left-radius: 0.25rem;
                }
                
                .modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(15, 23, 42, 0.4);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 50;
                    padding: 1rem;
                }
                .modal-card {
                    background: white;
                    border-radius: var(--radius-lg);
                    width: 100%;
                    max-width: 400px;
                    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
                    overflow: hidden;
                    animation: slideUp 0.3s ease-out;
                }
                
                .filter-panel {
                    background: var(--bg-secondary);
                    padding: 1rem;
                    border-radius: var(--radius-md);
                    border: 1px solid var(--glass-border);
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                    animation: fadeIn 0.2s ease-out;
                }
                @media (min-width: 640px) {
                    .filter-panel { flex-direction: row; align-items: center; justify-content: space-between; }
                }
                `}
            </style>

            {/* Header */}
            <div className="comm-header">
                {/* <div>
                    <h1 className="text-2xl font-bold text-gray-900">Communication Center</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage messages, announcements, and monitor system chats.</p>
                    <p className="text-xs mt-1" style={{color: socketStatus === 'Connected' ? 'green' : 'red'}}>
                        Socket: {socketStatus} ({socketUrl})
                    </p>
                </div> */}

                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    {/* Tabs */}
                    <div className="tabs-container">
                        <button onClick={() => setActiveTab('my_chats')} className={`tab-btn ${activeTab === 'my_chats' ? 'active' : ''}`}>
                            <MessageSquare size={16} /> My Chats
                        </button>
                        <button onClick={() => setActiveTab('system_monitor')} className={`tab-btn ${activeTab === 'system_monitor' ? 'active' : ''}`}>
                            <Activity size={16} /> System Monitor
                        </button>
                    </div>
                </div>
            </div>



            {/* MY CHATS */}
            {activeTab === "my_chats" && (
                <div className="split-panel">
                    <div className="sidebar-area">
                        <div style={{ padding: "1rem", borderBottom: "1px solid var(--glass-border)", background: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h2 style={{ fontWeight: "700", fontSize: "1.1rem" }}>Messages</h2>
                            <button className="btn btn-primary" onClick={() => setShowNewChat(true)} style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
                                + New Chat
                            </button>
                        </div>
                        <div style={{ padding: "0.75rem", borderBottom: "1px solid var(--glass-border)", background: "white" }}>
                            <div style={{ position: "relative" }}>
                                <Search size={14} color="var(--text-secondary)" style={{ position: "absolute", left: "10px", top: "10px" }} />
                                <input
                                    type="text"
                                    placeholder="Search chats..."
                                    value={searchMyChats}
                                    onChange={(e) => setSearchMyChats(e.target.value)}
                                    className="input-glass"
                                    style={{ paddingLeft: "2rem", padding: "0.5rem 0.5rem 0.5rem 2rem", fontSize: "0.85rem", height: "auto" }}
                                />
                            </div>
                        </div>
                        <div style={{ overflowY: "auto", flex: 1 }}>
                            {filteredMyChatUsers?.map((user) => (
                                <div key={user?.id} onClick={() => setSelectedChatUser(user)} className={`sidebar-item ${selectedChatUser?.id === user.id ? 'active' : ''}`}>
                                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--accent-light)", color: "var(--accent-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", flexShrink: 0 }}>
                                        {user?.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div style={{ overflow: "hidden", flex: 1 }}>
                                        <div style={{ fontWeight: "600", fontSize: "0.9rem", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.name}</div>
                                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.lastMessage}</div>
                                    </div>
                                    <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", alignSelf: "flex-start", marginTop: "0.2rem", whiteSpace: "nowrap" }}>
                                        {user?.lastMessageTime ? new Date(user.lastMessageTime).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                                    </div>
                                </div>
                            ))}
                            {filteredMyChatUsers?.length === 0 && <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>No active conversations.</div>}
                        </div>
                    </div>

                    <div className="content-area">
                        {selectedChatUser ? (
                            <>
                                <div style={{ padding: "1rem", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: "1rem", zIndex: 10, background: "white" }}>
                                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--accent-light)", color: "var(--accent-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                                        {selectedChatUser.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 style={{ fontWeight: "700", fontSize: "1rem" }}>{selectedChatUser.name}</h3>
                                        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "capitalize" }}>{selectedChatUser.type}</p>
                                    </div>
                                </div>

                                <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem", background: "#f8fafc" }}>
                                    {myChatMessages?.map((msg) => {
                                        const isMe = msg.sender_id == myself?.id;
                                        return (
                                            <div key={msg.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                                                <div className={`chat-bubble ${isMe ? 'mine' : 'theirs'}`}>
                                                    <div style={{ whiteSpace: "pre-wrap" }}>{msg.message || msg.title}</div>
                                                    <div style={{ fontSize: "0.7rem", marginTop: "0.25rem", textAlign: isMe ? "right" : "left", opacity: 0.8 }}>
                                                        {new Date(msg.created_at || msg.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {myChatMessages?.length === 0 && <div style={{ textAlign: "center", color: "var(--text-secondary)", marginTop: "2rem" }}>Say hello to {selectedChatUser.name}!</div>}
                                </div>

                                <div style={{ padding: "1rem", borderTop: "1px solid var(--glass-border)", background: "white" }}>
                                    <div style={{ display: "flex", gap: "0.5rem", background: "#f1f5f9", padding: "0.3rem", borderRadius: "var(--radius-md)" }}>
                                        <input
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                            className="input-glass"
                                            style={{ background: "transparent", border: "none", boxShadow: "none" }}
                                            placeholder="Type a message..."
                                        />
                                        <button onClick={handleSend} className="btn btn-primary" style={{ padding: "0.5rem 1rem" }}>
                                            <Send size={16} />
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
                                <MessageSquare size={48} style={{ opacity: 0.2, marginBottom: "1rem" }} />
                                <h3 style={{ fontSize: "1.2rem", fontWeight: "600", color: "var(--text-primary)" }}>Your Messages</h3>
                                <p style={{ fontSize: "0.85rem" }}>Select a chat to start messaging or start a new one.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* SYSTEM MONITOR */}
            {activeTab === "system_monitor" && (
                <div className="split-panel">
                    <div className="sidebar-area">
                        <div style={{ padding: "1rem", borderBottom: "1px solid var(--glass-border)", background: "white" }}>
                            <h2 style={{ fontWeight: "700", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <Activity size={18} color="#ef4444" /> All Conversations
                            </h2>
                        </div>
                        <div style={{ padding: "0.75rem", borderBottom: "1px solid var(--glass-border)", background: "white" }}>
                            <div style={{ position: "relative" }}>
                                <Search size={14} color="var(--text-secondary)" style={{ position: "absolute", left: "10px", top: "10px" }} />
                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    value={searchMonitor}
                                    onChange={(e) => setSearchMonitor(e.target.value)}
                                    className="input-glass"
                                    style={{ paddingLeft: "2rem", padding: "0.5rem 0.5rem 0.5rem 2rem", fontSize: "0.85rem", height: "auto" }}
                                />
                            </div>
                        </div>
                        <div style={{ overflowY: "auto", flex: 1 }}>
                            {filteredMonitorChats?.map((chat) => (
                                <div key={chat.id} onClick={() => loadMonitorHistory(chat)} className={`sidebar-item ${selectedMonitorChat?.id === chat.id ? 'active' : ''}`} style={{ borderLeftColor: "#ef4444", alignItems: "flex-start" }}>
                                    <div style={{ flex: 1, overflow: "hidden" }}>
                                        <div style={{ fontWeight: "600", fontSize: "0.9rem", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {chat.user1.name} <span style={{ fontWeight: "normal", fontSize: "0.75rem", color: "var(--text-secondary)" }}>({chat.user1.role})</span>
                                        </div>
                                        <div style={{ margin: "0.1rem 0", color: "var(--text-secondary)", fontSize: "0.8rem" }}>↔</div>
                                        <div style={{ fontWeight: "600", fontSize: "0.9rem", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {chat.user2.name} <span style={{ fontWeight: "normal", fontSize: "0.75rem", color: "var(--text-secondary)" }}>({chat.user2.role})</span>
                                        </div>
                                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.4rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {chat.lastMessage}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: "0.2rem", whiteSpace: "nowrap" }}>
                                        {chat.time ? new Date(chat.time).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                                    </div>
                                </div>
                            ))}
                            {filteredMonitorChats?.length === 0 && <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>No active system conversations.</div>}
                        </div>
                    </div>

                    <div className="content-area">
                        {selectedMonitorChat ? (
                            <>
                                <div style={{ padding: "1rem", borderBottom: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "white" }}>
                                    <div>
                                        <h3 style={{ fontWeight: "700", fontSize: "1rem" }}>Chat History</h3>
                                        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{selectedMonitorChat.user1.name} & {selectedMonitorChat.user2.name}</p>
                                    </div>
                                    <span style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "4px 8px", borderRadius: "4px", fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase" }}>
                                        Read Only
                                    </span>
                                </div>
                                <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem", background: "#f8fafc" }}>
                                    {monitorHistory?.map((msg) => {
                                        const isUser1 = msg.sender_id === selectedMonitorChat.user1_id;
                                        const senderName = isUser1 ? selectedMonitorChat.user1.name : selectedMonitorChat.user2.name;
                                        return (
                                            <div key={msg.id} style={{ display: "flex", justifyContent: isUser1 ? "flex-end" : "flex-start" }}>
                                                <div style={{ display: "flex", flexDirection: "column", alignItems: isUser1 ? "flex-end" : "flex-start", maxWidth: "75%" }}>
                                                    <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: "0.2rem" }}>{senderName}</span>
                                                    <div className={`chat-bubble ${isUser1 ? 'mine' : 'theirs'}`} style={isUser1 ? { background: "#ef4444" } : {}}>
                                                        <div style={{ whiteSpace: "pre-wrap" }}>{msg.message}</div>
                                                        <div style={{ fontSize: "0.7rem", marginTop: "0.25rem", textAlign: isUser1 ? "right" : "left", opacity: 0.8 }}>
                                                            {new Date(msg.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {monitorHistory?.length === 0 && <div style={{ textAlign: "center", color: "var(--text-secondary)", marginTop: "2rem" }}>Loading history...</div>}
                                </div>
                            </>
                        ) : (
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
                                <Activity size={48} style={{ opacity: 0.2, marginBottom: "1rem" }} />
                                <h3 style={{ fontSize: "1.2rem", fontWeight: "600", color: "var(--text-primary)" }}>System Monitor</h3>
                                <p style={{ fontSize: "0.85rem" }}>Select a conversation to view its history.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* New Chat Modal */}
            {showNewChat && (
                <div className="modal-overlay" onClick={() => setShowNewChat(false)}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                        <div style={{ padding: "1.25rem", borderBottom: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
                            <h2 style={{ fontWeight: "700", fontSize: "1.1rem" }}>Start New Chat</h2>
                            <button onClick={() => setShowNewChat(false)} className="btn btn-ghost" style={{ padding: "0.25rem" }}>✕</button>
                        </div>
                        <div style={{ padding: "1.25rem", borderBottom: "1px solid var(--glass-border)" }}>
                            <div style={{ position: "relative" }}>
                                <Search size={16} color="var(--text-secondary)" style={{ position: "absolute", left: "12px", top: "12px" }} />
                                <input
                                    type="text"
                                    placeholder="Search users by name..."
                                    onChange={(e) => setSearchInboxQuery(e.target.value)}
                                    className="input-glass"
                                    style={{ paddingLeft: "2.5rem" }}
                                />
                            </div>
                        </div>
                        <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                            {filteredUsers?.length > 0 ? (
                                filteredUsers.map((user) => (
                                    <div key={user.id} onClick={() => { setSelectedChatUser(user); setSearchInboxQuery(""); setShowNewChat(false); }}
                                        style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 1.25rem", cursor: "pointer", borderBottom: "1px solid #f1f5f9", transition: "var(--transition)" }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"}
                                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                    >
                                        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--accent-light)", color: "var(--accent-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.85rem" }}>
                                            {user.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p style={{ fontWeight: "600", fontSize: "0.9rem", color: "var(--text-primary)" }}>{user.name}</p>
                                            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{user.email} • <span style={{ textTransform: "capitalize" }}>{user.type}</span></p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>No users found</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Communication;
