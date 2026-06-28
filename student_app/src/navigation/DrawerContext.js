import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback,
  ScrollView, Animated, Dimensions, Modal, StatusBar, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/Feather';
import * as Keychain from 'react-native-keychain';
import { logout } from '../store/authSlice';
import { colors } from '../theme/colors';
import { navigationRef } from './navigationRef';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = SCREEN_WIDTH * 0.80;

// ─── Context ─────────────────────────────────────────────────────────────────

const DrawerContext = createContext({
  openDrawer: () => {},
  closeDrawer: () => {},
});

export const useDrawer = () => useContext(DrawerContext);

// ─── Drawer Item ─────────────────────────────────────────────────────────────

const DrawerItem = ({ icon, label, onPress, color = colors.textMuted, badgeCount }) => (
  <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
      <Icon name={icon} size={18} color={color} />
    </View>
    <Text style={styles.itemLabel}>{label}</Text>
    {badgeCount > 0 && (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badgeCount}</Text>
      </View>
    )}
    <Icon name="chevron-right" size={16} color={colors.border} style={{ marginLeft: 'auto' }} />
  </TouchableOpacity>
);

// ─── Drawer Content (rendered inside Modal) ──────────────────────────────────

import { useGetNotificationsQuery, useGetDashboardQuery } from '../store/apiSlice';

const DrawerContent = ({ close }) => {
  const { user } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const { data: notificationsData } = useGetNotificationsQuery();
  const unreadCount = notificationsData?.data?.filter(n => !n.is_read)?.length || 0;

  const { data: dashboardData } = useGetDashboardQuery();
  const profile = dashboardData?.data?.profile;

  const initials = (profile?.name || user?.name || 'S')
    .split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

  const go = (screen) => {
    close();
    setTimeout(() => {
      if (navigationRef.isReady()) {
        navigationRef.navigate(screen);
      }
    }, 250);
  };

  const handleLogout = async () => {
    close();
    await Keychain.resetGenericPassword();
    dispatch(logout());
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.surface }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      showsVerticalScrollIndicator={false}
    >
      {/* User Header */}
      <View style={[styles.header, { paddingTop: insets.top + 40 }]}>
        <TouchableOpacity
          style={[styles.closeBtn, { top: insets.top + 12 }]}
          onPress={close}
        >
          <Icon name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.avatar}>
          {(profile?.avatar_url || user?.avatar_url) ? (
            <Image source={{ uri: profile?.avatar_url || user?.avatar_url }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
        </View>
        <Text style={styles.userName}>{profile?.name || user?.name || 'Student'}</Text>
        <Text style={styles.userRole}>Roll No: {profile?.admission_number || user?.admission_number || 'N/A'}</Text>
      </View>

      {/* Nav Items */}
      <View style={styles.navSection}>
        <DrawerItem icon="home"           label="Home"          color="#3B82F6" onPress={() => go('Home')} />
        <DrawerItem icon="file-text"      label="Academic Calendar"    color="#06B6D4" onPress={() => go('AcademicCalendar')} />
        <DrawerItem icon="bell"           label="Announcements" color="#F43F5E" badgeCount={unreadCount} onPress={() => go('Notifications')} />
        <DrawerItem icon="check-circle"   label="Attendance"    color="#10B981" onPress={() => go('Attendance')} />
        <DrawerItem icon="info"           label="Circulars"     color="#0EA5E9" onPress={() => go('Circulars')} />
        <DrawerItem icon="message-square" label="Communication" color="#14B8A6" onPress={() => go('Communication')} />
        <DrawerItem icon="edit-3"         label="Date Sheet"    color="#F97316" onPress={() => go('DateSheet')} />
        <DrawerItem icon="credit-card"    label="Fee Details"   color="#EF4444" onPress={() => go('Fees')} />
        <DrawerItem icon="image"          label="Gallery"       color="#EC4899" onPress={() => go('Gallery')} />
        <DrawerItem icon="award"          label="My Grades"     color="#EAB308" onPress={() => go('Result')} />
        <DrawerItem icon="user"           label="My Profile"    color="#64748B" onPress={() => go('Profile')} />
        <DrawerItem icon="calendar"       label="Timetable"     color="#8B5CF6" onPress={() => go('Class')} />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.socialRow}>
          <Icon name="facebook" size={20} color={colors.textMuted} />
          <Icon name="youtube" size={20} color={colors.textMuted} />
          <Icon name="globe" size={20} color={colors.textMuted} />
          <Icon name="twitter" size={20} color={colors.textMuted} />
          <Icon name="instagram" size={20} color={colors.textMuted} />
        </View>
        <Text style={styles.versionText}>Version : 1.0.0</Text>

        <TouchableOpacity style={styles.signOut} onPress={handleLogout}>
          <Icon name="log-out" size={16} color={colors.danger} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// ─── Provider ────────────────────────────────────────────────────────────────

export const DrawerProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const openDrawer = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
  }, []);

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: isOpen ? 0 : -DRAWER_WIDTH,
        duration: isOpen ? 250 : 200,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: isOpen ? 1 : 0,
        duration: isOpen ? 250 : 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isOpen, slideAnim, overlayAnim]);

  return (
    <DrawerContext.Provider value={{ openDrawer, closeDrawer }}>
      <View style={{ flex: 1 }}>
        {children}

        {/* Dark overlay covering the whole screen */}
        <TouchableWithoutFeedback onPress={closeDrawer} disabled={!isOpen}>
          <Animated.View 
            pointerEvents={isOpen ? 'auto' : 'none'}
            style={[
              StyleSheet.absoluteFill, 
              { 
                backgroundColor: 'rgba(0,0,0,0.5)', 
                opacity: overlayAnim, 
                zIndex: 99 
              }
            ]} 
          />
        </TouchableWithoutFeedback>

        {/* Drawer panel sliding in from the left */}
        <Animated.View
          pointerEvents={isOpen ? 'auto' : 'none'}
          style={[
            styles.drawerPanel,
            { 
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: DRAWER_WIDTH,
              transform: [{ translateX: slideAnim }],
              zIndex: 100,
            },
          ]}
        >
          <DrawerContent close={closeDrawer} />
        </Animated.View>
      </View>
    </DrawerContext.Provider>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawerPanel: {
    backgroundColor: colors.surface,
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },

  // Header
  header: {
    backgroundColor: colors.primary,
    padding: 20,
    paddingBottom: 30,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 10,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2, borderColor: '#fff',
    overflow: 'hidden',
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 38, resizeMode: 'cover' },
  userName: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  userRole: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },

  // Nav
  navSection: { flex: 1, paddingVertical: 8, paddingHorizontal: 12 },
  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 12,
    marginBottom: 4, borderRadius: 12,
  },
  iconBox: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  itemLabel: { fontSize: 15, color: colors.text, fontWeight: '600' },
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 10, marginLeft: 8,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Footer
  footer: {
    paddingTop: 20,
    borderTopWidth: 1, borderTopColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  socialRow: {
    flexDirection: 'row', gap: 24, marginBottom: 16,
  },
  versionText: {
    fontSize: 14, color: colors.text, fontWeight: '600', marginBottom: 16,
  },
  signOut: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.danger + '10',
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
  },
  signOutText: { fontSize: 14, color: colors.danger, fontWeight: '700' },
});
