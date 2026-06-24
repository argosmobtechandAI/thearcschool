import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { colors, shadows } from '../../theme/colors';

import CustomHeader from '../../components/CustomHeader';

const StudentProfileScreen = ({ route, navigation }) => {
  const { student } = route.params;

  const fatherName = student?.father_name || 'Not Provided';
  const motherName = student?.mother_name || 'Not Provided';
  const guardianPhone = student?.phone || student?.guardianPhone || '+1 234 567 8900';
  const guardianEmail = student?.email || student?.guardianEmail || 'guardian@example.com';
  const displayId = student?.admission_number || student?.id?.substring(0, 8) || 'N/A';

  // Placeholder calculated data (ideally this comes from an API hook)
  const attendancePercentage = 85; 
  const totalClasses = 120;
  const classesAttended = Math.round((attendancePercentage / 100) * totalClasses);

  const dob = student?.dob ? new Date(student.dob).toLocaleDateString() : 'Not Provided';
  const address = student?.address || 'Not Provided';
  const house = student?.house || 'Not Assigned';
  const admissionDate = student?.admission_date ? new Date(student.admission_date).toLocaleDateString() : 'Not Provided';
  const studentEmail = student?.email || 'Not Provided';

  const handleCall = (phone) => {
    if (phone && phone !== 'Not Provided') Linking.openURL(`tel:${phone}`);
  };

  const handleEmail = (email) => {
    if (email && email !== 'Not Provided') Linking.openURL(`mailto:${email}`);
  };

  return (
    <View style={styles.container}>
      <CustomHeader title="Student Profile" showBack={true} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Floating Avatar Header */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{student?.name?.charAt(0) || 'S'}</Text>
          </View>
          <Text style={styles.studentName}>{student?.name || 'Student Name'}</Text>
          <Text style={styles.studentRoll}>Admission ID: {displayId}</Text>
          
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Active Student</Text>
          </View>
        </View>

        {/* Quick Stats Section */}
        <Text style={styles.sectionTitle}>Performance Overview</Text>
        <View style={styles.statsGrid}>
          <TouchableOpacity 
            style={[styles.statCard, { borderTopColor: colors.success }]}
            onPress={() => navigation.navigate('StudentAttendanceHistoryScreen', { student })}
          >
            <View style={[styles.statIconBox, { backgroundColor: colors.success + '15' }]}>
              <Icon name="calendar" size={22} color={colors.success} />
            </View>
            <Text style={styles.statValue}>History</Text>
            <Text style={styles.statLabel}>Attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.statCard, { borderTopColor: colors.warning }]}
            onPress={() => navigation.navigate('StudentAcademicHistoryScreen', { student })}
          >
            <View style={[styles.statIconBox, { backgroundColor: colors.warning + '15' }]}>
              <Icon name="award" size={22} color={colors.warning} />
            </View>
            <Text style={styles.statValue}>Exams</Text>
            <Text style={styles.statLabel}>Academics</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.statCard, { borderTopColor: colors.danger }]}
            onPress={() => navigation.navigate('StudentNotesScreen', { student })}
          >
            <View style={[styles.statIconBox, { backgroundColor: colors.danger + '15' }]}>
              <Icon name="file-text" size={22} color={colors.danger} />
            </View>
            <Text style={styles.statValue}>Notes</Text>
            <Text style={styles.statLabel}>Behavior</Text>
          </TouchableOpacity>
        </View>

        {/* Personal Info Section */}
        <Text style={styles.sectionTitle}>Personal Details</Text>
        <View style={styles.contactCard}>
          <View style={styles.contactRow}>
            <View style={[styles.contactIconBox, { backgroundColor: colors.secondary + '15' }]}>
              <Icon name="mail" size={20} color={colors.secondary} />
            </View>
            <View style={styles.contactDetails}>
              <Text style={styles.contactLabel}>Student Email</Text>
              <Text style={styles.contactValue}>{studentEmail}</Text>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.contactRow}>
            <View style={[styles.contactIconBox, { backgroundColor: colors.primary + '15' }]}>
              <Icon name="calendar" size={20} color={colors.primary} />
            </View>
            <View style={styles.contactDetails}>
              <Text style={styles.contactLabel}>Date of Birth</Text>
              <Text style={styles.contactValue}>{dob}</Text>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.contactRow}>
            <View style={[styles.contactIconBox, { backgroundColor: colors.purple + '15' }]}>
              <Icon name="map-pin" size={20} color={colors.purple} />
            </View>
            <View style={styles.contactDetails}>
              <Text style={styles.contactLabel}>Address</Text>
              <Text style={styles.contactValue}>{address}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.contactRow}>
            <View style={[styles.contactIconBox, { backgroundColor: colors.success + '15' }]}>
              <Icon name="flag" size={20} color={colors.success} />
            </View>
            <View style={styles.contactDetails}>
              <Text style={styles.contactLabel}>House / Team</Text>
              <Text style={styles.contactValue}>{house}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.contactRow}>
            <View style={[styles.contactIconBox, { backgroundColor: colors.warning + '15' }]}>
              <Icon name="check-circle" size={20} color={colors.warning} />
            </View>
            <View style={styles.contactDetails}>
              <Text style={styles.contactLabel}>Admission Date</Text>
              <Text style={styles.contactValue}>{admissionDate}</Text>
            </View>
          </View>
        </View>

        <View style={{height: 32}} />

        {/* Contact Info Section */}
        <Text style={styles.sectionTitle}>Guardian Contact</Text>
        <View style={styles.contactCard}>
          <View style={styles.contactRow}>
            <View style={[styles.contactIconBox, { backgroundColor: colors.primary + '15' }]}>
              <Icon name="user" size={20} color={colors.primary} />
            </View>
            <View style={styles.contactDetails}>
              <Text style={styles.contactLabel}>Father's Name</Text>
              <Text style={styles.contactValue}>{fatherName}</Text>
            </View>
          </View>
          
          <View style={styles.divider} />

          <View style={styles.contactRow}>
            <View style={[styles.contactIconBox, { backgroundColor: colors.pink + '15' }]}>
              <Icon name="user" size={20} color={colors.pink} />
            </View>
            <View style={styles.contactDetails}>
              <Text style={styles.contactLabel}>Mother's Name</Text>
              <Text style={styles.contactValue}>{motherName}</Text>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.contactRow}>
            <View style={[styles.contactIconBox, { backgroundColor: colors.success + '15' }]}>
              <Icon name="phone" size={20} color={colors.success} />
            </View>
            <View style={styles.contactDetails}>
              <Text style={styles.contactLabel}>Phone Number</Text>
              <Text style={styles.contactValue}>{guardianPhone}</Text>
            </View>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.success }]} onPress={() => handleCall(guardianPhone)}>
              <Icon name="phone-call" size={18} color={colors.surface} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.divider} />

          <View style={styles.contactRow}>
            <View style={[styles.contactIconBox, { backgroundColor: colors.secondary + '15' }]}>
              <Icon name="mail" size={20} color={colors.secondary} />
            </View>
            <View style={styles.contactDetails}>
              <Text style={styles.contactLabel}>Email Address</Text>
              <Text style={styles.contactValue}>{guardianEmail}</Text>
            </View>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.secondary }]} onPress={() => handleEmail(guardianEmail)}>
              <Icon name="send" size={18} color={colors.surface} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  
  scrollContent: { padding: 20, paddingBottom: 60 },

  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
    ...shadows.card,
    elevation: 8,
  },
  avatarCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
    borderWidth: 4, borderColor: colors.surface,
  },
  avatarText: { fontSize: 36, fontWeight: '800', color: colors.primary },
  studentName: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.5, marginBottom: 4 },
  studentRoll: { fontSize: 13, color: colors.textMuted, fontWeight: '600', marginBottom: 12 },
  
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.success + '15',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: '700', color: colors.success },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.textMuted, marginBottom: 16, letterSpacing: 0.5, textTransform: 'uppercase' },

  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  statCard: {
    width: '31%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 4,
    ...shadows.card,
  },
  statIconBox: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 4 },
  statLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted },

  contactCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    ...shadows.card,
  },
  contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  contactIconBox: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 16,
  },
  contactDetails: { flex: 1 },
  contactLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginBottom: 2 },
  contactValue: { fontSize: 15, fontWeight: '700', color: colors.text },
  actionBtn: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    ...shadows.button,
  },
  divider: { height: 1, backgroundColor: colors.borderLight, marginVertical: 8, marginLeft: 64 },
});

export default StudentProfileScreen;
