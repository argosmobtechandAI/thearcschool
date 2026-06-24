import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import CustomHeader from '../../components/CustomHeader';
import { useGetNotificationsQuery, useMarkNotificationReadMutation } from '../../store/apiSlice';
import { colors, shadows } from '../../theme/colors';
import { format } from 'date-fns';

const NotificationsScreen = ({ navigation }) => {
  const { data, isLoading, refetch, isFetching } = useGetNotificationsQuery();
  const [markAsRead] = useMarkNotificationReadMutation();

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
        let targetStack = null;
        let actualScreen = routeScreen;

        if (routeScreen === 'AttendanceHome') {
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

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.notificationCard, !item.is_read && styles.unreadCard]}
      onPress={() => handlePress(item)}
    >
      <View style={styles.iconContainer}>
        <Icon name="bell" size={24} color={!item.is_read ? colors.primary : colors.textMuted} />
      </View>
      <View style={styles.contentContainer}>
        <Text style={[styles.title, !item.is_read && styles.unreadText]}>{item.title}</Text>
        <Text style={styles.body} numberOfLines={2}>{getCleanMessage(item.message || item.body)}</Text>
        <Text style={styles.time}>{format(new Date(item.created_at), 'MMM dd, hh:mm a')}</Text>
      </View>
      {!item.is_read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <CustomHeader title="Notifications" showBack />
      
      {isLoading ? (
        <View style={styles.center}>
          <Text>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContainer, notifications.length === 0 && { flex: 1 }]}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="bell-off" size={64} color={colors.border} />
              <Text style={styles.emptyText}>No notifications yet.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContainer: { padding: 16 },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    ...shadows.card,
  },
  unreadCard: {
    backgroundColor: colors.primaryLight + '10',
    borderColor: colors.primaryLight,
    borderWidth: 1,
  },
  iconContainer: {
    marginRight: 16,
    justifyContent: 'center',
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
    color: colors.primary,
  },
  body: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 8,
  },
  time: {
    fontSize: 12,
    color: colors.textMuted,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    alignSelf: 'center',
    marginLeft: 8,
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
    opacity: 0.5,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textMuted,
  },
});

export default NotificationsScreen;
