import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { colors, shadows } from '../../theme/colors';
import { useGetChatsQuery, useCreateChatMutation } from '../../store/apiSlice';
import { useSelector } from 'react-redux';
import { useDrawer } from '../../navigation/DrawerContext';

const CommunicationScreen = ({ navigation }) => {
  const { openDrawer } = useDrawer();
  const [message, setMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef();
  
  const user = useSelector(state => state.auth.user);
  
  // 'teacher' is the type, could also be 'school'
  const { data, isLoading, refetch } = useGetChatsQuery('teacher', { pollingInterval: 5000 });
  const [createChat, { isLoading: isSending }] = useCreateChatMutation();

  const chats = data?.chats || [];

  // Sort chats by created_at chronologically
  const sortedChats = [...chats].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleSend = async () => {
    if (!message.trim()) return;
    
    try {
      await createChat({
        type: 'teacher',
        firstPerson: user?.id,
        secondPerson: ['admin'], // or specific teacher ID
        message: message.trim(),
        senderName: user?.name || 'Student',
      }).unwrap();
      
      setMessage('');
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      refetch();
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const renderMessage = ({ item }) => {
    // Determine if the message was sent by the current student
    const isMe = item.firstPerson === user?.id;

    return (
      <View style={[styles.msgContainer, isMe ? styles.msgMe : styles.msgThem]}>
        {!isMe && (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.senderName ? item.senderName.substring(0, 1) : 'T'}</Text>
          </View>
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          {!isMe && <Text style={styles.senderName}>{item.senderName || 'Teacher'}</Text>}
          <Text style={[styles.msgText, isMe ? styles.msgTextMe : styles.msgTextThem]}>
            {item.message}
          </Text>
          <Text style={[styles.timestamp, isMe ? styles.timestampMe : styles.timestampThem]}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openDrawer} style={styles.headerBtn}>
          <Icon name="menu" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Teacher Chat</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={refetch}>
          <Icon name="refresh-cw" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={sortedChats}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Icon name="message-circle" size={48} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No Messages</Text>
                <Text style={styles.emptyText}>Send a message to your teachers to start the conversation.</Text>
              </View>
            }
          />
        )}

        {/* Input Area */}
        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder="Type a message..."
            placeholderTextColor={colors.textMuted}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendBtn, !message.trim() && styles.sendBtnDisabled]} 
            onPress={handleSend}
            disabled={!message.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.primary },
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerBtn: { padding: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10 },

  listContent: { padding: 16, paddingBottom: 32 },

  msgContainer: { flexDirection: 'row', marginBottom: 16, maxWidth: '85%' },
  msgMe: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
  msgThem: { alignSelf: 'flex-start', justifyContent: 'flex-start' },

  avatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 8, alignSelf: 'flex-end',
  },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  bubble: {
    padding: 12, borderRadius: 16,
    ...shadows.card,
  },
  bubbleMe: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: colors.surface, borderBottomLeftRadius: 4 },

  senderName: { fontSize: 12, color: colors.primary, fontWeight: '700', marginBottom: 4 },
  
  msgText: { fontSize: 15, lineHeight: 22 },
  msgTextMe: { color: '#fff' },
  msgTextThem: { color: colors.text },

  timestamp: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  timestampMe: { color: 'rgba(255,255,255,0.7)' },
  timestampThem: { color: colors.textMuted },

  emptyState: { alignItems: 'center', marginTop: 100, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 40 },

  inputArea: {
    flexDirection: 'row', alignItems: 'flex-end',
    padding: 12, paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 12,
    paddingTop: 12, // For multiline centering
    fontSize: 15, color: colors.text,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 12,
  },
  sendBtnDisabled: { opacity: 0.5 },
});

export default CommunicationScreen;
