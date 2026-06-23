import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { Calendar } from 'react-native-calendars';
import { colors, shadows } from '../../theme/colors';
import { useGetTimetableQuery } from '../../store/apiSlice';
import { useDrawer } from '../../navigation/DrawerContext';

const getPeriodType = (subject, isBreak) => {
  if (isBreak) return 'BREAK';
  if (!subject) return 'BREAK';
  const lower = subject.toLowerCase();
  if (lower.includes('lab') || lower.includes('practical')) return 'LAB';
  if (lower.includes('tutorial') || lower.includes('study')) return 'TUTORIAL';
  return 'LECTURE';
};

const typeConfig = {
  LECTURE:  { bg: '#EEF2FF', text: colors.primary },
  BREAK:    { bg: '#F0FDF4', text: colors.success },
  LAB:      { bg: '#FEF9C3', text: '#CA8A04' },
  TUTORIAL: { bg: '#FEF3C7', text: '#D97706' },
};

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    const h = parseInt(parts[0], 10);
    const m = parts[1];
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${m} ${ampm}`;
  }
  return timeStr;
};

// Safely format 'YYYY-MM-DD' for display
const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(parts[0], parseInt(parts[1], 10) - 1, parts[2]);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

// Extract periods strictly for the selected YYYY-MM-DD date
const extractPeriodsForDate = (timeTables, targetDateStr) => {
  if (!timeTables || timeTables.length === 0) return [];
  const periods = [];
  timeTables.forEach(classObj => {
    const dates = classObj.dates || {};
    // Check if there are periods explicitly for targetDateStr
    if (dates[targetDateStr]) {
      dates[targetDateStr].forEach(p => periods.push({ ...p, _date: targetDateStr }));
    }
  });
  // Sort by time_slot
  return periods.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
};

const TimetableScreen = ({ navigation }) => {
  const { openDrawer } = useDrawer();
  
  // Safely get today's date string 'YYYY-MM-DD' without timezone shifts
  const d = new Date();
  const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useGetTimetableQuery();

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const timeTables = data?.timeTables || [];
  const dayPeriods = extractPeriodsForDate(timeTables, selectedDate);

  // Mark the selected date and add dots for dates with classes
  const markedDates = {
    [selectedDate]: { selected: true, selectedColor: colors.primary },
  };

  // Add small dots on the calendar for days that have classes
  timeTables.forEach(classObj => {
    const dates = classObj.dates || {};
    Object.keys(dates).forEach(dateStr => {
      if (dateStr !== selectedDate && dates[dateStr]?.length > 0) {
        markedDates[dateStr] = { ...markedDates[dateStr], marked: true, dotColor: colors.primary };
      } else if (dateStr === selectedDate && dates[dateStr]?.length > 0) {
        markedDates[dateStr] = { ...markedDates[dateStr], marked: true, dotColor: '#fff' };
      }
    });
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openDrawer} style={styles.headerBtn}>
          <Icon name="menu" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Timetable</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Notifications')}>
          <Icon name="bell" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ height: 20 }} />

        {/* Calendar View */}
        <View style={styles.calendarContainer}>
          <Calendar
            key={selectedDate}
            current={selectedDate}
            onDayPress={(day) => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            theme={{
              backgroundColor: colors.surface,
              calendarBackground: colors.surface,
              textSectionTitleColor: colors.textMuted,
              selectedDayBackgroundColor: colors.primary,
              selectedDayTextColor: '#ffffff',
              todayTextColor: colors.primary,
              dayTextColor: colors.text,
              textDisabledColor: colors.border,
              dotColor: colors.primary,
              selectedDotColor: '#ffffff',
              arrowColor: colors.primary,
              monthTextColor: colors.text,
              indicatorColor: colors.primary,
              textDayFontWeight: '500',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '600',
              textDayFontSize: 15,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 13,
            }}
          />
        </View>

        <Text style={styles.scheduleHeader}>
          Schedule for {formatDisplayDate(selectedDate)}
        </Text>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : dayPeriods.length > 0 ? (
          <View style={styles.periodList}>
            {dayPeriods.map((period, i) => {
              const pType = getPeriodType(period.subject, period.isBreak);
              const tc = typeConfig[pType] || typeConfig.LECTURE;
              return (
                <View key={i} style={styles.periodCard}>
                  <View style={[styles.periodAccent, { backgroundColor: tc.text }]} />
                  <View style={styles.periodContent}>
                    <View style={styles.periodTop}>
                      <View style={[styles.typeBadge, { backgroundColor: tc.bg }]}>
                        <Text style={[styles.typeText, { color: tc.text }]}>{pType}</Text>
                      </View>
                      <View style={styles.timeRow}>
                        <Icon name="clock" size={13} color={colors.textMuted} />
                        <Text style={styles.timeText}>  {formatTime(period.time)}</Text>
                      </View>
                    </View>
                    <Text style={[styles.subjectName, pType === 'BREAK' && styles.subjectNameMuted]}>
                      {period.subject || 'Free Period'}
                    </Text>
                    
                    <View style={{ gap: 4 }}>
                      {(() => {
                        // Extract name, avoiding raw string IDs if possible
                        const name = period.teacherName || period.teacher_name || period.employee_name || period.invigilator_name || period.invigilatorName || period.invigilator?.name || period.teacher?.name || period.faculty?.name;
                        
                        if (!name) return null;
                        return (
                          <View style={styles.roomRow}>
                            <Icon name="user" size={13} color={colors.textMuted} />
                            <Text style={styles.roomText}>  {name}</Text>
                          </View>
                        );
                      })()}
                      
                      <View style={styles.roomRow}>
                        <Icon name="map-pin" size={13} color={colors.textMuted} />
                        <Text style={styles.roomText}>  Room: {period.roomNumber || period.room || 'TBA'}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48 }}>☀️</Text>
            <Text style={styles.emptyTitle}>No Classes Scheduled</Text>
            <Text style={styles.emptyText}>Enjoy your day off!</Text>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.primary },
  scroll: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },

  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerBtn: { padding: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10 },

  calendarContainer: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    ...shadows.card,
    marginBottom: 20,
  },
  scheduleHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginHorizontal: 20,
    marginBottom: 12,
  },

  periodList: { paddingHorizontal: 16, gap: 10 },
  periodCard: {
    backgroundColor: colors.surface, borderRadius: 16,
    flexDirection: 'row', overflow: 'hidden', ...shadows.card,
  },
  periodAccent: { width: 4 },
  periodContent: { flex: 1, padding: 16 },
  periodTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  timeRow: { flexDirection: 'row', alignItems: 'center' },
  timeText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  subjectName: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 6 },
  subjectNameMuted: { color: colors.textMuted, fontWeight: '500' },
  roomRow: { flexDirection: 'row', alignItems: 'center' },
  roomText: { fontSize: 12, color: colors.textMuted },

  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 14, color: colors.textMuted },
});

export default TimetableScreen;
