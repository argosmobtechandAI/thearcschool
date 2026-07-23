import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useSelector } from 'react-redux';
import { socket } from '../../services/socket';
import { useGetLiveChatHistoryQuery } from '../../store/apiSlice';
import { colors } from '../../theme/colors';

const LiveChatScreen = ({ route, navigation }) => {
  const { teacherId, teacherName } = route.params;
  const user = useSelector(state => state.auth.user);
  const insets = useSafeAreaInsets();
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef();
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Fetch initial history
  const { data: historyData, isLoading, refetch } = useGetLiveChatHistoryQuery(teacherId, { refetchOnMountOrArgChange: true });
  const historyChats = historyData?.chats || [];

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Initialize socket listeners
  useEffect(() => {
    if (!socket.connected) {
       socket.connect();
    }
    
    socket.emit('identify', user.id);
    socket.emit('join_chat', { senderId: user.id, receiverId: teacherId });

    const onConnect = () => {
      socket.emit('identify', user.id);
      socket.emit('join_chat', { senderId: user.id, receiverId: teacherId });
    };

    const onReceiveMessage = (newChat) => {
      console.log('Received message via socket:', newChat);
      setMessages((prev) => [...prev, newChat]);
      setIsTyping(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    };

    const onTypingStart = ({ senderId }) => {
      if (senderId === teacherId || senderId !== user.id) setIsTyping(true);
    };

    const onTypingStop = ({ senderId }) => {
      if (senderId === teacherId || senderId !== user.id) setIsTyping(false);
    };

    socket.on('connect', onConnect);
    socket.on('receive_message', onReceiveMessage);
    socket.on('typing_start', onTypingStart);
    socket.on('typing_stop', onTypingStop);

    return () => {
      socket.off('connect', onConnect);
      socket.off('receive_message', onReceiveMessage);
      socket.off('typing_start', onTypingStart);
      socket.off('typing_stop', onTypingStop);
    };
  }, [teacherId, user?.id]);

  // Combine history with live messages
  const allMessages = [...historyChats];
  const historyIds = new Set(historyChats.map(c => c.id));
  const uniqueLive = messages.filter(m => !historyIds.has(m.id));
  
  const displayMessages = [...allMessages, ...uniqueLive].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );

  const handleSend = () => {
    if (!inputText.trim()) return;

    const payload = {
      sender_id: user.id,
      receiver_id: teacherId,
      message: inputText.trim(),
      type: 'live_chat'
    };

    socket.emit('send_message', payload);
    socket.emit('typing_stop', { senderId: user.id, receiverId: teacherId });
    setInputText('');
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleTextChange = (text) => {
    setInputText(text);
    if (socket.connected) {
      socket.emit('typing_start', { senderId: user.id, receiverId: teacherId });
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing_stop', { senderId: user.id, receiverId: teacherId });
      }, 2000);
    }
  };

  const renderMessage = ({ item }) => {
    const isMe = item.sender_id === user.id;

    return (
      <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleOther]}>
        <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextOther]}>
          {item.message}
        </Text>
        <Text style={[styles.messageTime, isMe ? styles.messageTimeMe : styles.messageTimeOther]}>
          {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Main', { screen: 'Communication' })}>
          <Icon name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>{teacherName}</Text>
          <Text style={styles.statusText}>{isTyping ? 'Typing...' : 'Online'}</Text>
        </View>
        <View style={{ width: 34 }} />
      </View>

      {/* Messages */}
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
      >
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={displayMessages}
            keyExtractor={(item, index) => item.id || `live-${index}`}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', marginTop: 100 }}>
                <Icon name="message-square" size={48} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, marginTop: 12 }}>No messages yet.</Text>
              </View>
            }
          />
        )}

        {/* Input Area */}
        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={handleTextChange}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]} 
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Icon name="send" size={20} color={colors.background} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.primary },
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerBtn: { padding: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, marginRight: 16 },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  statusText: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  keyboardAvoid: { flex: 1 },
  messagesList: { padding: 16, paddingBottom: 32 },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  messageBubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  messageText: { fontSize: 16 },
  messageTextMe: { color: colors.background },
  messageTextOther: { color: colors.text },
  messageTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  messageTimeMe: { color: colors.background + 'CC' },
  messageTimeOther: { color: colors.textMuted },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    maxHeight: 100,
    fontSize: 16,
    color: colors.text,
  },
  sendButton: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    marginBottom: 2,
  },
  sendButtonDisabled: { opacity: 0.5 },
});

export default LiveChatScreen;
