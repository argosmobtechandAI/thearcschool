import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import ConfettiCannon from 'react-native-confetti-cannon';
import { theme } from '../../theme/theme';
import { useGetAcademicsQuery, useGetDashboardQuery } from '../../store/apiSlice';
import { useDrawer } from '../../navigation/DrawerContext';
import { exportToPDF } from '../../utils/exportUtils';
import AppModal from '../../components/AppModal';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Chip from '../../components/Chip';

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
    <Card variant="elevated" style={styles.gradeCard}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={[styles.gradeInitial, { backgroundColor: theme.colors.primary + '15' }]}>
          <Text style={[styles.gradeInitialText, { color: theme.colors.primary }]}>{subjectInitial}</Text>
        </View>
        <View style={styles.gradeInfo}>
          <View style={styles.gradeTop}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.gradeName} numberOfLines={2}>{grade.subject}</Text>
              <Text style={styles.gradeType} numberOfLines={1}>{grade.title} • {grade.date || 'Graded'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
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
    </Card>
  );
};

const ResultScreen = ({ navigation }) => {
  const { openDrawer } = useDrawer();
  
  const getAcademicYearFromDate = (dateStr) => {
    if (!dateStr) return 'Unknown';
    const parts = dateStr.split('-');
    if (parts.length < 3) return 'Unknown';
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    if (month >= 4) return `${year}-${year + 1}`;
    return `${year - 1}-${year}`;
  };

  const getCurrentAcademicYear = () => {
    const d = new Date();
    let year = d.getFullYear();
    if (d.getMonth() < 3) year -= 1;
    return `${year}-${year + 1}`;
  };

  const currentAcademicYear = useMemo(() => getCurrentAcademicYear(), []);
  const [selectedYear, setSelectedYear] = useState(currentAcademicYear);
  const [selectedTerm, setSelectedTerm] = useState(null);

  const [showTermModal, setShowTermModal] = useState(false);
  const [showYearModal, setShowYearModal] = useState(false);
  const [modalState, setModalState] = useState({ visible: false, type: 'info', title: '', message: '' });
  const [isExporting, setIsExporting] = useState(false);

  const { data: acadData, isLoading: acadLoading, refetch: refetchAcad, isFetching } = useGetAcademicsQuery(selectedYear);
  const { data: dashData } = useGetDashboardQuery();

  const profile = dashData?.data?.profile;
  const classInfo = dashData?.data?.classInfo;
  const grades = acadData?.grades || [];

  const onRefresh = useCallback(() => refetchAcad(), [refetchAcad]);

  const dynamicYears = useMemo(() => {
    const years = new Set();
    grades.forEach(g => {
      const ay = getAcademicYearFromDate(g.date);
      if (ay !== 'Unknown') years.add(ay);
    });
    years.add(currentAcademicYear);
    return Array.from(years).sort().reverse();
  }, [grades, currentAcademicYear]);

  const availableTerms = useMemo(() => {
    const terms = [...new Set(grades
      .filter(g => getAcademicYearFromDate(g.date) === selectedYear)
      .map(g => g.title)
    )].filter(Boolean);
    return terms.sort();
  }, [grades, selectedYear]);

  useEffect(() => {
    if (availableTerms.length > 0) {
      if (!selectedTerm || !availableTerms.includes(selectedTerm)) setSelectedTerm(availableTerms[0]);
    } else {
      setSelectedTerm(null);
    }
  }, [availableTerms, selectedTerm]);

  const filteredGrades = useMemo(() => {
    return grades.filter(g => 
      g.title === selectedTerm && 
      getAcademicYearFromDate(g.date) === selectedYear
    );
  }, [grades, selectedTerm, selectedYear]);

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
        g.subject, g.date || '-', g.marks !== null ? String(g.marks) : '-', String(g.maxMarks), `${g.percentage}%`, g.grade
      ]);
      const title = `Report Card - ${selectedTerm || 'Term'}\n` +
                    `Student: ${profile?.name || 'N/A'}  |  Class: ${classInfo?.name || ''} ${classInfo?.section || ''}\n` +
                    `Overall Average: ${overallPct}%  |  Grade: ${getLetterGrade(overallPct)}`;
      await exportToPDF(columns, tableRows, `ReportCard_FY${selectedYear.replace('-', '_')}_${(selectedTerm || 'Term').replace(/\s+/g, '_')}`, title);
    } catch (error) {
      setModalState({ visible: true, type: 'error', title: 'Export Failed', message: 'Could not generate the PDF Report Card.' });
    } finally {
      setIsExporting(false);
    }
  };

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

      {!acadLoading && (
        <View style={styles.termHeaderContainer}>
          <TouchableOpacity onPress={() => setShowYearModal(true)} style={styles.filterChip}>
            <Text style={styles.filterLabel}>YEAR</Text>
            <Text style={styles.filterValue}>FY {selectedYear}</Text>
            <Icon name="chevron-down" size={16} color={theme.colors.primary} style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setShowTermModal(true)} 
            style={[styles.filterChip, availableTerms.length === 0 && { opacity: 0.5 }]}
            disabled={availableTerms.length === 0}
          >
            <Text style={styles.filterLabel}>TERM</Text>
            <Text style={styles.filterValue}>{selectedTerm || "No Terms"}</Text>
            <Icon name="chevron-down" size={16} color={theme.colors.primary} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={isFetching || false} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Academic Results</Text>
            <Text style={styles.pageSubtitle}>{selectedYear} • Term Report Card</Text>
          </View>
          {filteredGrades.length > 0 && (
            <TouchableOpacity style={styles.downloadBtn} onPress={handleExportPDF} disabled={isExporting}>
              {isExporting ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <>
                  <Icon name="download" size={16} color={theme.colors.primary} />
                  <Text style={styles.downloadText}>PDF</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {acadLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
          </View>
        ) : filteredGrades.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="file-text" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>No Grades Yet</Text>
            <Text style={styles.emptyText}>There are no grades recorded for the selected year and term.</Text>
          </View>
        ) : (
          <>
            <Card variant="elevated" style={styles.overallCard}>
              {isScholar && (
                <View style={styles.scholarBadge}>
                  <Icon name="award" size={14} color="#EAB308" />
                  <Text style={styles.scholarBadgeText}>Scholar</Text>
                </View>
              )}
              <Text style={styles.overallLabel}>Overall Performance</Text>
              <View style={styles.overallRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
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
            </Card>

            <Card variant="elevated" style={styles.chartCard}>
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
            </Card>

            <Text style={styles.sectionTitle}>{selectedTerm} Breakdown</Text>
            {filteredGrades.map((grade, i) => (
              <GradeCard key={i} grade={grade} />
            ))}
          </>
        )}
      </ScrollView>

      <Modal transparent={true} visible={showTermModal} animationType="fade" onRequestClose={() => setShowTermModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTermModal(false)} />
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Term</Text>
          <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
            {availableTerms.map((term, index) => (
              <TouchableOpacity key={index} style={styles.modalItem} onPress={() => { setSelectedTerm(term); setShowTermModal(false); }}>
                <Text style={[styles.modalItemText, selectedTerm === term && styles.modalItemTextActive]}>{term}</Text>
                {selectedTerm === term && <Icon name="check" size={20} color={theme.colors.primary} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowTermModal(false)}>
            <Text style={styles.modalCloseText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal transparent={true} visible={showYearModal} animationType="fade" onRequestClose={() => setShowYearModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowYearModal(false)} />
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Academic Year</Text>
          <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
            {dynamicYears.map((year, index) => (
              <TouchableOpacity key={index} style={styles.modalItem} onPress={() => { setSelectedYear(year); setShowYearModal(false); }}>
                <Text style={[styles.modalItemText, selectedYear === year && styles.modalItemTextActive]}>FY {year}</Text>
                {selectedYear === year && <Icon name="check" size={20} color={theme.colors.primary} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowYearModal(false)}>
            <Text style={styles.modalCloseText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <AppModal
        visible={modalState.visible}
        title={modalState.title}
        message={modalState.message}
        icon={modalState.type === 'error' ? 'alert-triangle' : modalState.type === 'warning' ? 'alert-circle' : 'info'}
        iconColor={modalState.type === 'error' ? theme.colors.danger : modalState.type === 'warning' ? theme.colors.warning : theme.colors.primary}
        actions={[{ label: 'OK', onPress: () => setModalState(prev => ({ ...prev, visible: false })), style: 'primary' }]}
        onClose={() => setModalState(prev => ({ ...prev, visible: false }))}
      />

      {isScholar && !acadLoading && filteredGrades.length > 0 && (
        <ConfettiCannon 
          count={150} origin={{x: -10, y: 0}} fadeOut={true} fallSpeed={3000} 
          colors={[theme.colors.primary, theme.colors.accent, theme.colors.success, '#F43F5E', '#8B5CF6']}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.primary },
  scroll: { flex: 1, backgroundColor: theme.colors.background },
  center: { paddingTop: 80, alignItems: 'center' },

  header: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg, paddingVertical: 14,
  },
  headerTitle: { color: '#fff', fontSize: theme.typography.fontSize.lg, fontFamily: theme.typography.fontFamily.heading },
  headerBtn: { padding: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10 },

  termHeaderContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight, backgroundColor: theme.colors.surface,
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0',
  },
  filterLabel: { fontSize: 11, color: '#64748b', marginRight: 6, fontFamily: theme.typography.fontFamily.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  filterValue: { fontSize: theme.typography.fontSize.sm, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.primary },

  pageHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: theme.spacing.lg, paddingTop: 20, paddingBottom: 16,
  },
  pageTitle: { fontSize: 22, fontFamily: theme.typography.fontFamily.heading, color: theme.colors.text },
  pageSubtitle: { fontSize: theme.typography.fontSize.sm, color: theme.colors.textMuted, marginTop: 2, fontFamily: theme.typography.fontFamily.medium },
  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.primary + '40',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  downloadText: { fontSize: 13, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.primary },

  overallCard: {
    marginHorizontal: theme.spacing.md, marginBottom: 20,
    backgroundColor: theme.colors.primary, padding: 24, paddingBottom: 24,
    position: 'relative'
  },
  scholarBadge: {
    position: 'absolute', top: -12, right: 24,
    backgroundColor: '#FFFBEB', flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: '#FEF3C7',
    ...theme.shadows.card
  },
  scholarBadgeText: { color: '#B45309', fontFamily: theme.typography.fontFamily.heading, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase' },
  overallLabel: { color: 'rgba(255,255,255,0.8)', fontSize: theme.typography.fontSize.sm, fontFamily: theme.typography.fontFamily.bold, marginBottom: 16 },
  overallRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  overallPct: { fontSize: 56, fontFamily: theme.typography.fontFamily.heading, color: '#fff', letterSpacing: -1 },
  letterRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  letterGrade: { color: 'rgba(255,255,255,0.9)', fontSize: theme.typography.fontSize.sm, fontFamily: theme.typography.fontFamily.bold },
  gpaBox: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 14, alignItems: 'center',
  },
  gpaLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontFamily: theme.typography.fontFamily.bold, textTransform: 'uppercase' },
  gpaValue: { color: '#fff', fontSize: 24, fontFamily: theme.typography.fontFamily.heading, marginTop: 4 },

  chartCard: { marginHorizontal: theme.spacing.md, marginBottom: 20, padding: 20 },
  hChartContainer: { gap: 12, marginTop: 12 },
  hBarRow: { marginBottom: 4 },
  hBarLabelContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  hBarLabel: { fontSize: 13, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.text, flex: 1, paddingRight: 8, flexShrink: 1 },
  hBarValue: { fontSize: 13, fontFamily: theme.typography.fontFamily.heading },
  hBarBg: { height: 8, backgroundColor: theme.colors.borderLight, borderRadius: 4, width: '100%', overflow: 'hidden' },
  hBarFill: { height: '100%', borderRadius: 4 },

  sectionTitle: { fontSize: 15, fontFamily: theme.typography.fontFamily.heading, color: theme.colors.textMuted, paddingHorizontal: 20, marginBottom: 12, textTransform: 'uppercase' },

  gradeCard: { marginHorizontal: theme.spacing.md, marginBottom: 16, padding: 16 },
  gradeInitial: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  gradeInitialText: { fontSize: 18, fontFamily: theme.typography.fontFamily.heading },
  gradeInfo: { flex: 1 },
  gradeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  gradeName: { fontSize: 16, fontFamily: theme.typography.fontFamily.heading, color: theme.colors.text },
  gradeType: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2, fontFamily: theme.typography.fontFamily.medium },
  gradeScore: { fontSize: 18, fontFamily: theme.typography.fontFamily.heading, marginTop: 4 },
  gradePct: { fontSize: 12, fontFamily: theme.typography.fontFamily.bold, marginBottom: 8 },

  progressBg: { height: 6, backgroundColor: theme.colors.borderLight, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },

  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12, paddingBottom: 40 },
  emptyTitle: { fontSize: 18, fontFamily: theme.typography.fontFamily.heading, color: theme.colors.text },
  emptyText: { fontSize: 14, color: theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 40, fontFamily: theme.typography.fontFamily.regular },

  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 90 },
  modalContent: {
    position: 'absolute', top: 140, left: 24, right: 24,
    backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, ...theme.shadows.card, zIndex: 100,
  },
  modalTitle: { fontSize: 16, fontFamily: theme.typography.fontFamily.heading, color: theme.colors.text, marginBottom: 12 },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  modalItemText: { fontSize: 14, color: theme.colors.text, fontFamily: theme.typography.fontFamily.medium, textTransform: 'capitalize' },
  modalItemTextActive: { color: theme.colors.primary, fontFamily: theme.typography.fontFamily.bold },
  modalCloseBtn: { marginTop: 16, paddingVertical: 10, backgroundColor: theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.borderLight },
  modalCloseText: { color: theme.colors.text, fontSize: 14, fontFamily: theme.typography.fontFamily.bold, textAlign: 'center' },

  scoreBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-end', marginBottom: 4 },
  scoreBadgeText: { fontSize: 12, fontFamily: theme.typography.fontFamily.bold, textTransform: 'uppercase' },
});

export default ResultScreen;
