import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useGetDashboardQuery } from '../../store/apiSlice';
import { logout } from '../../store/authSlice';
import * as Keychain from 'react-native-keychain';
import Icon from 'react-native-vector-icons/Feather';
import { colors, shadows } from '../../theme/colors';

const ProfileScreen = () => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { data } = useGetDashboardQuery();
  
  const profile = data?.data?.profile || {};
  const classInfo = data?.data?.classInfo || {};

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await Keychain.resetGenericPassword();
            dispatch(logout());
          }
        }
      ]
    );
  };

  const InfoRow = ({ icon, label, value }) => (
    <View style={styles.infoRow}>
      <View style={styles.iconBox}>
        <Icon name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || 'N/A'}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{profile.name?.charAt(0) || user?.name?.charAt(0) || 'S'}</Text>
        </View>
        <Text style={styles.nameText}>{profile.name || user?.name}</Text>
        <Text style={styles.classText}>Class {classInfo.name} - {classInfo.section}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Student Information</Text>
          <InfoRow icon="hash" label="Admission Number" value={profile.admission_number} />
          <InfoRow icon="calendar" label="Date of Birth" value={profile.dob} />
          <InfoRow icon="map-pin" label="House" value={profile.house} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact Details</Text>
          <InfoRow icon="mail" label="Email" value={user?.email} />
          <InfoRow icon="phone" label="Phone" value={user?.phone} />
          <InfoRow icon="home" label="Address" value={user?.address} />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Icon name="log-out" size={20} color={colors.danger} style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    padding: 32,
    paddingTop: 60,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    ...shadows.card,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.surface,
  },
  classText: {
    fontSize: 16,
    color: colors.surface,
    opacity: 0.9,
    marginTop: 4,
  },
  content: {
    padding: 20,
    marginTop: 10,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...shadows.card,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  logoutBtn: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: colors.danger + '40',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.danger,
  },
});

export default ProfileScreen;
