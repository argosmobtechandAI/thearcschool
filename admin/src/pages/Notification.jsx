import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUsers } from "../features/dataSlice";
import api from "../services/api";
import { toast } from "react-toastify";
import { Bell, BellOff, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DateRangePicker from "../components/DateRangePicker";

export default function Notifications() {
  const { users, loading } = useSelector((state) => state.data);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  useEffect(() => {
    if (!users || users.length === 0) {
      dispatch(fetchUsers());
    }
  }, [users, dispatch]);

  const myself = useMemo(() => {
    if (!users) return null;
    return users.find((u) => u.type.toLowerCase() === "admin");
  }, [users]);

  const notifications = useMemo(() => {
    if (!myself) return [];
    return Array.isArray(myself.notification) ? myself.notification : [];
  }, [myself]);

  const updateNotification = async () => {
    if (!myself?.id) return;
    try {
      await api.updateNotification(myself.id);
      dispatch(fetchUsers());
    } catch (error) {
      toast.error("Could not update notification status");
    }
  };

  useEffect(() => {
    if (notifications.some((n) => !n.read)) {
      updateNotification();
    }
  }, [notifications]);

  const sortedNotifications = useMemo(() => {
    let filtered = notifications;
    if (dateRange.start || dateRange.end) {
      filtered = filtered.filter(n => {
        const nDate = new Date(n.date);
        if (dateRange.start && dateRange.end) {
          return nDate >= new Date(dateRange.start) && nDate <= new Date(dateRange.end);
        } else if (dateRange.start) {
          return nDate >= new Date(dateRange.start);
        } else if (dateRange.end) {
          return nDate <= new Date(dateRange.end);
        }
        return true;
      });
    }
    return [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [notifications, dateRange]);

  if (loading && !users.length) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)] bg-slate-50/50 flex flex-col rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
      
      {/* Header */}
      <div className="flex items-center px-6 py-5 bg-white border-b border-slate-200">
        <button onClick={() => navigate(-1)} className="mr-4 p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-800">
          <ArrowLeft size={20} />
        </button>
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
            <p className="text-sm text-slate-500">Stay updated on the latest school activities</p>
        </div>
        <div className="ml-auto flex items-center">
            <DateRangePicker onRangeChange={setDateRange} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
        <div className="max-w-3xl mx-auto space-y-4">
            {sortedNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-300">
                <BellOff size={48} className="mb-4 text-slate-300" />
                <p className="text-lg font-medium">No notifications yet</p>
                <p className="text-sm">You're all caught up!</p>
            </div>
            ) : (
            sortedNotifications.map((item, index) => {
                const isUnread = !item.read;

                return (
                <div
                    key={index}
                    className={`flex items-start p-5 rounded-2xl transition-all shadow-sm ${
                    isUnread
                        ? "bg-white border border-blue-200 shadow-blue-900/5 ring-1 ring-blue-50/50"
                        : "bg-white/80 border border-slate-200 opacity-80"
                    }`}
                >
                    <div className={`mr-4 p-3 rounded-full ${isUnread ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                        {isUnread ? <Bell size={20} className="animate-pulse" /> : <BellOff size={20} />}
                    </div>

                    <div className="flex-1">
                    <p className={`text-base ${isUnread ? "font-bold text-slate-900" : "font-medium text-slate-600"}`}>
                        {item.title}
                    </p>

                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                        {item.message}
                    </p>

                    <p className="text-xs font-medium text-slate-400 mt-3 flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${isUnread ? 'bg-blue-500' : 'bg-slate-300'}`}></span>
                        {new Date(item.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                    </div>
                </div>
                );
            })
            )}
        </div>
      </div>
    </div>
  );
}
