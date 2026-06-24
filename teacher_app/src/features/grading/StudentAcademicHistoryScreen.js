import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions, RefreshControl } from 'react-native';
import { colors, shadows } from '../../theme/colors';
import CustomHeader from '../../components/CustomHeader';
import MetricsFilterBar from '../../components/MetricsFilterBar';
import { useGetStudentGradesQuery } from '../../store/apiSlice';

const { width } = Dimensions.get('window');

const StudentAcademicHistoryScreen = ({ route }) => {
  const { student } = route.params;
  const { data, isLoading, refetch, isFetching } = useGetStudentGradesQuery(student.id);
  const grades = data?.grades || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' = Newest first
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const onRefresh = React.useCallback(() => {
    refetch();
  }, [refetch]);

  const filteredGrades = useMemo(() => {
    let result = [...grades];

    // Filter by Date Range
    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      result = result.filter(g => {
        if (!g.date) return false;
        const d = new Date(g.date);
        return d >= s && d <= e;
      });
    }

    // Filter by Search Query (Exam Title or Subject)
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(g => 
        (g.title && g.title.toLowerCase().includes(q)) || 
        (g.subject && g.subject.toLowerCase().includes(q))
      );
    }

    // Sort Order
    result.sort((a, b) => {
      const dateA = new Date(a.date || 0);
      const dateB = new Date(b.date || 0);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [grades, searchQuery, sortOrder, startDate, endDate]);

  const { chartData, average } = useMemo(() => {
    if (!filteredGrades.length) return { chartData: [], average: 0 };
    
    // For chart and average, we want to look at the filtered grades
    const sorted = [...filteredGrades].sort((a,b) => new Date(a.date || 0) - new Date(b.date || 0));
    
    let totalPct = 0;
    let count = 0;
    
    const mapped = sorted.map(g => {
      const pct = g.maxMarks ? (g.marks / g.maxMarks) * 100 : 0;
      if (g.maxMarks && g.marks !== null) {
        totalPct += pct;
        count++;
      }
      return {
        label: g.subject || 'Exam',
        pct: Math.min(Math.max(pct, 0), 100),
        marks: g.marks,
        max: g.maxMarks,
        title: g.title,
        gradeColor: g.gradeColor || colors.primary,
        grade: g.grade || "N/A"
      };
    });

    return { 
      chartData: mapped.slice(-8), // Last 8 for the chart
      average: count > 0 ? (totalPct / count).toFixed(1) : 0 
    };
  }, [filteredGrades]);

  return (
    <View style={styles.container}>
      <CustomHeader title="Academic History" showBack />
      
      <MetricsFilterBar 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        searchPlaceholder="Search exams or subjects..."
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
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Overall Average</Text>
              <Text style={styles.summaryValue}>{average}%</Text>
            </View>

            {chartData.length > 0 && (
              <View style={styles.chartCard}>
                <Text style={styles.sectionTitle}>Recent Performance</Text>
                <View style={styles.hChartContainer}>
                  {chartData.map((d, i) => (
                    <View key={i} style={styles.hBarRow}>
                      <View style={styles.hBarLabelContainer}>
                        <Text style={styles.hBarLabel} numberOfLines={1}>{d.label}</Text>
                        <Text style={[styles.hBarValue, { color: d.gradeColor }]}>{d.pct.toFixed(0)}%</Text>
                      </View>
                      <View style={styles.hBarBg}>
                        <View style={[styles.hBarFill, { width: `${d.pct}%`, backgroundColor: d.gradeColor }]} />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.listSection}>
              <Text style={styles.sectionTitle}>All Exams</Text>
              {filteredGrades.map((g, idx) => (
                <View key={idx} style={styles.logRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.logTitle}>{g.title || 'Exam'}</Text>
                    <Text style={styles.logSubject}>{g.subject} • {g.date}</Text>
                  </View>
                  <View style={[styles.scoreBadge, { backgroundColor: g.gradeColor ? `${g.gradeColor}15` : '#f3f4f6' }]}>
                    <Text style={[styles.scoreText, { color: g.gradeColor || colors.textDark, fontWeight: '700' }]}>
                      {g.grade || 'N/A'}
                    </Text>
                    <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2, fontWeight: '500' }}>
                      {g.marks != null ? `${g.marks}/${g.maxMarks}` : '-'}
                    </Text>
                  </View>
                </View>
              ))}
              {filteredGrades.length === 0 && (
                <Text style={{ textAlign: 'center', color: colors.textMuted, marginTop: 20 }}>No exam records found matching the filters.</Text>
              )}
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
  summaryCard: {
    backgroundColor: colors.primary,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 20,
    ...shadows.card,
  },
  summaryTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' },
  summaryValue: { color: '#fff', fontSize: 36, fontWeight: '800' },
  chartCard: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    ...shadows.card,
  },
  hChartContainer: {
    gap: 12,
  },
  hBarRow: {
    marginBottom: 4,
  },
  hBarLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  hBarLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textDark,
    flex: 1,
    paddingRight: 8,
  },
  hBarValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  hBarBg: {
    height: 8,
    backgroundColor: colors.borderLight,
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
  },
  hBarFill: {
    height: '100%',
    borderRadius: 4,
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
  logTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  logSubject: { fontSize: 12, color: colors.textMuted },
  scoreBadge: { backgroundColor: colors.primary + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  scoreText: { color: colors.primary, fontWeight: '800', fontSize: 14 }
});

export default StudentAcademicHistoryScreen;
