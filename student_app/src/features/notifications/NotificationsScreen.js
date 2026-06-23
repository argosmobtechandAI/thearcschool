import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useGetNotificationsQuery, useMarkNotificationReadMutation } from '../../store/apiSlice';
import { colors, shadows } from '../../theme/colors';

const NotificationsScreen = ({ navigation }) => {
  const { data, isLoading, refetch } = useGetNotificationsQuery();
  const [markRead] = useMarkNotificationReadMutation();
  const [refreshing, setRefreshing] = useState(false);

  const notifications = data?.data || [];

  const handleMarkRead = async (id) => {
    try { await markRead(id); } catch (_) {}
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <Icon name="loader" size={32} color={colors.textMuted} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="bell-off" size={56} color={colors.border} />
          <Text style={styles.emptyTitle}>No Notifications</Text>
          <Text style={styles.emptyText}>You're all caught up! 🎉</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.list} 
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        >
          {notifications.map((notif, i) => (
            <TouchableOpacity
              key={notif.id || i}
              style={[styles.notifCard, !notif.is_read && styles.notifCardUnread]}
              onPress={() => handleMarkRead(notif.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.notifIconWrap, { backgroundColor: colors.primary + '20' }]}>
                <Icon name="bell" size={18} color={colors.primary} />
              </View>
              <View style={styles.notifContent}>
                <Text style={styles.notifTitle}>{notif.title || 'Notification'}</Text>
                <Text style={styles.notifBody} numberOfLines={2}>{notif.body || notif.message || ''}</Text>
                <Text style={styles.notifTime}>{new Date(notif.created_at || Date.now()).toLocaleDateString()}</Text>
              </View>
              {!notif.is_read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          ))}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.primary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: colors.primary,
  },
  backBtn: { padding: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  empty: {
    flex: 1, backgroundColor: colors.background,
    justifyContent: 'center', alignItems: 'center', gap: 12,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 14, color: colors.textMuted },
  list: { flex: 1, backgroundColor: colors.background, paddingTop: 12 },
  notifCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: colors.surface, marginHorizontal: 16, marginBottom: 10,
    borderRadius: 16, padding: 14, ...shadows.card,
  },
  notifCardUnread: { borderLeftWidth: 3, borderLeftColor: colors.primary },
  notifIconWrap: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  notifBody: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  notifTime: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
});

export default NotificationsScreen;
