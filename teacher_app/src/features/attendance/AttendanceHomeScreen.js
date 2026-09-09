import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/Feather';
import { Calendar } from 'react-native-calendars';
import { colors, shadows } from '../../theme/colors';
import CustomHeader from '../../components/CustomHeader';
import { useGetTeacherClassesQuery } from '../../store/apiSlice';

const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDatePretty = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, day] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${parseInt(day, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
};

const AttendanceHomeScreen = ({ navigation }) => {
  const { activeClassId } = useSelector((state) => state.app);
  const { data: classesData, isLoading, refetch, isFetching } = useGetTeacherClassesQuery();
  
  const today = useMemo(() => getTodayString(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);

  const onRefresh = React.useCallback(() => {
    refetch();
  }, [refetch]);

  const allClasses = classesData?.classes || [];
  const assignedClasses = allClasses.filter(c => c.isClassTeacher);
  const activeClass = allClasses.find(c => c.classId === activeClassId);
  const isActiveClassTeacher = activeClass ? activeClass.isClassTeacher : true;

  const dispatch = useDispatch();

  const handleSelectClass = (cls) => {
    dispatch({ type: 'app/setActiveClass', payload: cls.classId });
    navigation.navigate('AttendanceMarkingScreen', { 
      classId: cls.classId,
      className: cls.className,
      section: cls.section,
      date: selectedDate
    });
  };

  const isBackdated = selectedDate < today;

  return (
    <View style={styles.container}>
      <CustomHeader title="The Arc School" />

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>Attendance</Text>
          <Text style={styles.pageSubtitle}>Select a class to mark or view attendance</Text>
        </View>

        {/* Quick Date Selector Card */}
        <TouchableOpacity 
          style={[styles.dateSelectorCard, isBackdated && styles.dateSelectorCardBackdated]}
          onPress={() => setIsCalendarVisible(true)}
          activeOpacity={0.8}
        >
          <View style={[styles.dateIconBox, isBackdated && { backgroundColor: colors.warning + '20' }]}>
            <Icon name="calendar" size={20} color={isBackdated ? colors.warning : colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.dateLabel}>Marking Date</Text>
              {isBackdated && (
                <View style={styles.backdatedChip}>
                  <Text style={styles.backdatedChipText}>Backdated</Text>
                </View>
              )}
            </View>
            <Text style={styles.dateValue}>
              {selectedDate === today ? `Today (${formatDatePretty(today)})` : formatDatePretty(selectedDate)}
            </Text>
          </View>
          <View style={styles.changeDateBtn}>
            <Text style={styles.changeDateBtnText}>Change</Text>
            <Icon name="chevron-down" size={14} color={colors.primary} />
          </View>
        </TouchableOpacity>

        {!isActiveClassTeacher && activeClassId ? (
          <View style={[styles.emptyState, { backgroundColor: colors.danger + '10', padding: 20, borderRadius: 16, marginTop: 20 }]}>
            <Icon name="alert-triangle" size={40} color={colors.danger} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyStateText, { color: colors.danger, textAlign: 'center' }]}>
              You are not the class teacher for {activeClass?.className} {activeClass?.section ? `- ${activeClass.section}` : ''}.
            </Text>
            <Text style={[styles.emptyStateText, { fontSize: 14, marginTop: 8, textAlign: 'center' }]}>
              Only the designated Class Teacher can manage attendance. Please switch to a class you manage using the dropdown above.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>

              <TouchableOpacity 
                style={styles.actionCard} 
                onPress={() => navigation.navigate('AttendanceReportsScreen')}
                activeOpacity={0.8}
              >
                <View style={[styles.iconBox, { backgroundColor: colors.success + '15' }]}>
                  <Icon name="bar-chart-2" size={24} color={colors.success} />
                </View>
                <Text style={styles.classText}>View Class Reports</Text>
                <Icon name="chevron-right" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
            ) : assignedClasses.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>YOUR ASSIGNED CLASSES</Text>
                {assignedClasses.map((cls, index) => (
                  <TouchableOpacity key={cls.classId || index} style={styles.classCard} onPress={() => handleSelectClass(cls)} activeOpacity={0.8}>
                    <View style={styles.iconBox}>
                      <Icon name="users" size={24} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.classTitle}>Class {cls.className} {cls.section ? `- ${cls.section}` : ''}</Text>
                      <Text style={styles.classSubtitle}>
                        {isBackdated ? `Mark Past Attendance (${formatDatePretty(selectedDate)})` : 'Mark Attendance'}
                      </Text>
                    </View>
                    <Icon name="chevron-right" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Icon name="info" size={40} color={colors.textMuted} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyStateText}>No classes assigned to you.</Text>
              </View>
            )}
          </>
        )}

      </ScrollView>

      {/* Date Picker Modal */}
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

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.modalResetBtn}
                onPress={() => {
                  setSelectedDate(today);
                  setIsCalendarVisible(false);
                }}
              >
                <Text style={styles.modalResetText}>Reset to Today</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 20, paddingBottom: 60 },
  
  titleSection: { marginBottom: 16 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 15, color: colors.textMuted, marginTop: 4, fontWeight: '500' },

  dateSelectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  dateSelectorCardBackdated: {
    borderColor: colors.warning + '50',
    backgroundColor: colors.warning + '08',
  },
  dateIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  backdatedChip: {
    backgroundColor: colors.warning,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  backdatedChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.surface,
    textTransform: 'uppercase',
  },
  dateValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  changeDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.primary + '12',
  },
  changeDateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },

  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: colors.textMuted, marginBottom: 16, letterSpacing: 0.5 },
  
  classCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  classText: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
  classTitle: { fontSize: 18, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
  classSubtitle: { fontSize: 13, fontWeight: '600', color: colors.primary, marginTop: 4 },
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyStateText: { fontSize: 16, color: colors.textMuted, fontWeight: '500' },

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
  modalFooter: {
    marginTop: 12,
    alignItems: 'center',
  },
  modalResetBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  modalResetText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
});

export default AttendanceHomeScreen;
