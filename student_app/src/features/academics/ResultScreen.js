import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import ConfettiCannon from 'react-native-confetti-cannon';
import { colors, shadows } from '../../theme/colors';
import { useGetAcademicsQuery, useGetDashboardQuery } from '../../store/apiSlice';
import { useDrawer } from '../../navigation/DrawerContext';
import { exportToPDF } from '../../utils/exportUtils';
import AppModal from '../../components/AppModal';

const getLetterGrade = (pct) => {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  return 'D';
};



const ProgressBar = ({ percentage, color }) => (
  <View style={styles.progressBg}>
    <View style={[styles.progressFill, { width: `${Math.min(percentage, 100)}%`, backgroundColor: color }]} />
  </View>
);

const GradeCard = ({ grade }) => {
  const subjectInitial = (grade.subject || 'E').charAt(0).toUpperCase();

  return (
    <View style={styles.gradeCard}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={[styles.gradeInitial, { backgroundColor: colors.primary + '15' }]}>
          <Text style={[styles.gradeInitialText, { color: colors.primary }]}>{subjectInitial}</Text>
        </View>
        <View style={styles.gradeInfo}>
          <View style={styles.gradeTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.gradeName}>{grade.subject}</Text>
              <Text style={styles.gradeType}>{grade.title} • {grade.date || 'Graded'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <View style={[styles.scoreBadge, { backgroundColor: grade.gradeColor + '15' }]}>
                <Text style={[styles.scoreBadgeText, { color: grade.gradeColor }]}>{grade.grade}</Text>
              </View>
              <Text style={styles.gradeScore}>
                {grade.marks !== null ? grade.marks : '-'}/{grade.maxMarks}
              </Text>
            </View>
          </View>
          <Text style={[styles.gradePct, { color: grade.gradeColor }]}>{grade.percentage}%</Text>
          <ProgressBar percentage={grade.percentage} color={grade.gradeColor} />
        </View>
      </View>
    </View>
  );
};

const ResultScreen = ({ navigation }) => {
  const { openDrawer } = useDrawer();
  
  // Dynamic Academic Year Helpers (Hermes compatible)
  const getAcademicYearFromDate = (dateStr) => {
    if (!dateStr) return 'Unknown';
    const parts = dateStr.split('-');
    if (parts.length < 3) return 'Unknown';
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    if (month >= 4) {
      return `${year}-${year + 1}`;
    } else {
      return `${year - 1}-${year}`;
    }
  };

  const getCurrentAcademicYear = () => {
    const d = new Date();
    let year = d.getFullYear();
    if (d.getMonth() < 3) year -= 1;
    return `${year}-${year + 1}`;
  };

  const currentAcademicYear = useMemo(() => getCurrentAcademicYear(), []);
  const currentYearStart = useMemo(() => parseInt(currentAcademicYear.split('-')[0]), [currentAcademicYear]);

  const [selectedYear, setSelectedYear] = useState(currentAcademicYear);
  const [selectedTerm, setSelectedTerm] = useState(null);

  const [showTermModal, setShowTermModal] = useState(false);
  const [showYearModal, setShowYearModal] = useState(false);
  const [modalState, setModalState] = useState({ visible: false, type: 'info', title: '', message: '' });
  const [isExporting, setIsExporting] = useState(false);

  // Queries
  const { data: acadData, isLoading: acadLoading, refetch: refetchAcad, isFetching } = useGetAcademicsQuery(selectedYear);
  const { data: dashData } = useGetDashboardQuery();

  const profile = dashData?.data?.profile;
  const classInfo = dashData?.data?.classInfo;
  const grades = acadData?.grades || [];

  const onRefresh = useCallback(() => {
    refetchAcad();
  }, [refetchAcad]);

  // Derive dynamic list of academic years from existing grades
  const dynamicYears = useMemo(() => {
    const years = new Set();
    grades.forEach(g => {
      const ay = getAcademicYearFromDate(g.date);
      if (ay !== 'Unknown') years.add(ay);
    });
    // Ensure current year is always available
    years.add(currentAcademicYear);
    return Array.from(years).sort().reverse();
  }, [grades, currentAcademicYear]);

  // Derive dynamic list of terms from grades for the selected academic year
  const availableTerms = useMemo(() => {
    const terms = [...new Set(grades
      .filter(g => getAcademicYearFromDate(g.date) === selectedYear)
      .map(g => g.title)
    )].filter(Boolean);
    return terms.sort();
  }, [grades, selectedYear]);

  // Auto-select initial term when available terms change
  useEffect(() => {
    if (availableTerms.length > 0) {
      if (!selectedTerm || !availableTerms.includes(selectedTerm)) {
        setSelectedTerm(availableTerms[0]);
      }
    } else {
      setSelectedTerm(null);
    }
  }, [availableTerms, selectedTerm]);

  // Filter grades list by selected term and year
  const filteredGrades = useMemo(() => {
    return grades.filter(g => 
      g.title === selectedTerm && 
      getAcademicYearFromDate(g.date) === selectedYear
    );
  }, [grades, selectedTerm, selectedYear]);

  // Compute Overall Performance Average
  const overallPct = useMemo(() => {
    if (filteredGrades.length === 0) return 0;
    const total = filteredGrades.reduce((sum, g) => sum + g.percentage, 0);
    return Math.round(total / filteredGrades.length);
  }, [filteredGrades]);

  const isScholar = overallPct >= 90;

  const handleExportPDF = async () => {
    if (filteredGrades.length === 0) {
      setModalState({ visible: true, type: 'warning', title: 'No Data', message: 'There are no grades to export for the selected term.' });
      return;
    }

    setIsExporting(true);
    try {
      const columns = ["Subject", "Exam Date", "Marks", "Max Marks", "Percentage", "Grade"];
      const tableRows = filteredGrades.map(g => [
        g.subject,
        g.date || '-',
        g.marks !== null ? String(g.marks) : '-',
        String(g.maxMarks),
        `${g.percentage}%`,
        g.grade
      ]);

      const title = `Report Card - ${selectedTerm || 'Term'}\n` +
                    `Student: ${profile?.name || 'N/A'}  |  Class: ${classInfo?.name || ''} ${classInfo?.section || ''}\n` +
                    `Overall Average: ${overallPct}%  |  Grade: ${getLetterGrade(overallPct)}`;

      await exportToPDF(
        columns, 
        tableRows, 
        `ReportCard_FY${selectedYear.replace('-', '_')}_${(selectedTerm || 'Term').replace(/\s+/g, '_')}`, 
        title
      );
    } catch (error) {
      console.error("PDF generation error: ", error);
      setModalState({ visible: true, type: 'error', title: 'Export Failed', message: 'Could not generate the PDF Report Card.' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openDrawer} style={styles.headerBtn}>
          <Icon name="menu" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Grades</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Notifications')}>
          <Icon name="bell" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Dynamic Filters */}
      {!acadLoading && (
        <View style={styles.termHeaderContainer}>
          <TouchableOpacity onPress={() => setShowYearModal(true)} style={styles.filterChip}>
            <Text style={styles.filterLabel}>YEAR</Text>
            <Text style={styles.filterValue}>FY {selectedYear}</Text>
            <Icon name="chevron-down" size={16} color={colors.primary} style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setShowTermModal(true)} 
            style={[styles.filterChip, availableTerms.length === 0 && { opacity: 0.5 }]}
            disabled={availableTerms.length === 0}
          >
            <Text style={styles.filterLabel}>TERM</Text>
            <Text style={styles.filterValue}>{selectedTerm || "No Terms"}</Text>
            <Icon name="chevron-down" size={16} color={colors.primary} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={onRefresh} colors={[colors.primary]} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Page Header */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Academic Results</Text>
            <Text style={styles.pageSubtitle}>{selectedYear} • Term Report Card</Text>
          </View>
          {filteredGrades.length > 0 && (
            <TouchableOpacity style={styles.downloadBtn} onPress={handleExportPDF} disabled={isExporting}>
              {isExporting ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Icon name="download" size={16} color={colors.primary} />
                  <Text style={styles.downloadText}>PDF</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {acadLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : filteredGrades.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="file-text" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Grades Yet</Text>
            <Text style={styles.emptyText}>There are no grades recorded for the selected year and term.</Text>
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
                    <Text style={styles.letterGrade}> Passing Status: Passed</Text>
                  </View>
                </View>
                <View style={styles.gpaBox}>
                  <Text style={styles.gpaLabel}>Grade</Text>
                  <Text style={styles.gpaValue}>{getLetterGrade(overallPct)}</Text>
                </View>
              </View>
            </View>

            {/* Performance Chart Card */}
            <View style={styles.chartCard}>
              <Text style={styles.sectionTitle}>Recent Performance</Text>
              <View style={styles.hChartContainer}>
                {filteredGrades.map((d, i) => (
                  <View key={i} style={styles.hBarRow}>
                    <View style={styles.hBarLabelContainer}>
                      <Text style={styles.hBarLabel} numberOfLines={1}>{d.subject}</Text>
                      <Text style={[styles.hBarValue, { color: d.gradeColor }]}>{d.percentage}%</Text>
                    </View>
                    <View style={styles.hBarBg}>
                      <View style={[styles.hBarFill, { width: `${d.percentage}%`, backgroundColor: d.gradeColor }]} />
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Graded Assessments Breakdown */}
            <Text style={styles.sectionTitle}>{selectedTerm} Breakdown</Text>
            {filteredGrades.map((grade, i) => (
              <GradeCard key={i} grade={grade} />
            ))}
          </>
        )}
      </ScrollView>

      {/* Term Selection Modal */}
      <Modal transparent={true} visible={showTermModal} animationType="fade" onRequestClose={() => setShowTermModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTermModal(false)} />
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Term</Text>
          <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
            {availableTerms.map((term, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.modalItem}
                onPress={() => { setSelectedTerm(term); setShowTermModal(false); }}
              >
                <Text style={[styles.modalItemText, selectedTerm === term && styles.modalItemTextActive]}>{term}</Text>
                {selectedTerm === term && <Icon name="check" size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowTermModal(false)}>
            <Text style={styles.modalCloseText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Academic Year Selection Modal */}
      <Modal transparent={true} visible={showYearModal} animationType="fade" onRequestClose={() => setShowYearModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowYearModal(false)} />
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Academic Year</Text>
          <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
            {dynamicYears.map((year, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.modalItem}
                onPress={() => { setSelectedYear(year); setShowYearModal(false); }}
              >
                <Text style={[styles.modalItemText, selectedYear === year && styles.modalItemTextActive]}>FY {year}</Text>
                {selectedYear === year && <Icon name="check" size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowYearModal(false)}>
            <Text style={styles.modalCloseText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Feedback modal */}
      <AppModal
        visible={modalState.visible}
        title={modalState.title}
        message={modalState.message}
        icon={modalState.type === 'error' ? 'alert-triangle' : modalState.type === 'warning' ? 'alert-circle' : 'info'}
        iconColor={modalState.type === 'error' ? colors.danger : modalState.type === 'warning' ? colors.warning : colors.primary}
        actions={[{ label: 'OK', onPress: () => setModalState(prev => ({ ...prev, visible: false })), style: 'primary' }]}
        onClose={() => setModalState(prev => ({ ...prev, visible: false }))}
      />

      {isScholar && !acadLoading && filteredGrades.length > 0 && (
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

  termHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterLabel: {
    fontSize: 11,
    color: '#64748b',
    marginRight: 6,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },

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

  chartCard: {
    backgroundColor: colors.surface,
    padding: 20,
    marginHorizontal: 16,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  hChartContainer: {
    gap: 12,
    marginTop: 12,
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
    color: colors.text,
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

  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.textMuted, paddingHorizontal: 20, marginBottom: 12, textTransform: 'uppercase' },

  gradeCard: {
    backgroundColor: colors.surface, marginHorizontal: 16, marginBottom: 16,
    borderRadius: 20, padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  gradeInitial: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  gradeInitialText: { fontSize: 18, fontWeight: '800' },
  gradeInfo: { flex: 1 },
  gradeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  gradeName: { fontSize: 16, fontWeight: '800', color: colors.text },
  gradeType: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  gradeScore: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  gradePct: { fontSize: 12, fontWeight: '700', marginBottom: 8 },

  progressBg: { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },



  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12, paddingBottom: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 40 },

  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 90,
  },
  modalContent: {
    position: 'absolute', top: 140, left: 24, right: 24,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    ...shadows.card,
    zIndex: 100,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 12 },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  modalItemText: { fontSize: 14, color: colors.text, fontWeight: '500', textTransform: 'capitalize' },
  modalItemTextActive: { color: colors.primary, fontWeight: '800' },
  modalCloseBtn: { marginTop: 16, paddingVertical: 10, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight },
  modalCloseText: { color: colors.text, fontSize: 14, fontWeight: '700', textAlign: 'center' },

  scoreBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-end', marginBottom: 4 },
  scoreBadgeText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
});

export default ResultScreen;
