import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import ConfettiCannon from 'react-native-confetti-cannon';
import { colors, shadows } from '../../theme/colors';
import { useGetAcademicsQuery, useGetAttendanceQuery } from '../../store/apiSlice';
import { useDrawer } from '../../navigation/DrawerContext';

const getLetterGrade = (pct) => {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  return 'D';
};

const getGPA = (pct) => {
  if (pct >= 90) return '4.0';
  if (pct >= 80) return '3.5';
  if (pct >= 70) return '3.0';
  if (pct >= 60) return '2.5';
  if (pct >= 50) return '2.0';
  return '1.0';
};

const getScoreColor = (pct) => {
  if (pct >= 80) return colors.success;
  if (pct >= 60) return colors.warning;
  return colors.danger;
};

const ProgressBar = ({ percentage, color }) => (
  <View style={styles.progressBg}>
    <View style={[styles.progressFill, { width: `${Math.min(percentage, 100)}%`, backgroundColor: color }]} />
  </View>
);

const ExpandableGradeCard = ({ grade }) => {
  const [expanded, setExpanded] = useState(false);
  const examMarks = grade.exams?.marks || 100;
  const pct = examMarks > 0 ? Math.round((grade.marks / examMarks) * 100) : 0;
  const scoreColor = getScoreColor(pct);
  const subjectInitial = (grade.exams?.name || 'E').charAt(0).toUpperCase();

  return (
    <TouchableOpacity 
      style={styles.gradeCard} 
      activeOpacity={0.8}
      onPress={() => setExpanded(!expanded)}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={[styles.gradeInitial, { backgroundColor: colors.primary + '15' }]}>
          <Text style={[styles.gradeInitialText, { color: colors.primary }]}>{subjectInitial}</Text>
        </View>
        <View style={styles.gradeInfo}>
          <View style={styles.gradeTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.gradeName}>{grade.exams?.name || 'Exam'}</Text>
              <Text style={styles.gradeType}>Exam • {grade.feedback || 'Graded'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.gradeScore, { color: scoreColor }]}>
                {grade.marks}/{examMarks}
              </Text>
              <Icon name={expanded ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} style={{ marginTop: 4 }} />
            </View>
          </View>
          {!expanded && (
            <>
              <Text style={[styles.gradePct, { color: scoreColor }]}>{pct}%</Text>
              <ProgressBar percentage={pct} color={scoreColor} />
            </>
          )}
        </View>
      </View>
      
      {expanded && (
        <View style={styles.expandedContent}>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Written Exam</Text>
            <Text style={styles.breakdownValue}>{Math.round(grade.marks * 0.8)} / {Math.round(examMarks * 0.8)}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Practical / Viva</Text>
            <Text style={styles.breakdownValue}>{Math.round(grade.marks * 0.2)} / {Math.round(examMarks * 0.2)}</Text>
          </View>
          <View style={styles.remarksBox}>
            <Text style={styles.remarksTitle}>Teacher Remarks</Text>
            <Text style={styles.remarksText}>"{pct >= 80 ? 'Excellent performance! Shows great understanding of concepts.' : 'Needs a bit more focus. Keep working hard!'}"</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const ResultScreen = ({ navigation }) => {
  const { openDrawer } = useDrawer();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState('Mid Terms');
  const terms = ['Mid Terms', 'Finals', 'Unit Tests'];

  const { data: acadData, isLoading: acadLoading, refetch: refetchAcad } = useGetAcademicsQuery();
  const { data: attData, isLoading: attLoading, refetch: refetchAtt } = useGetAttendanceQuery();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchAcad(), refetchAtt()]);
    setRefreshing(false);
  }, [refetchAcad, refetchAtt]);

  const isLoading = acadLoading || attLoading;

  const grades = acadData?.grades || [];

  // Compute overall percentage
  let overallPct = 0;
  if (grades.length > 0) {
    const total = grades.reduce((sum, g) => {
      const examMarks = g.exams?.marks || 0;
      return sum + (examMarks > 0 ? (g.marks / examMarks) * 100 : 0);
    }, 0);
    overallPct = Math.round((total / grades.length) * 10) / 10;
  }

  const isScholar = overallPct >= 90;

  const year = new Date().getFullYear();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={openDrawer} style={styles.headerBtn}>
          <Icon name="menu" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Grades</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Notifications')}>
          <Icon name="bell" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Page Header */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Academic Results</Text>
            <Text style={styles.pageSubtitle}>{year} • Progress Report</Text>
          </View>
          <TouchableOpacity style={styles.downloadBtn}>
            <Icon name="download" size={16} color={colors.primary} />
            <Text style={styles.downloadText}>PDF</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <>
            {/* Overall Performance Card */}
            <View style={styles.overallCard}>
              {isScholar && (
                <View style={styles.scholarBadge}>
                  <Icon name="award" size={14} color="#EAB308" />
                  <Text style={styles.scholarBadgeText}>Scholar</Text>
                </View>
              )}
              <Text style={styles.overallLabel}>Overall Performance</Text>
              <View style={styles.overallRow}>
                <View>
                  <Text style={styles.overallPct}>{overallPct}%</Text>
                  <View style={styles.letterRow}>
                    <Icon name="star" size={14} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.letterGrade}> Letter Grade: {getLetterGrade(overallPct)}</Text>
                  </View>
                </View>
                <View style={styles.gpaBox}>
                  <Text style={styles.gpaLabel}>GPA (Est.)</Text>
                  <Text style={styles.gpaValue}>{getGPA(overallPct)}</Text>
                </View>
              </View>
            </View>

            {/* Term Selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.termSelector}>
              {terms.map(term => (
                <TouchableOpacity 
                  key={term} 
                  style={[styles.termBtn, selectedTerm === term && styles.termBtnActive]}
                  onPress={() => setSelectedTerm(term)}
                >
                  <Text style={[styles.termText, selectedTerm === term && styles.termTextActive]}>{term}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Graded Assessments */}
            <Text style={styles.sectionTitle}>{selectedTerm} Breakdown</Text>
            {grades.length > 0 ? (
              grades.map((grade, i) => (
                <ExpandableGradeCard key={i} grade={grade} />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Icon name="file-text" size={48} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No Grades Yet</Text>
                <Text style={styles.emptyText}>Your grades will appear here once graded.</Text>
              </View>
            )}
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
      
      {isScholar && !isLoading && (
        <ConfettiCannon 
          count={150} 
          origin={{x: -10, y: 0}} 
          fadeOut={true} 
          fallSpeed={3000} 
          colors={['#3B82F6', '#10B981', '#EAB308', '#F43F5E', '#8B5CF6']}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.primary },
  scroll: { flex: 1, backgroundColor: colors.background },
  center: { paddingTop: 80, alignItems: 'center' },

  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerBtn: { padding: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10 },

  pageHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  pageSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary + '40',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  downloadText: { fontSize: 13, fontWeight: '700', color: colors.primary },

  overallCard: {
    marginHorizontal: 16, marginBottom: 20,
    backgroundColor: colors.primary, borderRadius: 24, padding: 24,
    ...shadows.heavy,
    position: 'relative'
  },
  scholarBadge: {
    position: 'absolute', top: -12, right: 24,
    backgroundColor: '#FFFBEB', flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: '#FEF3C7',
    ...shadows.card
  },
  scholarBadgeText: { color: '#B45309', fontWeight: '800', fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase' },
  overallLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600', marginBottom: 16 },
  overallRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  overallPct: { fontSize: 56, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  letterRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  letterGrade: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '600' },
  gpaBox: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 14, alignItems: 'center',
  },
  gpaLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  gpaValue: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 4 },

  termSelector: { paddingHorizontal: 16, marginBottom: 24, gap: 12 },
  termBtn: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  termBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  termText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  termTextActive: { color: '#fff' },

  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, paddingHorizontal: 20, marginBottom: 12 },

  gradeCard: {
    backgroundColor: colors.surface, marginHorizontal: 16, marginBottom: 16,
    borderRadius: 20, padding: 16,
    ...shadows.card,
  },
  gradeInitial: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  gradeInitialText: { fontSize: 18, fontWeight: '800' },
  gradeInfo: { flex: 1 },
  gradeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  gradeName: { fontSize: 16, fontWeight: '800', color: colors.text },
  gradeType: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  gradeScore: { fontSize: 18, fontWeight: '800' },
  gradePct: { fontSize: 12, fontWeight: '700', marginBottom: 8 },

  progressBg: { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },

  expandedContent: {
    marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border,
  },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  breakdownLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  breakdownValue: { fontSize: 13, color: colors.text, fontWeight: '700' },
  remarksBox: { backgroundColor: colors.background, padding: 12, borderRadius: 12, marginTop: 8 },
  remarksTitle: { fontSize: 11, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  remarksText: { fontSize: 13, color: colors.text, fontStyle: 'italic' },

  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12, paddingBottom: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 40 },
});

export default ResultScreen;
