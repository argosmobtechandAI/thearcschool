import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import CustomHeader from '../../components/CustomHeader';
import { useGetNotificationsQuery, useMarkNotificationReadMutation } from '../../store/apiSlice';
import { colors, shadows } from '../../theme/colors';

const NotificationsScreen = ({ navigation }) => {
  const { data, isLoading, refetch, isFetching } = useGetNotificationsQuery(undefined, {
    pollingInterval: 30000,
    refetchOnMountOrArgChange: true,
  });
  const [markAsRead] = useMarkNotificationReadMutation();

  React.useEffect(() => {
    const { DeviceEventEmitter } = require('react-native');
    const sub = DeviceEventEmitter.addListener('onNotificationReceived', () => {
      refetch();
    });
    return () => sub.remove();
  }, [refetch]);

  const notifications = data?.data || [];
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      await Promise.all(unreadIds.map(id => markAsRead(id).unwrap()));
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  const handlePress = async (item) => {
    if (!item.is_read) {
      try {
        await markAsRead(item.id).unwrap();
      } catch (err) {
        console.error("Failed to mark as read", err);
      }
    }
    
    // Attempt to navigate if route data exists
    let routeScreen = item.data?.routeScreen;
    let routeParams = item.data?.routeParams;

    // Check if route data is encoded in the message body
    const rawMessage = item.message || item.body || "";
    if (!routeScreen && rawMessage.includes('|||')) {
      try {
        const parts = rawMessage.split('|||');
        const encodedData = JSON.parse(parts[parts.length - 1]);
        if (encodedData.routeScreen) {
          routeScreen = encodedData.routeScreen;
          routeParams = encodedData.routeParams;
        }
      } catch (e) {
        console.warn("Could not parse route data from message");
      }
    }

    if (routeScreen || item.type === 'live_chat') {
      try {
        const parsedParams = routeParams 
          ? (typeof routeParams === 'string' ? JSON.parse(routeParams) : routeParams)
          : {};

        // Map abstract route names to actual stack navigation structure
        let targetStack = null;
        let actualScreen = routeScreen;

        if (item.type === 'live_chat' || routeScreen === 'ChatRoomScreen' || routeScreen === 'LiveChatScreen') {
          targetStack = 'Connect';
          if (parsedParams?.chatId || parsedParams?.teacherId) {
            actualScreen = 'ChatRoomScreen'; // Navigate directly to the specific chat room
          } else {
            actualScreen = 'ChatList'; // Fallback to list for older notifications
          }
        } else if (routeScreen === 'AttendanceHome') {
          targetStack = 'Attend';
        } else if (routeScreen === 'ExamsList') {
          targetStack = 'Work';
        } else if (routeScreen === 'DateSheet') {
          targetStack = 'Work';
          actualScreen = 'DateSheetScreen';
        } else if (routeScreen === 'StudentAcademicHistory') {
          targetStack = 'Work';
          actualScreen = 'StudentAcademicHistoryScreen';
        }

        if (targetStack) {
          navigation.navigate(targetStack, { screen: actualScreen, params: parsedParams });
        } else {
          navigation.navigate(actualScreen, parsedParams);
        }
      } catch (err) {
        console.error("Failed to parse navigation params", err);
      }
    }
  };

  const getCleanMessage = (msg) => {
    if (!msg) return "";
    return msg.split('|||')[0];
  };

  const formatTime = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    } catch(e) {
      return '';
    }
  };

  const getCategory = (item) => {
    const type = item.type || '';
    const title = (item.title || '').toLowerCase();
    
    if (type === 'live_chat' || title.includes('message') || title.includes('chat')) {
      return { label: 'Messages', color: colors.primary, icon: 'message-circle' };
    }
    if (type === 'system_monitor' || title.includes('system') || title.includes('alert')) {
      return { label: 'Alerts', color: colors.danger, icon: 'alert-triangle' };
    }
    if (title.includes('exam') || title.includes('result') || title.includes('grade') || title.includes('academic') || title.includes('date sheet')) {
      return { label: 'Academics', color: colors.warning || '#ffc107', icon: 'book-open' };
    }
    if (title.includes('attend') || title.includes('leave')) {
      return { label: 'Attendance', color: colors.success, icon: 'calendar' };
    }
    if (title.includes('payroll') || title.includes('salary')) {
      return { label: 'Payroll', color: colors.secondary || '#6c757d', icon: 'dollar-sign' };
    }
    return { label: 'General', color: '#17a2b8', icon: 'bell' };
  };

  const renderItem = ({ item }) => {
    const category = getCategory(item);
    
    return (
      <TouchableOpacity 
        style={[styles.notificationCard, !item.is_read && styles.unreadCard]}
        onPress={() => handlePress(item)}
        activeOpacity={0.8}
      >
        <View style={[styles.iconContainer, { backgroundColor: category.color + '15' }]}>
          <Icon name={category.icon} size={20} color={category.color} />
        </View>
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, !item.is_read && styles.unreadText]} numberOfLines={1}>{item.title}</Text>
            <View style={[styles.categoryBadge, { backgroundColor: category.color + '15' }]}>
              <Text style={[styles.categoryText, { color: category.color }]}>{category.label}</Text>
            </View>
          </View>
          <Text style={styles.body} numberOfLines={2}>{getCleanMessage(item.message || item.body)}</Text>
          <Text style={styles.time}>{formatTime(item.created_at)}</Text>
        </View>
        {!item.is_read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <CustomHeader 
        title="Notifications" 
        showBack 
        rightComponent={
          unreadCount > 0 ? (
            <TouchableOpacity onPress={handleMarkAllRead} style={{ padding: 8 }}>
              <Icon name="check-square" size={24} color={colors.surface} />
            </TouchableOpacity>
          ) : <View style={{ width: 40 }} />
        }
      />
      
      {isLoading ? (
        <View style={styles.center}>
          <Icon name="loader" size={32} color={colors.textMuted} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id?.toString() || Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContainer, notifications.length === 0 && { flex: 1 }]}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} colors={[colors.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="bell-off" size={64} color={colors.border} />
              <Text style={styles.emptyTitle}>No Notifications</Text>
              <Text style={styles.emptyText}>You're all caught up! 🎉</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContainer: { padding: 16, paddingBottom: 40 },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: 'center',
    ...shadows.card,
  },
  unreadCard: {
    backgroundColor: colors.surface,
    borderColor: colors.primaryLight,
    borderLeftWidth: 4,
  },
  iconContainer: {
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: '800',
    color: colors.text,
  },
  body: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 8,
    lineHeight: 20,
  },
  time: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginLeft: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textMuted,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});

export default NotificationsScreen;
