import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, RefreshControl, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useSelector } from 'react-redux';
import { Calendar } from 'react-native-calendars';
import { useGetClassStudentsQuery, useSubmitBulkAttendanceMutation, useGetAttendanceQuery } from '../../store/apiSlice';
import { colors, shadows } from '../../theme/colors';
import CustomModal from '../../components/CustomModal';
import UserAvatar from '../../components/UserAvatar';

const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getYesterdayString = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDatePretty = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, day] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${parseInt(day, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
};

const AttendanceMarkingScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  
  const { activeClassId, availableClasses } = useSelector((state) => state.app);
  const routeClassId = route.params?.classId;
  const classId = activeClassId || routeClassId;
  
  const currentClass = availableClasses?.find(c => c.classId === classId) || { className: route.params?.className, section: route.params?.section };
  const className = currentClass.className;
  const section = currentClass.section;

  const today = useMemo(() => getTodayString(), []);
  const yesterday = useMemo(() => getYesterdayString(), []);
  
  const [selectedDate, setSelectedDate] = useState(route.params?.date || today);
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);

  const { data: studentsData, isLoading: loadingStudents, refetch: refetchStudents, isFetching: fetchingStudents } = useGetClassStudentsQuery(classId);
  
  const { data: attendanceData, isLoading: loadingAttendance, refetch: refetchAttendance, isFetching: fetchingAttendance } = useGetAttendanceQuery(
    { classId, startDate: selectedDate, endDate: selectedDate },
    { skip: !classId }
  );

  const onRefresh = React.useCallback(() => {
    refetchStudents();
    refetchAttendance();
  }, [refetchStudents, refetchAttendance]);

  const isRefreshing = fetchingStudents || fetchingAttendance;

  const [students, setStudents] = useState([]);
  const [submitBulkAttendance, { isLoading: saving }] = useSubmitBulkAttendanceMutation();
  const [modalState, setModalState] = useState({ visible: false, type: 'info', title: '', message: '', onSuccess: null });

  const existingRecords = attendanceData?.records || [];
  const isAlreadyMarked = existingRecords.length > 0;
  const isBackdated = selectedDate < today;

  useEffect(() => {
    if (studentsData?.students) {
      const records = attendanceData?.records || [];
      const merged = studentsData.students.map(s => {
        const record = records.find(r => r.student_id === s.id);
        return { 
          ...s, 
          _id: s.id, 
          status: record ? record.status : 'present' 
        };
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

  const handlePrevDay = () => {
    const curr = new Date(selectedDate);
    curr.setDate(curr.getDate() - 1);
    const prevStr = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`;
    setSelectedDate(prevStr);
  };

  const handleNextDay = () => {
    if (selectedDate >= today) return;
    const curr = new Date(selectedDate);
    curr.setDate(curr.getDate() + 1);
    const nextStr = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`;
    setSelectedDate(nextStr);
  };

  const handleSubmit = async () => {
    try {
      const payload = students.map(s => ({
        student_id: s._id,
        date: selectedDate,
        status: s.status
      }));
      
      const res = await submitBulkAttendance(payload).unwrap();
      
      if (res.success) {
        setModalState({
          visible: true,
          type: 'success',
          title: 'Success',
          message: isBackdated 
            ? `Attendance for ${formatDatePretty(selectedDate)} updated successfully!`
            : 'Attendance saved successfully!',
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
        message: error?.data?.message || 'An error occurred while saving attendance',
        onSuccess: null
      });
    }
  };

  const StatusPill = ({ currentStatus, targetStatus, onPress, activeColor, activeBg, label }) => {
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

  const dateLabel = useMemo(() => {
    if (selectedDate === today) return `Today, ${formatDatePretty(selectedDate)}`;
    if (selectedDate === yesterday) return `Yesterday, ${formatDatePretty(selectedDate)}`;
    return formatDatePretty(selectedDate);
  }, [selectedDate, today, yesterday]);

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
            <TouchableOpacity style={styles.iconButton} onPress={handleMarkAllPresent} title="Mark All Present">
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

      {/* Interactive Date Navigation Bar */}
      <View style={styles.dateNavContainer}>
        <TouchableOpacity 
          style={styles.dateNavArrow} 
          onPress={handlePrevDay}
          activeOpacity={0.7}
        >
          <Icon name="chevron-left" size={22} color={colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.dateSelectorBtn, isBackdated && styles.dateSelectorBtnBackdated]} 
          onPress={() => setIsCalendarVisible(true)}
          activeOpacity={0.8}
        >
          <Icon name="calendar" size={16} color={isBackdated ? colors.warning : colors.primary} />
          <Text style={[styles.dateSelectorText, isBackdated && { color: colors.warning }]}>
            {dateLabel}
          </Text>
          {isBackdated && (
            <View style={styles.backdatedBadge}>
              <Text style={styles.backdatedBadgeText}>Past Date</Text>
            </View>
          )}
          <Icon name="chevron-down" size={14} color={isBackdated ? colors.warning : colors.primary} style={{ marginLeft: 4 }} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.dateNavArrow, selectedDate >= today && styles.dateNavArrowDisabled]} 
          onPress={handleNextDay}
          disabled={selectedDate >= today}
          activeOpacity={0.7}
        >
          <Icon 
            name="chevron-right" 
            size={22} 
            color={selectedDate >= today ? colors.borderLight : colors.primary} 
          />
        </TouchableOpacity>
      </View>

      {/* Status Context Banner */}
      <View style={[
        styles.contextBanner,
        isAlreadyMarked 
          ? { backgroundColor: colors.success + '12', borderColor: colors.success + '30' }
          : { backgroundColor: colors.primary + '10', borderColor: colors.primary + '25' }
      ]}>
        <Icon 
          name={isAlreadyMarked ? "check-circle" : "info"} 
          size={14} 
          color={isAlreadyMarked ? colors.success : colors.primary} 
        />
        <Text style={[
          styles.contextBannerText, 
          { color: isAlreadyMarked ? colors.success : colors.primary }
        ]}>
          {isAlreadyMarked 
            ? `Attendance already recorded for this date. You can edit & submit.`
            : `No attendance recorded yet for this date. Mark and submit below.`}
        </Text>
      </View>

      {loadingStudents || loadingAttendance ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        >
          {students.map((student) => {
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
                  <UserAvatar
                    url={student.avatar_url}
                    name={student.name || 'S'}
                    size={42}
                    placeholderBg={isPresent ? colors.success + '15' : isAbsent ? colors.danger + '15' : isLate ? colors.warning + '15' : colors.primary + '15'}
                    placeholderColor={isPresent ? colors.success : isAbsent ? colors.danger : isLate ? colors.warning : colors.primary}
                    style={{ marginRight: 12 }}
                  />
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <Text style={styles.studentRoll}>ID: {student.roll_number || student.admission_number || student.id?.substring(0, 8) || 'N/A'}</Text>
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
              <Icon name={isAlreadyMarked ? "refresh-cw" : "check-circle"} size={20} color={colors.surface} style={{ marginRight: 8 }} />
              <Text style={styles.submitText}>
                {isAlreadyMarked ? "Update Attendance" : "Submit Attendance"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Calendar Picker Modal */}
      <Modal 
        visible={isCalendarVisible} 
        transparent 
        animationType="fade"
        onRequestClose={() => setIsCalendarVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Attendance Date</Text>
              <TouchableOpacity onPress={() => setIsCalendarVisible(false)} style={styles.modalCloseBtn}>
                <Icon name="x" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Quick Presets */}
            <View style={styles.quickPresetRow}>
              <TouchableOpacity 
                style={[styles.presetChip, selectedDate === today && styles.presetChipActive]}
                onPress={() => {
                  setSelectedDate(today);
                  setIsCalendarVisible(false);
                }}
              >
                <Text style={[styles.presetChipText, selectedDate === today && styles.presetChipTextActive]}>Today</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.presetChip, selectedDate === yesterday && styles.presetChipActive]}
                onPress={() => {
                  setSelectedDate(yesterday);
                  setIsCalendarVisible(false);
                }}
              >
                <Text style={[styles.presetChipText, selectedDate === yesterday && styles.presetChipTextActive]}>Yesterday</Text>
              </TouchableOpacity>
            </View>

            <Calendar
              current={selectedDate}
              maxDate={today}
              markedDates={{
                [selectedDate]: { selected: true, selectedColor: colors.primary, textColor: colors.surface }
              }}
              onDayPress={(day) => {
                if (day.dateString <= today) {
                  setSelectedDate(day.dateString);
                  setIsCalendarVisible(false);
                }
              }}
              theme={{
                todayTextColor: colors.primary,
                arrowColor: colors.primary,
                selectedDayBackgroundColor: colors.primary,
                selectedDayTextColor: colors.surface,
              }}
            />
          </View>
        </View>
      </Modal>

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
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    ...shadows.card,
    zIndex: 10,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.surface, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginTop: 2 },
  iconButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12 },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 4,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.surface },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600', textTransform: 'uppercase', marginTop: 2 },

  dateNavContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
  },
  dateNavArrow: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  dateNavArrowDisabled: {
    opacity: 0.35,
  },
  dateSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight + '15',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  dateSelectorBtnBackdated: {
    backgroundColor: colors.warning + '15',
    borderColor: colors.warning + '40',
  },
  dateSelectorText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 6,
    marginRight: 4,
  },
  backdatedBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  backdatedBadgeText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  contextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  contextBannerText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 120 },

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
    width: 46, height: 46, borderRadius: 23,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 19, fontWeight: '800' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 2 },
  studentRoll: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  
  statusGroup: { flexDirection: 'row', alignItems: 'center' },
  statusPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusPillText: { fontSize: 13, fontWeight: '800' },

  footerContainer: {
    position: 'absolute',
    bottom: 24, left: 20, right: 20,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.button,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitText: { color: colors.surface, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },

  // Calendar Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 18,
    ...shadows.card,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  modalCloseBtn: {
    padding: 6,
  },
  quickPresetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  presetChipActive: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  presetChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});

export default AttendanceMarkingScreen;
