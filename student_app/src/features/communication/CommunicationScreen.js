import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { colors, shadows } from '../../theme/colors';
import { useGetTeachersQuery, useGetPrincipalQuery, useGetLiveChatsListQuery } from '../../store/apiSlice';
import { useDrawer } from '../../navigation/DrawerContext';

const formatTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const CommunicationScreen = ({ navigation }) => {
  const { openDrawer } = useDrawer();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('history');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: teachersData, isLoading: teachersLoading, refetch: refetchTeachers, isFetching: teachersFetching } = useGetTeachersQuery(undefined, { pollingInterval: 60000 });
  const { data: principalData, isLoading: principalLoading, refetch: refetchPrincipal, isFetching: principalFetching } = useGetPrincipalQuery();
  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory, isFetching: historyFetching } = useGetLiveChatsListQuery(undefined, { pollingInterval: 10000 });

  const teachers = teachersData?.teachers || [];
  const principal = principalData?.principal;
  const historyList = historyData?.chats || [];

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenChat = (user) => {
    navigation.navigate('LiveChatScreen', { 
      teacherId: user.id, 
      teacherName: user.name, 
      teacherAvatar: user.avatar 
    });
  };

  const renderUserCard = ({ item }) => (
    <TouchableOpacity style={styles.userCard} onPress={() => handleOpenChat(item)}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name ? item.name.substring(0, 1) : 'U'}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email || item.type}</Text>
      </View>
      <Icon name="message-circle" size={20} color={colors.primary} />
    </TouchableOpacity>
  );

  const renderHistoryCard = ({ item }) => (
    <TouchableOpacity style={styles.userCard} onPress={() => handleOpenChat(item)}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name ? item.name.substring(0, 1).toUpperCase() : 'U'}</Text>
      </View>
      <View style={styles.userInfo}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={styles.userName}>{item.name || 'Unknown'}</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>{formatTime(item.time)}</Text>
        </View>
        <Text style={{ fontSize: 14, color: colors.textMuted }} numberOfLines={1}>{item.lastMessage}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Top Safe Area */}
      <View style={{ height: insets.top, backgroundColor: colors.primary }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openDrawer} style={styles.headerBtn}>
          <Icon name="menu" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Connect</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={() => {
          if (activeTab === 'history') refetchHistory();
          else if (activeTab === 'teachers') refetchTeachers();
          else refetchPrincipal();
        }}>
          <Icon name="refresh-cw" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Segmented Control / Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'teachers' && styles.tabBtnActive]}
          onPress={() => setActiveTab('teachers')}
        >
          <Text style={[styles.tabText, activeTab === 'teachers' && styles.tabTextActive]}>Teachers</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'principal' && styles.tabBtnActive]}
          onPress={() => {
            if (principal) {
              handleOpenChat(principal);
            } else {
              setActiveTab('principal');
            }
          }}
        >
          <Text style={[styles.tabText, activeTab === 'principal' && styles.tabTextActive]}>Principal</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {activeTab === 'history' ? (
          historyLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={historyList}
              keyExtractor={item => item.id}
              renderItem={renderHistoryCard}
              contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 16) }]}
              refreshControl={<RefreshControl refreshing={historyFetching} onRefresh={refetchHistory} colors={[colors.primary]} />}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Icon name="message-square" size={48} color={colors.textMuted} />
                  <Text style={styles.emptyTitle}>No Chats Yet</Text>
                  <Text style={styles.emptyText}>Find a teacher or the principal in the directories to start a chat.</Text>
                </View>
              }
            />
          )
        ) : activeTab === 'teachers' ? (
          <>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Icon name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search teachers..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Icon name="x" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Teachers List */}
            {teachersLoading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <FlatList
                data={filteredTeachers}
                keyExtractor={item => item.id}
                renderItem={renderUserCard}
                contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 16) }]}
                refreshControl={<RefreshControl refreshing={teachersFetching} onRefresh={refetchTeachers} colors={[colors.primary]} />}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Icon name="users" size={48} color={colors.textMuted} />
                    <Text style={styles.emptyTitle}>No Teachers Found</Text>
                    <Text style={styles.emptyText}>
                      {searchQuery ? "No teachers match your search." : "You currently have no teachers available to chat."}
                    </Text>
                  </View>
                }
              />
            )}
          </>
        ) : (
          /* Principal Tab */
          <View style={{ flex: 1 }}>
            {principalLoading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : principal ? (
              <ScrollView contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 16) }]} refreshControl={<RefreshControl refreshing={principalFetching} onRefresh={refetchPrincipal} colors={[colors.primary]} />}>
                {renderUserCard({ item: principal })}
              </ScrollView>
            ) : (
              <View style={styles.emptyState}>
                <Icon name="user" size={48} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No Principal Found</Text>
                <Text style={styles.emptyText}>The principal's profile is not available at this moment.</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerBtn: { padding: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10 },
  
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tabText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },

  listContent: { padding: 16 },
  userCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16, borderRadius: 12, marginBottom: 12,
    ...shadows.card,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 16,
  },
  avatarText: { color: colors.primary, fontSize: 18, fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  userEmail: { fontSize: 14, color: colors.textMuted },
  emptyState: { alignItems: 'center', marginTop: 100, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 40 },
});

export default CommunicationScreen;
