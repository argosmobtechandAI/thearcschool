import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import CustomHeader from '../../components/CustomHeader';
import { useGetNotificationsQuery, useMarkNotificationReadMutation } from '../../store/apiSlice';
import { theme } from '../../theme/theme';

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

        let actualScreen = routeScreen;

        if (item.type === 'live_chat' || routeScreen === 'LiveChatScreen' || routeScreen === 'ChatRoomScreen') {
          if (parsedParams?.teacherId || parsedParams?.chatId) {
            actualScreen = 'LiveChatScreen'; // Navigate directly to the chat
          } else {
            actualScreen = 'Communication'; // Fallback to list for older notifications
          }
        } else if (routeScreen === 'AttendanceHome' || routeScreen === 'Attendance') {
          actualScreen = 'Attendance';
        } else if (routeScreen === 'ExamsList' || routeScreen === 'Result' || routeScreen === 'StudentAcademicHistory' || routeScreen === 'StudentAcademicHistoryScreen') {
          actualScreen = 'Result';
        } else if (routeScreen === 'DateSheet' || routeScreen === 'DateSheetScreen') {
          actualScreen = 'DateSheet';
        } else if (routeScreen === 'AcademicCalendar') {
          actualScreen = 'AcademicCalendar';
        } else if (routeScreen === 'Fees') {
          actualScreen = 'Fees';
        } else if (routeScreen === 'Notifications') {
          actualScreen = 'Notifications';
        } else if (routeScreen === 'Class') {
          actualScreen = 'Class';
        } else if (routeScreen === 'Home' || routeScreen === 'Dashboard') {
          actualScreen = 'Home';
        } else if (routeScreen === 'LiveChatScreen' || routeScreen === 'ChatRoomScreen') {
          actualScreen = 'LiveChatScreen';
        }

        navigation.navigate(actualScreen, parsedParams);
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
      const today = new Date();
      const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
      
      if (isToday) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch(e) {
      return '';
    }
  };

  const getCategory = (item) => {
    const type = item.type || '';
    const title = (item.title || '').toLowerCase();
    
    if (type === 'live_chat' || title.includes('message') || title.includes('chat')) {
      return { label: 'Messages', color: theme.colors.primary, icon: 'message-circle' };
    }
    if (type === 'system_monitor' || title.includes('system') || title.includes('alert')) {
      return { label: 'Alerts', color: theme.colors.danger, icon: 'alert-triangle' };
    }
    if (title.includes('exam') || title.includes('result') || title.includes('grade') || title.includes('academic') || title.includes('date sheet')) {
      return { label: 'Academics', color: '#EAB308', icon: 'book-open' };
    }
    if (title.includes('attend') || title.includes('leave')) {
      return { label: 'Attendance', color: theme.colors.success, icon: 'calendar' };
    }
    if (title.includes('fee') || title.includes('payment')) {
      return { label: 'Finance', color: '#EF4444', icon: 'credit-card' };
    }
    return { label: 'General', color: '#06B6D4', icon: 'bell' };
  };

  const renderItem = ({ item }) => {
    const category = getCategory(item);
    const isUnread = !item.is_read;
    
    return (
      <TouchableOpacity 
        style={[
          styles.notificationCard, 
          isUnread && styles.unreadCard
        ]}
        onPress={() => handlePress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconContainer, { backgroundColor: category.color + (isUnread ? '25' : '15') }]}>
              <Icon name={category.icon} size={18} color={category.color} />
            </View>
            <Text style={styles.categoryText}>{category.label}</Text>
          </View>
          <View style={styles.headerRight}>
            <Icon name="clock" size={12} color={theme.colors.textMuted} style={{ marginRight: 4 }} />
            <Text style={styles.timeText}>{formatTime(item.created_at)}</Text>
          </View>
        </View>

        <View style={styles.contentContainer}>
          <Text style={[styles.title, isUnread && styles.unreadTitle]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.body, isUnread && styles.unreadBody]} numberOfLines={2}>
            {getCleanMessage(item.message || item.body)}
          </Text>
        </View>

        {isUnread && <View style={styles.unreadIndicator} />}
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
              <Icon name="check-square" size={24} color="#fff" />
            </TouchableOpacity>
          ) : <View style={{ width: 40 }} />
        }
      />
      
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id?.toString() || Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContainer, notifications.length === 0 && { flex: 1 }]}
          refreshControl={<RefreshControl refreshing={isFetching || false} onRefresh={refetch} colors={[theme.colors.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Icon name="bell-off" size={48} color={theme.colors.primary + '80'} />
              </View>
              <Text style={styles.emptyTitle}>All Caught Up!</Text>
              <Text style={styles.emptyText}>You have no new notifications right now.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  listContainer: { padding: theme.spacing.md, paddingBottom: 40, gap: 12 },
  
  notificationCard: {
    backgroundColor: '#fff',
    borderRadius: theme.layout.borderRadius.xl,
    padding: 16,
    ...theme.shadows.card,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
    position: 'relative'
  },
  unreadCard: {
    // Removed transparent background and border because it causes 
    // a shadow rendering glitch on Android with elevation
  },
  
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 11,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.textMuted,
  },
  
  contentContainer: {
    paddingLeft: 42, // Aligns with the text next to the icon
  },
  title: {
    fontSize: 15,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  unreadTitle: {
    color: '#0f172a',
  },
  body: {
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  unreadBody: {
    color: '#334155',
  },
  
  unreadIndicator: {
    position: 'absolute',
    top: 22,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
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
    paddingHorizontal: 32,
  },
  emptyIconBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: theme.typography.fontFamily.heading,
    color: '#0f172a',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default NotificationsScreen;
