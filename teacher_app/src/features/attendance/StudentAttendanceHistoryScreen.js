import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { colors, shadows } from '../../theme/colors';
import CustomHeader from '../../components/CustomHeader';
import MetricsFilterBar from '../../components/MetricsFilterBar';
import { useGetAttendanceQuery } from '../../store/apiSlice';

const StudentAttendanceHistoryScreen = ({ route }) => {
  const { student } = route.params;
  
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0];
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' = Newest first
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  const { data, isLoading, refetch, isFetching } = useGetAttendanceQuery({
    studentId: student.id,
    startDate,
    endDate
  });

  const onRefresh = React.useCallback(() => {
    refetch();
  }, [refetch]);

  const records = data?.records || [];

  const filteredRecords = useMemo(() => {
    let result = [...records];

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => 
        (r.status && String(r.status).toLowerCase().includes(q)) || 
        (r.remarks && r.remarks.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      const dateA = new Date(a.date || 0);
      const dateB = new Date(b.date || 0);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [records, searchQuery, sortOrder]);

  const markedDates = useMemo(() => {
    const marks = {};
    filteredRecords.forEach(record => {
      const status = String(record.status).toLowerCase();
      let dotColor = colors.success;
      if (status === 'absent') dotColor = colors.error;
      else if (status === 'late') dotColor = colors.warning;

      marks[record.date] = {
        selected: true,
        selectedColor: dotColor + '20',
        customStyles: {
          container: {
            backgroundColor: dotColor + '15',
            borderRadius: 8,
          },
          text: {
            color: dotColor,
            fontWeight: 'bold',
          }
        }
      };
    });
    return marks;
  }, [filteredRecords]);

  const stats = useMemo(() => {
    let p = 0, a = 0, l = 0;
    filteredRecords.forEach(r => {
      const s = String(r.status).toLowerCase();
      if (s === 'present') p++;
      if (s === 'absent') a++;
      if (s === 'late') l++;
    });
    return { present: p, absent: a, late: l, total: filteredRecords.length };
  }, [filteredRecords]);

  return (
    <View style={styles.container}>
      <CustomHeader title="Attendance History" showBack />
      
      <MetricsFilterBar 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        searchPlaceholder="Search status or remarks..."
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.statsRow}>
              <View style={[styles.statBox, { borderColor: colors.success }]}>
                <Text style={[styles.statNum, { color: colors.success }]}>{stats.present}</Text>
                <Text style={styles.statLabel}>Present</Text>
              </View>
              <View style={[styles.statBox, { borderColor: colors.error }]}>
                <Text style={[styles.statNum, { color: colors.error }]}>{stats.absent}</Text>
                <Text style={styles.statLabel}>Absent</Text>
              </View>
              <View style={[styles.statBox, { borderColor: colors.warning }]}>
                <Text style={[styles.statNum, { color: colors.warning }]}>{stats.late}</Text>
                <Text style={styles.statLabel}>Late</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Calendar
                markingType={'custom'}
                markedDates={markedDates}
                theme={{
                  todayTextColor: colors.primary,
                  arrowColor: colors.primary,
                  textDayFontWeight: '600',
                  textMonthFontWeight: 'bold',
                  textDayHeaderFontWeight: '600',
                }}
              />
            </View>

            <View style={styles.listSection}>
              <Text style={styles.sectionTitle}>Recent Logs</Text>
              {filteredRecords.map((r, idx) => (
                <View key={idx} style={styles.logRow}>
                  <Text style={styles.logDate}>{r.date}</Text>
                  <View style={[styles.logBadge, { 
                    backgroundColor: r.status === 'present' ? colors.success + '20' : r.status === 'absent' ? colors.error + '20' : colors.warning + '20' 
                  }]}>
                    <Text style={[styles.logStatus, {
                      color: r.status === 'present' ? colors.success : r.status === 'absent' ? colors.error : colors.warning
                    }]}>
                      {r.status ? String(r.status).toUpperCase() : 'UNKNOWN'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 20, paddingBottom: 60 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statBox: { 
    flex: 1, 
    backgroundColor: colors.surface, 
    padding: 16, 
    borderRadius: 16, 
    marginHorizontal: 4, 
    alignItems: 'center', 
    borderTopWidth: 4, 
    ...shadows.sm 
  },
  statNum: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 10,
    marginBottom: 24,
    ...shadows.card,
  },
  listSection: { marginTop: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.textMuted, marginBottom: 16, textTransform: 'uppercase' },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    ...shadows.sm
  },
  logDate: { fontSize: 15, fontWeight: '600', color: colors.text },
  logBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  logStatus: { fontSize: 12, fontWeight: '800' }
});

export default StudentAttendanceHistoryScreen;
