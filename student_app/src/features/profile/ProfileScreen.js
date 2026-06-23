import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGetDashboardQuery } from '../../store/apiSlice';
import { logout } from '../../store/authSlice';
import * as Keychain from 'react-native-keychain';
import Icon from 'react-native-vector-icons/Feather';
import { colors, shadows } from '../../theme/colors';
import AppModal from '../../components/AppModal';
import { useDrawer } from '../../navigation/DrawerContext';

const ProfileScreen = ({ navigation }) => {
  const { openDrawer } = useDrawer();
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { data, refetch } = useGetDashboardQuery();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const profile = data?.data?.profile || {};
  const classInfo = data?.data?.classInfo || {};

  const initials = (profile.name || user?.name || 'S')
    .split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

  const handleLogout = async () => {
    await Keychain.resetGenericPassword();
    dispatch(logout());
  };

  const InfoRow = ({ icon, label, value }) => (
    <View style={styles.infoRow}>
      <View style={styles.iconBox}>
        <Icon name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || 'N/A'}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openDrawer} style={styles.headerBtn}>
          <Icon name="menu" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>The Arc School</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Notifications')}>
          <Icon name="bell" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scroll} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* Profile Hero */}
        <View style={styles.heroCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.nameText}>{profile.name || user?.name || 'Student'}</Text>
          <Text style={styles.classText}>
            Class {classInfo?.name || '—'} {classInfo?.section ? `- ${classInfo.section}` : ''}
          </Text>
        </View>

        <View style={styles.content}>
          {/* Student Info */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Student Information</Text>
            <InfoRow icon="hash"      label="Admission Number" value={profile.admission_number} />
            <InfoRow icon="calendar"  label="Date of Birth"    value={profile.dob} />
            <InfoRow icon="home"      label="House"            value={profile.house} />
          </View>

          {/* Contact Details */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Contact Details</Text>
            <InfoRow icon="mail"  label="Email"   value={user?.email} />
            <InfoRow icon="phone" label="Phone"   value={user?.phone} />
            <InfoRow icon="map-pin" label="Address" value={user?.address} />
          </View>

          {/* Quick Actions */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Quick Actions</Text>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => navigation.navigate('Rewards')}
            >
              <Icon name="star" size={18} color={colors.warning} />
              <Text style={styles.actionLabel}>My Rewards & Badges</Text>
              <Icon name="chevron-right" size={16} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Icon name="bell" size={18} color={colors.primary} />
              <Text style={styles.actionLabel}>Notifications</Text>
              <Icon name="chevron-right" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Logout */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => setShowLogoutModal(true)}
          >
            <Icon name="log-out" size={18} color={colors.danger} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Branded Logout Modal */}
      <AppModal
        visible={showLogoutModal}
        icon="log-out"
        iconColor={colors.danger}
        title="Sign Out"
        message="Are you sure you want to sign out of your account?"
        actions={[
          { label: 'Cancel', style: 'cancel', onPress: () => setShowLogoutModal(false) },
          { label: 'Sign Out', style: 'danger', onPress: handleLogout },
        ]}
        onClose={() => setShowLogoutModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.primary },
  scroll: { flex: 1, backgroundColor: colors.background },

  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerBtn: { padding: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10 },

  heroCard: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  nameText: { fontSize: 22, fontWeight: '800', color: '#fff' },
  classText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },

  content: { padding: 16 },

  card: {
    backgroundColor: colors.surface, borderRadius: 16,
    padding: 18, marginBottom: 14, ...shadows.card,
  },
  cardTitle: {
    fontSize: 16, fontWeight: '700', color: colors.text,
    marginBottom: 14, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  iconBox: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '600', color: colors.text },

  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  actionLabel: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '500' },

  logoutBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10,
    backgroundColor: colors.surface, borderRadius: 16,
    paddingVertical: 16, marginBottom: 10,
    borderWidth: 1.5, borderColor: colors.danger + '40',
    ...shadows.card,
  },
  logoutText: { fontSize: 16, fontWeight: '700', color: colors.danger },
});

export default ProfileScreen;
