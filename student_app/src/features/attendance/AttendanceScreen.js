import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGetAttendanceQuery, useGetEventsQuery } from '../../store/apiSlice';
import { Calendar } from 'react-native-calendars';
import Icon from 'react-native-vector-icons/Feather';
import { colors, shadows } from '../../theme/colors';
import { useDrawer } from '../../navigation/DrawerContext';

const AttendanceScreen = ({ navigation }) => {
  const { openDrawer } = useDrawer();
    const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Fetch all records once; RTK Query will cache this
  const { data, isLoading, isFetching, error, refetch } = useGetAttendanceQuery();
  const { data: eventsData, refetch: refetchEvents } = useGetEventsQuery();

  const onRefresh = useCallback(async () => {
        await Promise.all([refetch(), refetchEvents()]);
      }, [refetch, refetchEvents]);

  // Backend returns data.attendance OR data.records — support both
  const allRecords = data?.attendance || data?.records || [];

  // Filter records by the currently selected month in the calendar
  const currentYearMonth = currentMonth.substring(0, 7); // e.g., "2026-06"
  const monthRecords = allRecords.filter(record => {
    const recordDateStr = (record.date || '').split('T')[0];
    return recordDateStr.startsWith(currentYearMonth);
  });

  const generateMarkedDates = () => {
    let marked = {};
    
    // Override with actual backend records
    allRecords.forEach(record => {
      const dateString = (record.date || '').split('T')[0];
      const status = record.status?.toLowerCase();
      let bgColor = colors.surface;
      if (status === 'present') bgColor = colors.success;
      else if (status === 'absent') bgColor = colors.danger;
      else if (status === 'late') bgColor = colors.warning;
      else if (status === 'holiday' || status === 'week_off' || status === 'week off') bgColor = '#8b5cf6'; // vibrant purple for holiday
      
      // Only mark if it has a specific color or override the default weekend color
      if (bgColor !== colors.surface) {
        marked[dateString] = { selected: true, selectedColor: bgColor };
      }
    });
    // Add holidays from events
    if (eventsData?.data) {
      eventsData.data.forEach(evt => {
        if (evt.category?.toLowerCase() === 'holiday' && evt.start_date) {
          const dateString = evt.start_date.split('T')[0];
          marked[dateString] = { selected: true, selectedColor: '#8b5cf6' };
        }
      });
    }

    // Ensure the actively selected date is highlighted
    if (marked[selectedDate]) {
      // It's already marked, maybe add a border or just keep it
      marked[selectedDate] = { ...marked[selectedDate], selected: true };
    } else {
      marked[selectedDate] = { selected: true, selectedColor: colors.primary };
    }

    return marked;
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const markedDates = generateMarkedDates();

  let presentCount = 0, absentCount = 0, lateCount = 0, holidayCount = 0;
  
  // Count holidays in the current month from eventsData
  if (eventsData?.data) {
    eventsData.data.forEach(evt => {
      if (evt.category?.toLowerCase() === 'holiday' && evt.start_date && evt.start_date.startsWith(currentYearMonth)) {
        holidayCount++;
      }
    });
  }

  monthRecords.forEach(record => {
    const status = record.status?.toLowerCase();
    if (status === 'present') presentCount++;
    else if (status === 'absent') absentCount++;
    else if (status === 'late') lateCount++;
    else if (status === 'holiday' || status === 'week_off' || status === 'week off') {
      // Avoid double counting if event also exists
      if (!eventsData?.data?.some(e => e.start_date === record.date && e.category?.toLowerCase() === 'holiday')) {
        holidayCount++;
      }
    }
  });

  const total = presentCount + absentCount + lateCount;
  const pct = total > 0 ? Math.round((presentCount / total) * 100) : 0;
  
  // Determine Grade and Colors
  let grade = 'N/A';
  let gradeColor = colors.textMuted || '#9ca3af';
  let gradeDesc = 'No attendance recorded yet.';

  if (total > 0) {
    if (pct >= 90) {
      grade = 'A+';
      gradeColor = colors.success;
      gradeDesc = 'Great job! Keep it up.';
    } else if (pct >= 75) {
      grade = 'B';
      gradeColor = colors.warning;
      gradeDesc = 'Good, but room for improvement.';
    } else {
      grade = 'C-';
      gradeColor = colors.danger;
      gradeDesc = 'Warning: Below 75% limit.';
    }
  }

  // --- Selected Date Details Logic ---
  const selectedRecord = allRecords.find(r => (r.date || '').split('T')[0] === selectedDate);
  const selectedEvent = eventsData?.data?.find(e => e.start_date === selectedDate && e.category?.toLowerCase() === 'holiday');
  const d = new Date(selectedDate);
  const isSelectedWeekend = d.getDay() === 0;

  let selectedTitle = '';
  let selectedDesc = '';
  let selectedIcon = '';
  let selectedColor = '';

  const getTeacherName = (record) => {
    if (record?.teacherName) return record.teacherName;
    return 'Class Teacher';
  };

  if (selectedEvent || selectedRecord?.status?.toLowerCase() === 'holiday') {
    selectedTitle = 'Holiday';
    selectedDesc = selectedEvent?.title || 'School Holiday';
    selectedIcon = 'coffee';
    selectedColor = '#8b5cf6';
  } else if (selectedRecord?.status?.toLowerCase() === 'present') {
    selectedTitle = 'Present';
    selectedDesc = `Marked by ${getTeacherName(selectedRecord)}`;
    selectedIcon = 'check-circle';
    selectedColor = colors.success;
  } else if (selectedRecord?.status?.toLowerCase() === 'absent') {
    selectedTitle = 'Absent';
    selectedDesc = `Marked by ${getTeacherName(selectedRecord)}`;
    selectedIcon = 'x-circle';
    selectedColor = colors.danger;
  } else if (selectedRecord?.status?.toLowerCase() === 'late') {
    selectedTitle = 'Late';
    selectedDesc = `Marked by ${getTeacherName(selectedRecord)}`;
    selectedIcon = 'clock';
    selectedColor = colors.warning;
  } else if (new Date(selectedDate) > new Date()) {
    selectedTitle = 'Upcoming';
    selectedDesc = 'Regular Working Day';
    selectedIcon = 'calendar';
    selectedColor = colors.textMuted;
  } else {
    selectedTitle = 'Working Day';
    selectedDesc = 'No attendance marked yet.';
    selectedIcon = 'calendar';
    selectedColor = colors.textMuted;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openDrawer} style={styles.headerBtn}>
          <Icon name="menu" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation?.navigate('Notifications')}>
          <Icon name="bell" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scroll} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching || false} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        
        {/* 1. Hero Stats */}
        <View style={styles.heroContainer}>
          <View style={styles.heroCard}>
            <View style={styles.heroContent}>
              <View>
                <Text style={styles.heroSubtitle}>
                  {new Date(currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()} SUMMARY
                </Text>
                <Text style={styles.heroTitle}>{total > 0 ? `${pct}%` : '-'}</Text>
                <Text style={styles.heroDesc}>{gradeDesc}</Text>
              </View>
              <View style={[styles.heroRing, { borderColor: gradeColor }]}>
                <Text style={[styles.heroRingText, { color: gradeColor }]}>
                  {grade}
                </Text>
              </View>
            </View>
            
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatItem}>
                <Text style={[styles.heroStatValue, { color: colors.success }]}>{presentCount}</Text>
                <Text style={styles.heroStatLabel}>Present</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <Text style={[styles.heroStatValue, { color: colors.danger }]}>{absentCount}</Text>
                <Text style={styles.heroStatLabel}>Absent</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <Text style={[styles.heroStatValue, { color: colors.warning }]}>{lateCount}</Text>
                <Text style={styles.heroStatLabel}>Late</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <Text style={[styles.heroStatValue, { color: '#8b5cf6' }]}>{holidayCount}</Text>
                <Text style={styles.heroStatLabel}>Holiday</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 2. Visual Calendar View */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Monthly Calendar</Text>
          <TouchableOpacity 
            style={styles.todayBtn}
            onPress={() => {
              const d = new Date();
              const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              setCurrentMonth(today);
              setSelectedDate(today);
            }}
          >
            <Text style={styles.todayBtnText}>Today</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.calendarContainer}>
          <Calendar
            key={currentMonth}
            current={currentMonth}
            onMonthChange={(month) => {
              setCurrentMonth(month.dateString);
            }}
            onDayPress={(day) => {
              setSelectedDate(day.dateString);
            }}
            markedDates={markedDates}
            theme={{
              todayTextColor: colors.primary,
              arrowColor: colors.primary,
              textDayFontWeight: '500',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '600',
              calendarBackground: colors.surface,
            }}
          />
        </View>

        {/* Legend */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
            <Text style={styles.legendText}>Present</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
            <Text style={styles.legendText}>Absent</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
            <Text style={styles.legendText}>Late</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#8b5cf6' }]} />
            <Text style={styles.legendText}>Holiday</Text>
          </View>
        </View>

        {/* Selected Date Details Card */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
        </View>
        <View style={styles.detailsCard}>
          <View style={[styles.detailsIconBox, { backgroundColor: selectedColor + '20' }]}>
            <Icon name={selectedIcon} size={28} color={selectedColor} />
          </View>
          <View style={styles.detailsInfo}>
            <Text style={[styles.detailsTitle, { color: selectedColor }]}>{selectedTitle}</Text>
            <Text style={styles.detailsDesc}>{selectedDesc}</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.primary },
  scroll: { flex: 1, backgroundColor: colors.background },
  centerContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerBtn: { padding: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10 },
  
  heroContainer: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    ...shadows.card,
    marginTop: 10,
  },
  heroContent: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20,
  },
  heroSubtitle: { fontSize: 13, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  heroTitle: { fontSize: 42, fontWeight: '800', color: colors.text, marginVertical: 4 },
  heroDesc: { fontSize: 13, color: colors.textMuted },
  heroRing: {
    width: 70, height: 70, borderRadius: 35,
    borderWidth: 6, justifyContent: 'center', alignItems: 'center',
  },
  heroRingText: { fontSize: 20, fontWeight: '800' },
  
  heroStatsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border,
  },
  heroStatItem: { flex: 1, alignItems: 'center' },
  heroStatValue: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  heroStatLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '500' },
  heroStatDivider: { width: 1, height: '100%', backgroundColor: colors.border },

  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 20, 
    marginBottom: 12 
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  todayBtn: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  todayBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700'
  },
  
  calendarContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16, overflow: 'hidden', marginHorizontal: 16, marginBottom: 16,
    ...shadows.card,
  },
  legendContainer: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, marginBottom: 24, columnGap: 16, rowGap: 8, justifyContent: 'center'
  },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },

  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.card,
  },
  detailsIconBox: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 16,
  },
  detailsInfo: { flex: 1 },
  detailsTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  detailsDesc: { fontSize: 14, color: colors.textMuted, fontWeight: '500' },

});

export default AttendanceScreen;

