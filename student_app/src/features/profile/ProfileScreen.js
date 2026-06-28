import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGetDashboardQuery } from '../../store/apiSlice';
import { logout } from '../../store/authSlice';
import * as Keychain from 'react-native-keychain';
import Icon from 'react-native-vector-icons/Feather';
import { theme } from '../../theme/theme';
import AppModal from '../../components/AppModal';
import { useDrawer } from '../../navigation/DrawerContext';
import Card from '../../components/Card';
import Button from '../../components/Button';

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <View style={styles.iconBox}>
      <Icon name={icon} size={18} color={theme.colors.primary} />
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || 'N/A'}</Text>
    </View>
  </View>
);

const ProfileScreen = ({ navigation }) => {
  const { openDrawer } = useDrawer();
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { data, isFetching, refetch } = useGetDashboardQuery();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  const onRefresh = useCallback(async () => {
        await refetch();
      }, [refetch]);

  const profile = data?.data?.profile || {};
  const classInfo = data?.data?.classInfo || {};

  const initials = (profile.name || user?.name || 'S')
    .split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

  const handleLogout = async () => {
    await Keychain.resetGenericPassword();
    dispatch(logout());
  };

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
        refreshControl={<RefreshControl refreshing={isFetching || false} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
      >
        {/* Profile Hero */}
        <View style={styles.heroCard}>
          <View style={styles.avatarCircle}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>
          <Text style={styles.nameText}>{profile.name || user?.name || 'Student'}</Text>
          <Text style={styles.classText}>
            Class {classInfo?.name || '—'} {classInfo?.section ? `- ${classInfo.section}` : ''}
          </Text>
        </View>

        <View style={styles.content}>
          {/* Student Info */}
          <Card variant="elevated">
            <Text style={styles.cardTitle}>Student Information</Text>
            <InfoRow icon="hash"      label="Admission Number" value={profile.admission_number} />
            <InfoRow icon="calendar"  label="Date of Birth"    value={profile.dob} />
            <InfoRow icon="home"      label="House"            value={profile.house} />
          </Card>

          {/* Contact Details */}
          <Card variant="elevated">
            <Text style={styles.cardTitle}>Contact Details</Text>
            <InfoRow icon="mail"  label="Email"   value={user?.email} />
            <InfoRow icon="phone" label="Phone"   value={user?.phone} />
            <InfoRow icon="map-pin" label="Address" value={user?.address} />
          </Card>

          {/* Quick Actions */}
          <Card variant="elevated">
            <Text style={styles.cardTitle}>Quick Actions</Text>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => navigation.navigate('Rewards')}
            >
              <Icon name="star" size={18} color={theme.colors.warning} />
              <Text style={styles.actionLabel}>My Rewards & Badges</Text>
              <Icon name="chevron-right" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Icon name="bell" size={18} color={theme.colors.primary} />
              <Text style={styles.actionLabel}>Notifications</Text>
              <Icon name="chevron-right" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => navigation.navigate('ChangePassword')}
            >
              <Icon name="lock" size={18} color={theme.colors.textMuted} />
              <Text style={styles.actionLabel}>Change Password</Text>
              <Icon name="chevron-right" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </Card>

          {/* Logout */}
          <Button
            label="Logout"
            icon="log-out"
            variant="danger"
            onPress={() => setShowLogoutModal(true)}
            style={styles.logoutBtn}
          />
        </View>

        <View style={{ height: theme.spacing.xxl }} />
      </ScrollView>

      {/* Branded Logout Modal */}
      <AppModal
        visible={showLogoutModal}
        icon="log-out"
        iconColor={theme.colors.danger}
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
  safeArea: { flex: 1, backgroundColor: theme.colors.primary },
  scroll: { flex: 1, backgroundColor: theme.colors.background },

  header: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg, paddingVertical: 14,
  },
  headerTitle: { color: '#fff', fontSize: theme.typography.fontSize.lg, fontFamily: theme.typography.fontFamily.heading },
  headerBtn: { padding: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10 },

  heroCard: {
    backgroundColor: theme.colors.primary,
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
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 37, resizeMode: 'cover' },
  avatarText: { fontSize: 28, fontFamily: theme.typography.fontFamily.heading, color: '#fff' },
  nameText: { fontSize: 22, fontFamily: theme.typography.fontFamily.heading, color: '#fff' },
  classText: { fontSize: theme.typography.fontSize.sm, fontFamily: theme.typography.fontFamily.regular, color: 'rgba(255,255,255,0.8)', marginTop: 4 },

  content: { padding: theme.spacing.md },

  cardTitle: {
    fontSize: theme.typography.fontSize.md, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.text,
    marginBottom: 14, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  iconBox: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, fontFamily: theme.typography.fontFamily.medium, color: theme.colors.textMuted, marginBottom: 2 },
  infoValue: { fontSize: theme.typography.fontSize.md, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.text },

  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight,
  },
  actionLabel: { flex: 1, fontSize: theme.typography.fontSize.md, fontFamily: theme.typography.fontFamily.medium, color: theme.colors.text },

  logoutBtn: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
});

export default ProfileScreen;
