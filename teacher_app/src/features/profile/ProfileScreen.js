import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/Feather';
import * as Keychain from 'react-native-keychain';
import { logout } from '../../store/authSlice';
import { apiSlice, useGetTeacherProfileQuery } from '../../store/apiSlice';
import { clearAppState } from '../../store/appSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../theme/colors';

const ProfileScreen = ({ navigation }) => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  
  const { data: profileData, isLoading, refetch, isFetching } = useGetTeacherProfileQuery();
  
  const onRefresh = React.useCallback(() => {
    refetch();
  }, [refetch]);
  
  const assignedClassesText = profileData?.data?.assignedClasses?.length > 0 
    ? profileData.data.assignedClasses.map(c => `${c.className}${c.section ? ` - ${c.section}` : ''}`).join(', ')
    : 'Not Assigned';

  const classTeacherText = profileData?.data?.classTeacherOf?.length > 0
    ? profileData.data.classTeacherOf.map(c => `${c.className}${c.section ? ` - ${c.section}` : ''}`).join(', ')
    : 'None';

  const subjectsText = React.useMemo(() => {
    if (!profileData?.data?.subjects?.length) return 'None';
    
    const subjectMap = {};
    profileData.data.subjects.forEach(s => {
      if (!s.subjectName) return;
      if (!subjectMap[s.subjectName]) subjectMap[s.subjectName] = [];
      const classStr = `${s.className}${s.section ? `-${s.section}` : ''}`;
      subjectMap[s.subjectName].push(classStr);
    });

    return Object.entries(subjectMap)
      .map(([subject, classes]) => `${subject} (${classes.join(', ')})`)
      .join('\\n');
  }, [profileData]);

  const handleLogout = async () => {
    try {
      await Keychain.resetGenericPassword();
      await AsyncStorage.removeItem('@auth_user');
      await AsyncStorage.removeItem('@auth_token');
      dispatch(apiSlice.util.resetApiState());
      dispatch(clearAppState());
      dispatch(logout());
    } catch (e) {
      console.error("Error during logout:", e);
    }
  };

  const InfoCard = ({ icon, title, value, color }) => (
    <View style={styles.infoCard}>
      <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
        <Icon name={icon} size={20} color={color} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoValue}>{value || 'N/A'}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'T'}
              </Text>
            )}
          </View>
          <Text style={styles.name}>{user?.name || 'Teacher Name'}</Text>
          <Text style={styles.email}>{user?.email || 'teacher@school.com'}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Staff Member</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Roles & Assignments</Text>
        
        <InfoCard 
          icon="users" 
          title="Class Teacher Of" 
          value={isLoading ? "Loading..." : classTeacherText} 
          color={colors.primary}
        />

        <InfoCard 
          icon="book-open" 
          title="Subjects Taught" 
          value={isLoading ? "Loading..." : subjectsText} 
          color={'#e67e22'}
        />
        
        <InfoCard 
          icon="phone" 
          title="Contact" 
          value={user?.phone || 'Not Provided'} 
          color={colors.success}
        />

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.changePasswordButton} 
            onPress={() => navigation.navigate('Home', { screen: 'ChangePassword' })}
          >
            <Icon name="lock" size={20} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.changePasswordText}>Change Password</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Icon name="log-out" size={20} color={colors.danger} style={{ marginRight: 8 }} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 24 },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.pink,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: colors.pink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 48, resizeMode: 'cover' },
  avatarText: { fontSize: 36, fontWeight: 'bold', color: colors.background },
  name: { fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  email: { fontSize: 14, color: colors.textMuted, marginBottom: 12 },
  badge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 16 },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  infoValue: { fontSize: 16, fontWeight: '600', color: colors.text },
  actionsContainer: { marginTop: 32 },
  changePasswordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '10',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    marginBottom: 16,
  },
  changePasswordText: { fontSize: 16, fontWeight: '600', color: colors.primary },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger + '10',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.danger + '30',
  },
  logoutText: { fontSize: 16, fontWeight: '600', color: colors.danger },
});

export default ProfileScreen;
