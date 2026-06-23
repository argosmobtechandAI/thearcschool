import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useSelector } from 'react-redux';
import { useGetAcademicsQuery } from '../../store/apiSlice';
import { colors, shadows } from '../../theme/colors';
import CustomHeader from '../../components/CustomHeader';
import AppModal from '../../components/AppModal';
import { exportToPDF } from '../../utils/exportUtils';
import { useDrawer } from '../../navigation/DrawerContext';

const DateSheetScreen = ({ navigation }) => {
  const { openDrawer } = useDrawer();

  // Helper functions for academic years (Hermes compatible)
  const getAcademicYearFromDate = (dateStr) => {
    if (!dateStr) return 'Unknown';
    const parts = dateStr.split('-');
    if (parts.length < 3) return 'Unknown';
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    // Academic year starts in April (month >= 4)
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

  // Date Formatting Helpers (Hermes compatible)
  const formatDateHeader = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    const year = parseInt(parts[0]);
    const monthIndex = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June', 
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const date = new Date(year, monthIndex, day);
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekday = weekdays[date.getDay()];
    
    return `${weekday}, ${months[monthIndex]} ${day}`;
  };

  const formatDateShort = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    const year = parseInt(parts[0]);
    const monthIndex = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    const date = new Date(year, monthIndex, day);
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekday = weekdays[date.getDay()];
    
    return `${weekday}, ${months[monthIndex]} ${day}`;
  };

  const currentAcademicYear = useMemo(() => getCurrentAcademicYear(), []);
  const currentYearStart = useMemo(() => parseInt(currentAcademicYear.split('-')[0]), [currentAcademicYear]);
  
  // Year choices
  const displayYears = useMemo(() => {
    return [
      `${currentYearStart - 1}-${currentYearStart}`,
      currentAcademicYear,
      `${currentYearStart + 1}-${currentYearStart + 2}`
    ].sort().reverse();
  }, [currentYearStart, currentAcademicYear]);

  // Selected state for Year and Term
  const [selectedYear, setSelectedYear] = useState(currentAcademicYear);
  const [selectedTerm, setSelectedTerm] = useState(null);

  // Modal display states
  const [showTermModal, setShowTermModal] = useState(false);
  const [showYearModal, setShowYearModal] = useState(false);
  const [modalState, setModalState] = useState({ visible: false, type: 'info', title: '', message: '' });
  const [isExporting, setIsExporting] = useState(false);

  // Fetch Academics data for selected Year
  const { data: acadData, isLoading: loading, refetch, isFetching } = useGetAcademicsQuery(selectedYear);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Extract all exams from academics data
  const exams = useMemo(() => {
    return acadData?.upcomingExams || [];
  }, [acadData]);

  // Dynamically derive available terms for selected academic year
  const availableTerms = useMemo(() => {
    const terms = [...new Set(exams
      .filter(e => getAcademicYearFromDate(e.date) === selectedYear)
      .map(e => e.title)
    )].filter(Boolean);
    return terms.sort();
  }, [exams, selectedYear]);

  // Sync selected term based on available terms
  useEffect(() => {
    if (availableTerms.length > 0) {
      if (!selectedTerm || !availableTerms.includes(selectedTerm)) {
        setSelectedTerm(availableTerms[0]);
      }
    } else {
      setSelectedTerm(null);
    }
  }, [availableTerms, selectedTerm]);

  // Filter exams by active term and year
  const filteredExams = useMemo(() => {
    return exams.filter(e => 
      e.title === selectedTerm && 
      getAcademicYearFromDate(e.date) === selectedYear
    );
  }, [exams, selectedTerm, selectedYear]);

  // Group exams by date
  const groupedExams = useMemo(() => {
    const groups = {};
    filteredExams.forEach(exam => {
      if (!exam.date) return;
      const dateString = exam.date.split('T')[0];
      if (!groups[dateString]) {
        groups[dateString] = [];
      }
      groups[dateString].push(exam);
    });
    return groups;
  }, [filteredExams]);

  // Format time (e.g. 09:00:00 -> 9:00 AM)
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0]);
    const minutes = parts[1] || '00';
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const dispHours = hours % 12 || 12;
    return `${dispHours}:${minutes} ${ampm}`;
  };

  const listItems = useMemo(() => {
    const items = [];
    const sortedDates = Object.keys(groupedExams).sort((a, b) => a.localeCompare(b));
    
    sortedDates.forEach((date, dateIndex) => {
      items.push({ type: 'header', date });
      groupedExams[date].forEach((ex, exIndex) => {
        const isLastOverall = (dateIndex === sortedDates.length - 1) && (exIndex === groupedExams[date].length - 1);
        items.push({ type: 'exam', ex, isLastOverall });
      });
    });
    return items;
  }, [groupedExams]);

  const handleExportPDF = async () => {
    if (!filteredExams || filteredExams.length === 0) {
      setModalState({ visible: true, type: 'warning', title: 'No Data', message: 'There are no exams to export for the selected term.' });
      return;
    }

    setIsExporting(true);
    try {
      const columns = ["Date", "Time", "Subject", "Duration", "Marks", "Room/Invigilator"];
      const tableRows = [];

      const sortedExams = [...filteredExams].sort((a, b) => a.date.localeCompare(b.date));

      sortedExams.forEach(exam => {
        tableRows.push([
          formatDateShort(exam.date),
          formatTime(exam.time),
          exam.subject || '-',
          exam.duration ? `${exam.duration} min` : '-',
          exam.marks ? String(exam.marks) : '-',
          `Room: ${exam.room_number || '-'}\nInvigilator: ${exam.invigilator || '-'}`
        ]);
      });

      await exportToPDF(columns, tableRows, `DateSheet_${(selectedTerm || 'Exams').replace(/\s+/g, '_')}`, `Date Sheet - ${selectedTerm || 'Exams'}`);
    } catch (error) {
      console.error("PDF generation error: ", error);
      setModalState({ visible: true, type: 'error', title: 'Export Failed', message: 'Could not generate the PDF.' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="Date Sheet" 
        onMenuPress={openDrawer} 
      />

      {!loading && (
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

      {!loading && filteredExams.length > 0 && (
        <View style={styles.exportContainer}>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExportPDF} disabled={isExporting}>
            {isExporting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="download" size={16} color="#fff" />
                <Text style={styles.exportBtnText}>Export PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <ScrollView 
        contentContainerStyle={styles.examsList}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : listItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="calendar" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No exams scheduled for this term.</Text>
          </View>
        ) : (
          listItems.map((item, index) => {
            if (item.type === 'header') {
              return (
                <View key={`header-${index}`} style={styles.timelineRow}>
                  <View style={styles.timeColumn} />
                  <View style={styles.timelineCenter}>
                    <View style={styles.timelineLine} />
                    <View style={styles.timelineHeaderDot} />
                  </View>
                  <View style={styles.dateHeaderContainer}>
                    <Text style={styles.dateHeader}>{formatDateHeader(item.date)}</Text>
                  </View>
                </View>
              );
            }

            const { ex, isLastOverall } = item;
            return (
              <View key={`exam-${index}`} style={styles.timelineRow}>
                {/* Time Column */}
                <View style={styles.timeColumn}>
                  <Text style={styles.timeTextMain}>{formatTime(ex.time)}</Text>
                </View>

                {/* Timeline Node & Line */}
                <View style={styles.timelineCenter}>
                  {!isLastOverall && <View style={styles.timelineLine} />}
                  <View style={styles.timelineNodeContainer}>
                    <View style={styles.timelineNodeOuter}>
                      <View style={styles.timelineNodeInner} />
                    </View>
                  </View>
                </View>

                {/* Content Card */}
                <View style={styles.examCardWrapper}>
                  <View style={styles.examCard}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.subjectText}>{ex.subject}</Text>
                      {!!ex.duration && (
                        <View style={styles.durationBadge}>
                          <Icon name="clock" size={12} color="#0891b2" style={{ marginRight: 4 }} />
                          <Text style={styles.durationText}>{ex.duration} min</Text>
                        </View>
                      )}
                    </View>
                    
                    <Text style={styles.classText}>Class {ex.className || ex.class || 'N/A'} {ex.section ? `- ${ex.section}` : ''}</Text>
                    
                    {(ex.invigilator || ex.room_number || ex.marks) && (
                      <View style={styles.detailsRow}>
                        {!!ex.marks && (
                          <View style={styles.detailItem}>
                            <Icon name="award" size={12} color={colors.textMuted} style={{ marginRight: 6 }} />
                            <Text style={styles.detailText}>Marks: {ex.marks}</Text>
                          </View>
                        )}
                        {!!ex.invigilator && (
                          <View style={styles.detailItem}>
                            <Icon name="user" size={12} color={colors.textMuted} style={{ marginRight: 6 }} />
                            <Text style={styles.detailText}>Invigilator: {ex.invigilator}</Text>
                          </View>
                        )}
                        {!!ex.room_number && (
                          <View style={styles.detailItem}>
                            <Icon name="map-pin" size={12} color={colors.textMuted} style={{ marginRight: 6 }} />
                            <Text style={styles.detailText}>Room: {ex.room_number}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })
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
            {displayYears.map((year, index) => (
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

      <AppModal
        visible={modalState.visible}
        title={modalState.title}
        message={modalState.message}
        icon={modalState.type === 'error' ? 'alert-triangle' : modalState.type === 'warning' ? 'alert-circle' : 'info'}
        iconColor={modalState.type === 'error' ? colors.danger : modalState.type === 'warning' ? colors.warning : colors.primary}
        actions={[{ label: 'OK', onPress: () => setModalState(prev => ({ ...prev, visible: false })), style: 'primary' }]}
        onClose={() => setModalState(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  filterChipActive: {
    backgroundColor: colors.primary + '10',
    borderColor: colors.primary,
  },
  filterValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  exportContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: colors.surface,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    ...shadows.sm,
  },
  exportBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 6,
  },
  examsList: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, marginTop: 40 },
  emptyText: { color: colors.textMuted, marginTop: 12, fontWeight: '500', fontSize: 16, textAlign: 'center' },
  
  timelineRow: {
    flexDirection: 'row',
  },
  dateHeaderContainer: {
    flex: 1,
    paddingLeft: 16,
    paddingTop: 30,
    paddingBottom: 16,
  },
  dateHeader: { 
    fontSize: 15, 
    fontWeight: '800', 
    color: colors.warning, 
    letterSpacing: 0.5, 
    textTransform: 'uppercase' 
  },
  timeColumn: {
    width: 75,
    alignItems: 'flex-end',
    paddingTop: 24,
    paddingRight: 12,
  },
  timeTextMain: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },
  timelineCenter: {
    width: 30,
    alignItems: 'center',
  },
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
  timelineLine: {
    position: 'absolute',
    top: 0,
    bottom: 0, 
    width: 2,
    backgroundColor: '#06b6d430',
  },
  timelineHeaderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.warning,
    marginTop: 34,
    zIndex: 2,
  },
  timelineNodeContainer: {
    marginTop: 20,
    zIndex: 2,
    backgroundColor: colors.background, 
    paddingVertical: 4,
  },
  timelineNodeOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#06b6d425',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineNodeInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0891b2', 
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  examCardWrapper: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 24,
  },
  examCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderLeftWidth: 5,
    borderLeftColor: '#06b6d4',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  subjectText: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  classText: { fontSize: 14, fontWeight: '600', color: colors.textMuted, marginBottom: 12 },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#06b6d4' + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  durationText: { fontSize: 12, fontWeight: '800', color: '#0891b2' },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 12,
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detailText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
});

export default DateSheetScreen;
