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

    if (routeScreen) {
      try {
        const parsedParams = routeParams 
          ? (typeof routeParams === 'string' ? JSON.parse(routeParams) : routeParams)
          : {};

        // Map abstract route names to actual stack navigation structure
        let actualScreen = routeScreen;

        if (routeScreen === 'AttendanceHome' || routeScreen === 'Attendance') {
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
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    } catch(e) {
      return '';
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.notificationCard, !item.is_read && styles.unreadCard]}
      onPress={() => handlePress(item)}
      activeOpacity={0.8}
    >
      <View style={[styles.iconContainer, { backgroundColor: !item.is_read ? colors.primary + '20' : colors.textMuted + '15' }]}>
        <Icon name="bell" size={20} color={!item.is_read ? colors.primary : colors.textMuted} />
      </View>
      <View style={styles.contentContainer}>
        <Text style={[styles.title, !item.is_read && styles.unreadText]}>{item.title}</Text>
        <Text style={styles.body} numberOfLines={2}>{getCleanMessage(item.message || item.body)}</Text>
        <Text style={styles.time}>{formatTime(item.created_at)}</Text>
      </View>
      {!item.is_read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <CustomHeader title="Notifications" showBack />
      
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
});

export default NotificationsScreen;
