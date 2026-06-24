import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useSelector } from 'react-redux';
import { useGetClassStudentsQuery, useSubmitBulkAttendanceMutation, useGetAttendanceQuery } from '../../store/apiSlice';
import { colors, shadows } from '../../theme/colors';
import CustomModal from '../../components/CustomModal';

const AttendanceMarkingScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  
  const { activeClassId, availableClasses } = useSelector((state) => state.app);
  const routeClassId = route.params?.classId;
  const classId = activeClassId || routeClassId;
  
  const currentClass = availableClasses?.find(c => c.classId === classId) || { className: route.params?.className, section: route.params?.section };
  const className = currentClass.className;
  const section = currentClass.section;

  const { data: studentsData, isLoading: loadingStudents, refetch: refetchStudents, isFetching: fetchingStudents } = useGetClassStudentsQuery(classId);
  
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  
  const { data: attendanceData, isLoading: loadingAttendance, refetch: refetchAttendance, isFetching: fetchingAttendance } = useGetAttendanceQuery({ classId, startDate: today, endDate: today });

  const onRefresh = React.useCallback(() => {
    refetchStudents();
    refetchAttendance();
  }, [refetchStudents, refetchAttendance]);

  const isRefreshing = fetchingStudents || fetchingAttendance;

  const [students, setStudents] = useState([]);
  const [submitBulkAttendance, { isLoading: saving }] = useSubmitBulkAttendanceMutation();
  const [modalState, setModalState] = useState({ visible: false, type: 'info', title: '', message: '', onSuccess: null });

  useEffect(() => {
    if (studentsData?.students) {
      const existingRecords = attendanceData?.records || [];
      const merged = studentsData.students.map(s => {
        const record = existingRecords.find(r => r.student_id === s.id);
        return { ...s, _id: s.id, status: record ? record.status : 'present' }; // backend returns lowercase
      });
      setStudents(merged);
    }
  }, [studentsData, attendanceData]);

  const handleStatusChange = (id, status) => {
    const updated = students.map(s => s._id === id ? { ...s, status } : s);
    setStudents(updated);
  };

  const handleMarkAllPresent = () => {
    const updated = students.map(s => ({ ...s, status: 'present' }));
    setStudents(updated);
  };

  const handleSubmit = async () => {
    try {
      const attendanceData = students.map(s => ({
        student_id: s._id,
        date: today,
        status: s.status
      }));
      
      const res = await submitBulkAttendance(attendanceData).unwrap();
      
      if (res.success) {
        setModalState({
          visible: true,
          type: 'success',
          title: 'Success',
          message: 'Attendance saved successfully!',
          onSuccess: () => navigation.goBack()
        });
      } else {
        setModalState({
          visible: true,
          type: 'error',
          title: 'Error',
          message: res.message || 'Failed to save attendance',
          onSuccess: null
        });
      }
    } catch (error) {
      setModalState({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'An error occurred while saving attendance',
        onSuccess: null
      });
    }
  };

  const StatusPill = ({ currentStatus, targetStatus, onPress, activeColor, activeBg, label, icon }) => {
    const isActive = currentStatus === targetStatus;
    
    return (
      <TouchableOpacity 
        style={[
          styles.statusPill, 
          isActive ? { backgroundColor: activeColor, borderColor: activeColor } : { backgroundColor: colors.surface, borderColor: colors.borderLight }
        ]} 
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.statusPillText, 
          isActive ? { color: colors.surface } : { color: activeColor }
        ]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  // Calculate quick stats
  const presentCount = students.filter(s => s.status === 'present').length;
  const absentCount = students.filter(s => s.status === 'absent').length;
  const lateCount = students.filter(s => s.status === 'late').length;

  return (
    <View style={styles.container}>
      {/* Premium Sweeping Header */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color={colors.surface} />
          </TouchableOpacity>
          <View style={{alignItems: 'center'}}>
            <Text style={styles.headerTitle}>Mark Attendance</Text>
            <Text style={styles.headerSubtitle}>Class {className} - {section}</Text>
          </View>
          <View style={{flexDirection: 'row'}}>
            <TouchableOpacity style={styles.iconButton} onPress={handleMarkAllPresent}>
              <Icon name="check-square" size={24} color={colors.surface} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Dashboard-style Mini Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{presentCount}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={[styles.statBox, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }]}>
            <Text style={styles.statValue}>{lateCount}</Text>
            <Text style={styles.statLabel}>Late</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{absentCount}</Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
        </View>
      </View>

      <View style={styles.dateBanner}>
        <Icon name="calendar" size={16} color={colors.primary} />
        <Text style={styles.dateBannerText}>Today, {today}</Text>
      </View>

      {loadingStudents || loadingAttendance ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        >
          {students.map((student, index) => {
            const isPresent = student.status === 'present';
            const isAbsent = student.status === 'absent';
            const isLate = student.status === 'late';

            // Determine border color based on status
            let cardBorderColor = 'transparent';
            if (isPresent) cardBorderColor = colors.success + '40';
            else if (isAbsent) cardBorderColor = colors.danger + '40';
            else if (isLate) cardBorderColor = colors.warning + '40';

            return (
              <View key={student._id} style={[styles.studentCard, { borderColor: cardBorderColor, borderWidth: 1 }]}>
                <TouchableOpacity 
                  style={styles.studentDetailsRow}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('StudentProfile', { student })}
                >
                  <View style={[styles.studentAvatar, { backgroundColor: isPresent ? colors.success + '15' : isAbsent ? colors.danger + '15' : isLate ? colors.warning + '15' : colors.primary + '15' }]}>
                    <Text style={[styles.avatarText, { color: isPresent ? colors.success : isAbsent ? colors.danger : isLate ? colors.warning : colors.primary }]}>{student.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <Text style={styles.studentRoll}>ID: {student.admission_number || student.id?.substring(0, 8) || 'N/A'}</Text>
                  </View>
                </TouchableOpacity>
                
                {/* Modern Status Selection */}
                <View style={styles.statusGroup}>
                  <StatusPill 
                    currentStatus={student.status} targetStatus="present" 
                    activeColor={colors.success} activeBg={colors.success + '20'} 
                    onPress={() => handleStatusChange(student._id, 'present')} 
                    label="P"
                  />
                  <View style={{width: 8}} />
                  <StatusPill 
                    currentStatus={student.status} targetStatus="late" 
                    activeColor={colors.warning} activeBg={colors.warning + '20'} 
                    onPress={() => handleStatusChange(student._id, 'late')} 
                    label="L"
                  />
                  <View style={{width: 8}} />
                  <StatusPill 
                    currentStatus={student.status} targetStatus="absent" 
                    activeColor={colors.danger} activeBg={colors.danger + '20'} 
                    onPress={() => handleStatusChange(student._id, 'absent')} 
                    label="A"
                  />
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Floating Submit Button */}
      <View style={styles.footerContainer}>
        <TouchableOpacity 
          style={[styles.submitButton, saving && styles.submitButtonDisabled]} 
          onPress={handleSubmit}
          disabled={saving || loadingStudents || loadingAttendance || students.length === 0}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <>
              <Icon name="check-circle" size={22} color={colors.surface} style={{ marginRight: 8 }} />
              <Text style={styles.submitText}>Submit Attendance</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <CustomModal
        visible={modalState.visible}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        primaryButtonText="AWESOME"
        onPrimaryPress={() => {
          setModalState(prev => ({ ...prev, visible: false }));
          if (modalState.onSuccess) modalState.onSuccess();
        }}
        onClose={() => setModalState(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  
  headerContainer: {
    backgroundColor: colors.primary,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    ...shadows.card,
    zIndex: 10,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 20 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.surface, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginTop: 2 },
  iconButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12 },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 8,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.surface },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600', textTransform: 'uppercase', marginTop: 2 },

  dateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight + '15',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 20,
    marginBottom: 16,
  },
  dateBannerText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 8,
  },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },

  studentCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 20,
    marginBottom: 12,
    ...shadows.card,
  },
  studentDetailsRow: {
    flexDirection: 'row', 
    alignItems: 'center',
    flex: 1,
  },
  studentAvatar: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 14,
  },
  avatarText: { fontSize: 20, fontWeight: '800' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 2 },
  studentRoll: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  
  statusGroup: { flexDirection: 'row', alignItems: 'center' },
  statusPill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusPillText: { fontSize: 14, fontWeight: '800' },

  footerContainer: {
    position: 'absolute',
    bottom: 24, left: 24, right: 24,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.button,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitText: { color: colors.surface, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
});

export default AttendanceMarkingScreen;
