import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import api from '../../api';
import socket from '../../api/socket';
import { useSelector } from 'react-redux';
import { useGetChatsQuery } from '../../store/apiSlice';
import { colors } from '../../theme/colors';

const ChatListScreen = ({ navigation }) => {
  const { user } = useSelector((state) => state.auth);
  
  const { data: chatData, isLoading: loading } = useGetChatsQuery(undefined, { 
    skip: !user 
  });
  const chats = chatData?.chats || [];

  useEffect(() => {
    // Socket connection disabled for now
    // if (!socket.connected && user) {
    //   socket.auth = { userId: user.id }; 
    //   socket.connect();
    // }

    return () => {
    };
  }, [user]);

  const handleOpenChat = (chat) => {
    navigation.navigate('ChatRoomScreen', { chatId: chat.id, chatName: chat.name });
  };

  const renderIcon = (role) => {
    switch(role) {
      case 'admin': return <Icon name="shield" size={20} color={colors.primary} />;
      case 'parent': return <Icon name="user" size={20} color={colors.warning} />;
      case 'group': return <Icon name="users" size={20} color={colors.success} />;
      default: return <Icon name="message-circle" size={20} color={colors.textMuted} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>Connect with Parents & Admin</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator color={colors.purple} style={{ marginTop: 20 }} />
        ) : chats.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="message-square" size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>No messages yet.</Text>
          </View>
        ) : (
          chats.map((chat) => (
            <TouchableOpacity key={chat.id} style={styles.chatCard} onPress={() => handleOpenChat(chat)}>
              <View style={styles.avatar}>
                {renderIcon(chat.role)}
              </View>
              <View style={styles.chatInfo}>
                <View style={styles.chatHeader}>
                  <Text style={styles.chatName} numberOfLines={1}>{chat.name}</Text>
                  <Text style={styles.chatTime}>{chat.time}</Text>
                </View>
                <View style={styles.chatFooter}>
                  <Text style={[styles.lastMessage, chat.unread > 0 && styles.lastMessageUnread]} numberOfLines={1}>
                    {chat.lastMessage}
                  </Text>
                  {chat.unread > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{chat.unread}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
      
      <TouchableOpacity style={styles.fab}>
        <Icon name="edit-2" size={24} color={colors.background} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: 24, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.textMuted },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 80 },
  emptyState: { alignItems: 'center', padding: 32 },
  emptyText: { color: colors.textMuted, marginTop: 12 },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 16,
  },
  chatInfo: { flex: 1 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  chatName: { fontSize: 16, fontWeight: 'bold', color: colors.text, flex: 1, marginRight: 8 },
  chatTime: { fontSize: 12, color: colors.textMuted },
  chatFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMessage: { fontSize: 14, color: colors.textMuted, flex: 1, marginRight: 8 },
  lastMessageUnread: { color: colors.text, fontWeight: '600' },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: { color: colors.background, fontSize: 12, fontWeight: 'bold' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});

export default ChatListScreen;
