import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Modal, RefreshControl } from 'react-native';
import { Calendar } from 'react-native-calendars';
import Icon from 'react-native-vector-icons/Feather';
import { colors, shadows } from '../../theme/colors';
import CustomHeader from '../../components/CustomHeader';
import { useGetTeacherClassesQuery, useGetAttendanceQuery, useGetClassStudentsQuery } from '../../store/apiSlice';

const getPresetDateRange = (preset) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const dayOfWeek = now.getDay();

  if (preset === 'this_week') {
    // Sunday to Saturday of current week
    const start = new Date(y, m, d - dayOfWeek);
    const end = new Date(y, m, d + (6 - dayOfWeek));
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  } else if (preset === 'last_month') {
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0);
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  } else {
    // this_month
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  }
};

const AttendanceReportsScreen = ({ navigation }) => {
  const { data: classesData, isLoading: loadingClasses } = useGetTeacherClassesQuery();
  const assignedClasses = (classesData?.classes || []).filter(c => c.isClassTeacher);

  const [selectedClassId, setSelectedClassId] = useState('');
  const [preset, setPreset] = useState('this_month');

  React.useEffect(() => {
    if (!selectedClassId && assignedClasses.length > 0) {
      setSelectedClassId(assignedClasses[0].classId);
    }
  }, [assignedClasses, selectedClassId]);
  const [customDateRange, setCustomDateRange] = useState({ start: null, end: null });
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);

  const dateRange = useMemo(() => {
    if (preset === 'custom' && customDateRange.start && customDateRange.end) {
      return customDateRange;
    }
    return getPresetDateRange(preset);
  }, [preset, customDateRange]);

  const { data: attendanceData, isLoading: loadingAttendance, isFetching: fetchingAttendance, refetch: refetchAttendance } = useGetAttendanceQuery({
    startDate: dateRange.start,
    endDate: dateRange.end,
    ...(selectedClassId ? { classId: selectedClassId } : {})
  });

  const onRefresh = React.useCallback(() => {
    refetchAttendance();
  }, [refetchAttendance]);

  const { data: studentsData, isLoading: loadingStudents } = useGetClassStudentsQuery(selectedClassId, {
    skip: !selectedClassId
  });

  const records = attendanceData?.records || [];
  const students = studentsData?.students || [];

  const stats = useMemo(() => {
    let present = 0, absent = 0, late = 0;
    const uniqueDates = new Set();

    records.forEach(r => {
      if (r.date) {
        uniqueDates.add(r.date.split('T')[0]);
      }
      const status = String(r.status).toLowerCase();
      if (status === 'present') present++;
      if (status === 'absent') absent++;
      if (status === 'late') late++;
    });

    const total = present + absent + late;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return { present, absent, late, total, percentage, workingDays: uniqueDates.size };
  }, [records]);

  const studentLeaderboard = useMemo(() => {
    if (!selectedClassId || students.length === 0) return [];

    return students.map(student => {
      const studentRecords = records.filter(r => r.student_id === student.id);
      let p = 0, t = studentRecords.length;
      let a = 0, l = 0;
      studentRecords.forEach(r => {
        const s = String(r.status).toLowerCase();
        if (s === 'present') p++;
        if (s === 'absent') a++;
        if (s === 'late') l++;
      });
      const pct = t > 0 ? Math.round((p / t) * 100) : 0;
      return { ...student, percentage: pct, total: t, present: p, absent: a, late: l };
    }).sort((a, b) => b.percentage - a.percentage); // Sort highest first
  }, [selectedClassId, students, records]);

  const isLoading = loadingClasses || loadingAttendance || loadingStudents;
  const isFetching = fetchingAttendance;

  const renderClassPills = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll} contentContainerStyle={styles.pillContainer}>
      {assignedClasses.map(cls => (
        <TouchableOpacity 
          key={cls.classId}
          style={[styles.pill, selectedClassId === cls.classId && styles.pillActive]}
          onPress={() => setSelectedClassId(cls.classId)}
        >
          <Text style={[styles.pillText, selectedClassId === cls.classId && styles.pillTextActive]}>
            Class {cls.className} {cls.section ? `- ${cls.section}` : ''}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const onDayPress = (day) => {
    if (!customDateRange.start || (customDateRange.start && customDateRange.end)) {
      setCustomDateRange({ start: day.dateString, end: null });
    } else if (customDateRange.start && !customDateRange.end) {
      if (day.dateString < customDateRange.start) {
        setCustomDateRange({ start: day.dateString, end: customDateRange.start });
      } else {
        setCustomDateRange({ ...customDateRange, end: day.dateString });
      }
    }
  };

  const getMarkedDates = () => {
    let marked = {};
    if (customDateRange.start) {
      marked[customDateRange.start] = { startingDay: true, color: colors.primary, textColor: 'white' };
      if (customDateRange.end) {
        marked[customDateRange.end] = { endingDay: true, color: colors.primary, textColor: 'white' };
        let curr = new Date(customDateRange.start);
        let end = new Date(customDateRange.end);
        curr.setDate(curr.getDate() + 1);
        while (curr < end) {
          const dString = curr.toISOString().split('T')[0];
          marked[dString] = { color: colors.primaryLight, textColor: 'white' };
          curr.setDate(curr.getDate() + 1);
        }
      }
    }
    return marked;
  };

  const renderPresetPills = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll} contentContainerStyle={styles.presetContainer}>
      {[
        { id: 'this_week', label: 'This Week' },
        { id: 'this_month', label: 'This Month' },
        { id: 'last_month', label: 'Last Month' },
        { id: 'custom', label: 'Custom' }
      ].map(p => (
        <TouchableOpacity 
          key={p.id}
          style={[styles.presetPill, preset === p.id && styles.presetPillActive]}
          onPress={() => {
            if (p.id === 'custom') {
              setIsCalendarVisible(true);
            } else {
              setPreset(p.id);
            }
          }}
        >
          <Text style={[styles.presetText, preset === p.id && styles.presetTextActive]}>{p.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <CustomHeader title="Reports" showBack />

      <View style={styles.filterSection}>
        {renderClassPills()}
        {renderPresetPills()}
      </View>

      <Modal visible={isCalendarVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Date Range</Text>
            <Calendar
              markingType={'period'}
              markedDates={getMarkedDates()}
              onDayPress={onDayPress}
              theme={{ todayTextColor: colors.primary, arrowColor: colors.primary }}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setIsCalendarVisible(false)} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  if(customDateRange.start && customDateRange.end) {
                    setPreset('custom');
                    setIsCalendarVisible(false);
                  } else {
                    alert('Please select both start and end dates');
                  }
                }} 
                style={styles.modalApplyBtn}
              >
                <Text style={styles.modalApplyText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={fetchingAttendance} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {(isLoading || isFetching) ? (
          <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroInner}>
                <Text style={styles.heroLabel}>Overall Attendance</Text>
                <Text style={styles.heroValue}>{stats.percentage}%</Text>
                <Text style={styles.heroSubText}>{stats.present} present out of {stats.total} total records</Text>
                {stats.workingDays > 0 && (
                  <View style={styles.workingDaysBadge}>
                    <Text style={styles.workingDaysText}>{stats.workingDays} Working {stats.workingDays === 1 ? 'Day' : 'Days'}</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBarFill, { width: `${stats.percentage}%`, backgroundColor: stats.percentage >= 85 ? colors.success : stats.percentage >= 70 ? colors.warning : colors.error }]} />
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={[styles.iconBox, { backgroundColor: colors.success + '15' }]}>
                  <Icon name="check-circle" size={24} color={colors.success} />
                </View>
                <Text style={[styles.statValue, { color: colors.success }]}>{stats.present}</Text>
                <Text style={styles.statLabel}>Present</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.iconBox, { backgroundColor: colors.error + '15' }]}>
                  <Icon name="x-circle" size={24} color={colors.error} />
                </View>
                <Text style={[styles.statValue, { color: colors.error }]}>{stats.absent}</Text>
                <Text style={styles.statLabel}>Absent</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.iconBox, { backgroundColor: colors.warning + '15' }]}>
                  <Icon name="clock" size={24} color={colors.warning} />
                </View>
                <Text style={[styles.statValue, { color: colors.warning }]}>{stats.late}</Text>
                <Text style={styles.statLabel}>Late</Text>
              </View>
            </View>

            {selectedClassId ? (
              <View style={styles.leaderboardSection}>
                <Text style={styles.sectionTitle}>STUDENT LEADERBOARD</Text>
                {studentLeaderboard.length === 0 ? (
                  <Text style={styles.emptyText}>No students found in this class.</Text>
                ) : (
                  studentLeaderboard.map((student, idx) => (
                    <TouchableOpacity 
                      key={student.id} 
                      style={styles.studentCard}
                      onPress={() => navigation.navigate('StudentProfile', { student })}
                      activeOpacity={0.7}
                    >
                      <View style={styles.studentHeader}>
                        <View style={styles.studentInfo}>
                          <View style={styles.rankBadge}>
                            <Text style={styles.rankText}>{idx + 1}</Text>
                          </View>
                          <View>
                            <Text style={styles.studentName}>{student.name}</Text>
                            <Text style={styles.studentDetails}>ID: {student.admission_number || student.id?.substring(0, 8) || 'N/A'} • Absent: {student.absent}</Text>
                          </View>
                        </View>
                        <Text style={[styles.studentPercent, { color: student.percentage >= 85 ? colors.success : student.percentage >= 70 ? colors.warning : colors.error }]}>
                          {student.percentage}%
                        </Text>
                      </View>
                      <View style={styles.miniBarContainer}>
                        <View style={[styles.miniBarFill, { width: `${student.percentage}%`, backgroundColor: student.percentage >= 85 ? colors.success : student.percentage >= 70 ? colors.warning : colors.error }]} />
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            ) : (
              <View style={styles.infoBox}>
                <Icon name="info" size={20} color={colors.primary} style={{ marginRight: 10 }} />
                <Text style={styles.infoText}>Select a specific class above to view the detailed student leaderboard.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  
  filterSection: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: 16,
  },
  pillScroll: { paddingHorizontal: 20, paddingTop: 16 },
  pillContainer: { paddingRight: 40 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginRight: 8,
    height: 38,
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  pillTextActive: { color: '#FFFFFF' },

  presetScroll: { paddingHorizontal: 20, paddingTop: 16 },
  presetContainer: { paddingRight: 40, flexDirection: 'row', gap: 8 },
  presetPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
  },
  presetPillActive: {
    backgroundColor: colors.primaryLight + '20',
    borderColor: colors.primary,
  },
  presetText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  presetTextActive: { color: colors.primary },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', borderRadius: 16, padding: 20, width: '90%', ...shadows.lg },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center', color: colors.text },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 12 },
  modalCancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  modalCancelText: { color: colors.textMuted, fontWeight: '600' },
  modalApplyBtn: { backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  modalApplyText: { color: 'white', fontWeight: 'bold' },

  scrollContent: { padding: 20, paddingBottom: 60 },
  
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    ...shadows.card,
  },
  heroInner: { alignItems: 'center', marginBottom: 20 },
  heroLabel: { fontSize: 14, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  heroValue: { fontSize: 48, fontWeight: '800', color: colors.text, letterSpacing: -1.5 },
  heroSubText: { fontSize: 14, color: colors.textMuted, marginTop: 8 },
  workingDaysBadge: {
    marginTop: 12,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  workingDaysText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  progressBarContainer: { height: 12, backgroundColor: colors.background, borderRadius: 6, overflow: 'hidden', marginTop: 12 },
  progressBarFill: { height: '100%', borderRadius: 6 },

  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  statCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, flex: 1, marginHorizontal: 4, alignItems: 'center', ...shadows.sm },
  iconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statValue: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted },

  leaderboardSection: { marginTop: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: colors.textMuted, marginBottom: 16, letterSpacing: 0.5 },
  emptyText: { fontSize: 14, color: colors.textMuted, fontStyle: 'italic', textAlign: 'center', marginTop: 20 },
  
  studentCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...shadows.sm,
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  rankText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  studentName: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 2 },
  studentDetails: { fontSize: 12, color: colors.textMuted },
  studentPercent: { fontSize: 18, fontWeight: '800' },
  miniBarContainer: { height: 6, backgroundColor: colors.background, borderRadius: 3, overflow: 'hidden' },
  miniBarFill: { height: '100%', borderRadius: 3 },

  infoBox: { flexDirection: 'row', backgroundColor: colors.primaryLight + '15', padding: 16, borderRadius: 12, alignItems: 'center' },
  infoText: { flex: 1, fontSize: 13, color: colors.primary, lineHeight: 20, fontWeight: '500' }
});

export default AttendanceReportsScreen;
