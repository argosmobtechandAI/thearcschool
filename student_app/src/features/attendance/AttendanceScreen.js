import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useGetAttendanceQuery } from '../../store/apiSlice';
import { Calendar } from 'react-native-calendars';
import { colors, shadows } from '../../theme/colors';

const AttendanceScreen = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().split('T')[0]);
  const { data, isLoading, error } = useGetAttendanceQuery({
    startDate: currentMonth.substring(0, 8) + '01',
    endDate: currentMonth.substring(0, 8) + '31',
  });

  const generateMarkedDates = () => {
    let marked = {};
    if (data?.records) {
      data.records.forEach(record => {
        const dateString = record.date.split('T')[0];
        const status = record.status?.toLowerCase();
        
        let bgColor = colors.surface;
        if (status === 'present') bgColor = colors.success;
        else if (status === 'absent') bgColor = colors.danger;
        else if (status === 'late') bgColor = colors.warning;
        else if (status === 'holiday') bgColor = colors.primaryLight;

        marked[dateString] = {
          selected: true,
          selectedColor: bgColor,
        };
      });
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
  
  // Calculate summary for current month
  let presentCount = 0;
  let absentCount = 0;
  if (data?.records) {
    data.records.forEach(record => {
      const status = record.status?.toLowerCase();
      if (status === 'present' || status === 'late') presentCount++;
      else if (status === 'absent') absentCount++;
    });
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Attendance History</Text>
      </View>

      <View style={styles.content}>
        {/* Calendar */}
        <View style={styles.calendarContainer}>
          <Calendar
            current={currentMonth}
            onMonthChange={(month) => {
              setCurrentMonth(month.dateString);
            }}
            markedDates={markedDates}
            theme={{
              todayTextColor: colors.primary,
              arrowColor: colors.primary,
              textDayFontWeight: '500',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '600',
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
            <View style={[styles.legendDot, { backgroundColor: colors.primaryLight }]} />
            <Text style={styles.legendText}>Holiday</Text>
          </View>
        </View>

        {/* Monthly Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Monthly Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
              <Text style={[styles.summaryCount, { color: colors.success }]}>{presentCount}</Text>
              <Text style={styles.summaryLabel}>Days Present</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryBox}>
              <Text style={[styles.summaryCount, { color: colors.danger }]}>{absentCount}</Text>
              <Text style={styles.summaryLabel}>Days Absent</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  content: {
    padding: 20,
  },
  calendarContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    ...shadows.card,
    marginBottom: 20,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '45%',
    marginBottom: 12,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    ...shadows.card,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryBox: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  summaryCount: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
});

export default AttendanceScreen;
