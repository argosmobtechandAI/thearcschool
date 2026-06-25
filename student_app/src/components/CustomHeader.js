import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useGetNotificationsQuery } from '../store/apiSlice';
import { colors } from '../theme/colors';

const CustomHeader = ({ title, showBack, onMenuPress, rightComponent }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  const { data: notificationsData } = useGetNotificationsQuery();
  const unreadCount = notificationsData?.data?.filter(n => !n.is_read)?.length || 0;

  return (
    <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      {showBack ? (
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
      ) : onMenuPress ? (
        <TouchableOpacity style={styles.headerBtn} onPress={onMenuPress}>
          <Icon name="menu" size={22} color="#fff" />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 34 }} />
      )}

      <Text style={styles.headerTitle}>{title || 'The Arc School'}</Text>

      {rightComponent ? (
        rightComponent
      ) : (
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Home', { screen: 'Notifications' })}>
          {unreadCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
          <Icon name="bell" size={22} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 20, 
    paddingBottom: 14,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerBtn: { padding: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10 },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.danger,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
});

export default CustomHeader;
