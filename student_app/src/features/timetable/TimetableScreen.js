import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { Calendar } from 'react-native-calendars';
import { theme } from '../../theme/theme';
import { useGetTimetableQuery } from '../../store/apiSlice';
import { useDrawer } from '../../navigation/DrawerContext';

const getSubjectConfig = (subject, isBreak) => {
  if (isBreak) return { type: 'BREAK', bg: '#F0FDF4', text: theme.colors.success, icon: 'coffee' };
  if (!subject) return { type: 'FREE', bg: '#F8FAFC', text: theme.colors.textMuted, icon: 'sun' };
  
  const lower = subject.toLowerCase();
  if (lower.includes('math')) return { type: 'MATH', bg: '#EEF2FF', text: '#4F46E5', icon: 'pie-chart' }; 
  if (lower.includes('sci') || lower.includes('phy') || lower.includes('chem') || lower.includes('bio')) return { type: 'SCIENCE', bg: '#FEF9C3', text: '#CA8A04', icon: 'activity' }; 
  if (lower.includes('eng') || lower.includes('lit')) return { type: 'LANGUAGE', bg: '#FCE7F3', text: '#DB2777', icon: 'book-open' }; 
  if (lower.includes('comp') || lower.includes('it')) return { type: 'TECH', bg: '#E0F2FE', text: '#0284C7', icon: 'monitor' }; 
  if (lower.includes('hist') || lower.includes('geo')) return { type: 'HUMAN', bg: '#FFEDD5', text: '#EA580C', icon: 'globe' }; 
  if (lower.includes('art') || lower.includes('draw')) return { type: 'ARTS', bg: '#F3E8FF', text: '#9333EA', icon: 'pen-tool' }; 
  if (lower.includes('sport') || lower.includes('pe')) return { type: 'SPORTS', bg: '#DCFCE7', text: '#16A34A', icon: 'dribbble' }; 
  
  return { type: 'LECTURE', bg: theme.colors.primary + '15', text: theme.colors.primary, icon: 'book' };
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

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(parts[0], parseInt(parts[1], 10) - 1, parts[2]);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const extractPeriodsForDate = (timeTables, targetDateStr) => {
  if (!timeTables || timeTables.length === 0) return [];
  const periods = [];
  timeTables.forEach(classObj => {
    const dates = classObj.dates || {};
    if (dates[targetDateStr]) {
      dates[targetDateStr].forEach(p => periods.push({ ...p, _date: targetDateStr }));
    }
  });
  return periods.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
};

const TimetableScreen = ({ route, navigation }) => {
  const { openDrawer } = useDrawer();
  
  const d = new Date();
  const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  
  const initialDate = route?.params?.date || todayStr;
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const { data, isLoading, isFetching, refetch } = useGetTimetableQuery();

  useEffect(() => {
    if (route?.params?.date) {
      setSelectedDate(route.params.date);
    }
  }, [route?.params?.date]);

  const onRefresh = async () => {
    await refetch();
  };

  const timeTables = data?.timeTables || [];
  const dayPeriods = extractPeriodsForDate(timeTables, selectedDate);

  const markedDates = {
    [selectedDate]: { selected: true, selectedColor: theme.colors.primary },
  };

  timeTables.forEach(classObj => {
    const dates = classObj.dates || {};
    Object.keys(dates).forEach(dateStr => {
      if (dateStr !== selectedDate && dates[dateStr]?.length > 0) {
        markedDates[dateStr] = { ...markedDates[dateStr], marked: true, dotColor: theme.colors.primary };
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
        refreshControl={<RefreshControl refreshing={isFetching || false} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
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
              backgroundColor: theme.colors.surface,
              calendarBackground: theme.colors.surface,
              textSectionTitleColor: theme.colors.textMuted,
              selectedDayBackgroundColor: theme.colors.primary,
              selectedDayTextColor: '#ffffff',
              todayTextColor: theme.colors.primary,
              dayTextColor: theme.colors.text,
              textDisabledColor: theme.colors.border,
              dotColor: theme.colors.primary,
              selectedDotColor: '#ffffff',
              arrowColor: theme.colors.primary,
              monthTextColor: theme.colors.text,
              indicatorColor: theme.colors.primary,
              textDayFontFamily: theme.typography.fontFamily.medium,
              textMonthFontFamily: theme.typography.fontFamily.bold,
              textDayHeaderFontFamily: theme.typography.fontFamily.bold,
              textDayFontSize: 15,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 13,
            }}
          />
        </View>

        <Text style={styles.scheduleHeader}>
          {formatDisplayDate(selectedDate)}
        </Text>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
          </View>
        ) : dayPeriods.length > 0 ? (
          <View style={styles.periodList}>
            {dayPeriods.map((period, i) => {
              const config = getSubjectConfig(period.subject, period.isBreak);
              const teacherName = period.teacherName || period.teacher_name || period.employee_name || period.invigilator_name || period.invigilatorName || period.invigilator?.name || period.teacher?.name || period.faculty?.name;

              return (
                <View key={i} style={[styles.periodCard, config.type === 'BREAK' && styles.periodCardMuted]}>
                  <View style={[styles.iconBox, { backgroundColor: config.bg }]}>
                    <Icon name={config.icon} size={24} color={config.text} />
                  </View>
                  
                  <View style={styles.periodContent}>
                    <View style={styles.periodTopRow}>
                      <Text style={[styles.subjectName, config.type === 'BREAK' && styles.subjectNameMuted]} numberOfLines={1}>
                        {period.subject || 'Free Period'}
                      </Text>
                      <View style={[styles.typeBadge, { backgroundColor: config.bg }]}>
                         <Text style={[styles.typeText, { color: config.text }]}>{config.type}</Text>
                      </View>
                    </View>

                    <View style={styles.periodDetails}>
                      <View style={styles.detailRow}>
                        <Icon name="clock" size={12} color={theme.colors.textMuted} />
                        <Text style={styles.detailText}>{formatTime(period.time)}</Text>
                      </View>
                      
                      {!period.isBreak && period.roomNumber && (
                        <View style={styles.detailRow}>
                          <Icon name="map-pin" size={12} color={theme.colors.textMuted} />
                          <Text style={styles.detailText}>Room: {period.roomNumber}</Text>
                        </View>
                      )}
                      
                      {!period.isBreak && teacherName && (
                        <View style={styles.detailRow}>
                          <Icon name="user" size={12} color={theme.colors.textMuted} />
                          <Text style={styles.detailText}>{teacherName}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
               <Icon name="coffee" size={40} color={theme.colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No Classes Scheduled</Text>
            <Text style={styles.emptyText}>Enjoy your day off!</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.primary },
  scroll: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },

  header: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontFamily: theme.typography.fontFamily.bold },
  headerBtn: { padding: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10 },

  calendarContainer: {
    marginHorizontal: 16,
    borderRadius: theme.layout.borderRadius.xl,
    overflow: 'hidden',
    ...theme.shadows.card,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  scheduleHeader: {
    fontSize: 18,
    fontFamily: theme.typography.fontFamily.heading,
    color: theme.colors.text,
    marginHorizontal: 20,
    marginBottom: 16,
  },

  periodList: { paddingHorizontal: 16, gap: 16 },
  periodCard: {
    backgroundColor: theme.colors.surface, 
    borderRadius: theme.layout.borderRadius.xl,
    flexDirection: 'row', 
    padding: 16,
    ...theme.shadows.card,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    alignItems: 'center',
    gap: 16
  },
  periodCardMuted: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    elevation: 0,
    shadowOpacity: 0
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodContent: { flex: 1 },
  periodTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  subjectName: { 
    fontSize: 16, 
    fontFamily: theme.typography.fontFamily.heading, 
    color: theme.colors.text, 
    flex: 1,
    marginRight: 8
  },
  subjectNameMuted: { color: theme.colors.textMuted },
  
  typeBadge: { 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12 
  },
  typeText: { 
    fontSize: 10, 
    fontFamily: theme.typography.fontFamily.bold, 
    letterSpacing: 0.5 
  },
  
  periodDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailRow: { 
    flexDirection: 'row', 
    alignItems: 'center',
    gap: 4
  },
  detailText: { 
    fontSize: 12, 
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.medium
  },

  emptyState: { 
    alignItems: 'center', 
    paddingTop: 40, 
    gap: 12 
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  emptyTitle: { 
    fontSize: 18, 
    fontFamily: theme.typography.fontFamily.heading, 
    color: theme.colors.text 
  },
  emptyText: { 
    fontSize: 14, 
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.medium
  },
});

export default TimetableScreen;
