import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { letterheadBase64 } from '../../utils/letterhead';
import Icon from 'react-native-vector-icons/Feather';
import { useSelector, useDispatch } from 'react-redux';
import { useGetExamsQuery } from '../../store/apiSlice';
import { setActiveTerm, setActiveAcademicYear } from '../../store/appSlice';
import { colors, shadows } from '../../theme/colors';
import CustomHeader from '../../components/CustomHeader';
import CustomModal from '../../components/CustomModal';

const DateSheetScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { activeClassId } = useSelector((state) => state.app);
  const { activeTerm, activeAcademicYear } = useSelector((state) => state.app);
  const [exams, setExams] = useState([]);
  const { data: examsResponse, isLoading: loading, refetch, isFetching } = useGetExamsQuery(activeClassId);

  const onRefresh = React.useCallback(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (examsResponse?.exams) {
      setExams(examsResponse.exams);
    }
  }, [examsResponse]);

  const getAcademicYearFromDate = (dateStr) => {
    const d = new Date(dateStr);
    let year = d.getFullYear();
    // Assuming academic year starts in April (month index 3)
    if (d.getMonth() < 3) year -= 1;
    return `${year}-${year + 1}`;
  };

  const getCurrentAcademicYear = () => {
    const d = new Date();
    let year = d.getFullYear();
    if (d.getMonth() < 3) year -= 1;
    return `${year}-${year + 1}`;
  };

  // --- UI TOGGLES STATE ---
  const availableYears = [...new Set(exams.map(e => getAcademicYearFromDate(e.date)))].sort().reverse();
  
  const currentAcademicYear = getCurrentAcademicYear();
  const currentYearStart = parseInt(currentAcademicYear.split('-')[0]);
  const fallbackYears = [
    `${currentYearStart - 1}-${currentYearStart}`,
    currentAcademicYear,
    `${currentYearStart + 1}-${currentYearStart + 2}`
  ].sort().reverse();

  // Fallback to dynamic list if no exams exist yet
  const displayYears = availableYears.length > 0 ? availableYears : fallbackYears;

  const [showTermModal, setShowTermModal] = useState(false);
  const [showYearModal, setShowYearModal] = useState(false);
  const [modalState, setModalState] = useState({ visible: false, type: 'info', title: '', message: '' });

  useEffect(() => {
    if (displayYears.length > 0 && !activeAcademicYear) {
      if (displayYears.includes(currentAcademicYear)) {
        dispatch(setActiveAcademicYear(currentAcademicYear));
      } else {
        dispatch(setActiveAcademicYear(displayYears[0]));
      }
    }
  }, [displayYears, activeAcademicYear, dispatch, currentAcademicYear]);

  // Derived available terms based on currently selected activeAcademicYear
  const availableTerms = [...new Set(exams
    .filter(e => getAcademicYearFromDate(e.date) === activeAcademicYear)
    .map(e => e.title)
  )].filter(Boolean);

  useEffect(() => {
    // If activeAcademicYear is set, but activeTerm is empty or not in the available terms for this year, reset it
    if (activeAcademicYear && availableTerms.length > 0) {
      if (!activeTerm || !availableTerms.includes(activeTerm)) {
        dispatch(setActiveTerm(availableTerms[0]));
      }
    } else if (activeAcademicYear && availableTerms.length === 0 && activeTerm) {
      // clear term if no terms available for this year
      dispatch(setActiveTerm(null));
    }
  }, [activeAcademicYear, availableTerms, activeTerm, dispatch]);

  // Filter exams by selected term AND academic year
  const filteredExams = exams.filter(e => 
    e.title === activeTerm && 
    getAcademicYearFromDate(e.date) === activeAcademicYear
  );

  const groupedExams = filteredExams.reduce((acc, exam) => {
    if (!acc[exam.date]) {
      acc[exam.date] = [];
    }
    acc[exam.date].push(exam);
    return acc;
  }, {});

  const exportToPDF = async () => {
    if (!filteredExams || filteredExams.length === 0) {
      setModalState({ visible: true, type: 'warning', title: 'No Data', message: 'There are no exams to export for the selected term.' });
      return;
    }

    try {
      const doc = new jsPDF('landscape');
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Add official school letterhead
      doc.addImage(letterheadBase64, 'PNG', 0, 0, pageWidth, 40);
      
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.text(`Date Sheet - ${activeTerm || 'Exams'}`, 14, 52);
      
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Academic Year: FY ${activeAcademicYear}`, 14, 60);
      const className = filteredExams[0]?.class || '';
      const sectionName = filteredExams[0]?.section ? `- ${filteredExams[0]?.section}` : '';
      doc.text(`Class: ${className} ${sectionName}`, 14, 66);

      const tableColumn = ["Date", "Time", "Subject", "Duration", "Marks", "Invigilator"];
      const tableRows = [];

      const sortedExams = [...filteredExams].sort((a, b) => new Date(a.date) - new Date(b.date));

      sortedExams.forEach(exam => {
        tableRows.push([
          new Date(exam.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          formatTime(exam.time),
          exam.subject,
          exam.duration ? `${exam.duration} min` : '-',
          exam.marks ? String(exam.marks) : '-',
          exam.invigilator || 'Not Assigned'
        ]);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 72,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [27, 139, 59], textColor: 255, fontStyle: 'bold' },
      });

      const pdfBase64 = doc.output('datauristring');
      const base64Data = pdfBase64.split(',')[1];
      const filename = `DateSheet_${(activeTerm||'Exams').replace(/\s+/g, '_')}.pdf`;
      const path = `${RNFS.CachesDirectoryPath}/${filename}`;
      
      await RNFS.writeFile(path, base64Data, 'base64');
      
      await Share.open({
        url: `file://${path}`,
        type: 'application/pdf',
        title: 'Share Date Sheet',
      });
    } catch (error) {
      console.error("PDF generation error: ", error);
      setModalState({ visible: true, type: 'error', title: 'Export Failed', message: 'Could not generate the PDF.' });
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5); // 09:00:00 -> 09:00
  };

  const listItems = [];
  const sortedDates = Object.keys(groupedExams).sort((a, b) => new Date(a) - new Date(b));
  
  sortedDates.forEach((date, dateIndex) => {
    listItems.push({ type: 'header', date });
    groupedExams[date].forEach((ex, exIndex) => {
      const isLastOverall = (dateIndex === sortedDates.length - 1) && (exIndex === groupedExams[date].length - 1);
      listItems.push({ type: 'exam', ex, isLastOverall });
    });
  });



  return (
    <View style={styles.container}>
      <CustomHeader title="Date Sheet" showBack={true} />

      {!loading && (
        <View style={styles.termHeaderContainer}>
          <TouchableOpacity onPress={() => setShowYearModal(true)} style={styles.filterChip}>
            <Text style={styles.filterLabel}>YEAR</Text>
            <Text style={styles.filterValue}>FY {activeAcademicYear}</Text>
            <Icon name="chevron-down" size={16} color={colors.primary} style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setShowTermModal(true)} 
            style={[styles.filterChip, availableTerms.length === 0 && { opacity: 0.5 }]}
            disabled={availableTerms.length === 0}
          >
            <Text style={styles.filterLabel}>TERM</Text>
            <Text style={styles.filterValue}>{activeTerm || "No Terms"}</Text>
            <Icon name="chevron-down" size={16} color={colors.primary} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>
      )}

      {!loading && availableTerms.length > 0 && (
        <View style={styles.exportContainer}>
          <TouchableOpacity style={styles.exportBtn} onPress={exportToPDF}>
            <Icon name="download" size={16} color="#fff" />
            <Text style={styles.exportBtnText}>Export PDF</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView 
        contentContainerStyle={styles.examsList}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={onRefresh} colors={[colors.warning]} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.warning} style={{ marginTop: 40 }} />
        ) : listItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="calendar" size={48} color={colors.borderLight} />
            <Text style={styles.emptyText}>No exams scheduled.</Text>
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
                    <Text style={styles.dateHeader}>{new Date(item.date).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}</Text>
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
                    
                    <Text style={styles.classText}>Class {ex.className || ex.class} {ex.section ? `- ${ex.section}` : ''}</Text>
                    
                    {(ex.invigilator || ex.room_number) && (
                      <View style={styles.detailsRow}>
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

      {/* Term Modal */}
      <Modal transparent={true} visible={showTermModal} animationType="fade" onRequestClose={() => setShowTermModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTermModal(false)} />
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Term</Text>
          {availableTerms.map((term, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.modalItem}
              onPress={() => { dispatch(setActiveTerm(term)); setShowTermModal(false); }}
            >
              <Text style={[styles.modalItemText, activeTerm === term && styles.modalItemTextActive]}>{term}</Text>
              {activeTerm === term && <Icon name="check" size={20} color={colors.primary} />}
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowTermModal(false)}>
            <Text style={styles.modalCloseText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Academic Year Modal */}
      <Modal transparent={true} visible={showYearModal} animationType="fade" onRequestClose={() => setShowYearModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowYearModal(false)} />
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Academic Year</Text>
          {displayYears.map((year, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.modalItem}
              onPress={() => { dispatch(setActiveAcademicYear(year)); setShowYearModal(false); }}
            >
              <Text style={[styles.modalItemText, activeAcademicYear === year && styles.modalItemTextActive]}>FY {year}</Text>
              {activeAcademicYear === year && <Icon name="check" size={20} color={colors.primary} />}
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowYearModal(false)}>
            <Text style={styles.modalCloseText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <CustomModal
        visible={modalState.visible}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        primaryButtonText="OK"
        onPrimaryPress={() => setModalState(prev => ({ ...prev, visible: false }))}
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
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: colors.textMuted, marginTop: 12, fontWeight: '500', fontSize: 16 },
  
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
    width: 60,
    alignItems: 'flex-end',
    paddingTop: 24,
    paddingRight: 12,
  },
  timeTextMain: {
    fontSize: 14,
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
  dropdownBtn: { flexDirection: 'row', alignItems: 'center' },
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
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 10,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
});

export default DateSheetScreen;
