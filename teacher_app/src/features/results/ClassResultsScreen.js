import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Dimensions, TouchableOpacity, Modal, TouchableWithoutFeedback } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useGetDateSheetGradesQuery } from '../../store/apiSlice';
import { colors, shadows } from '../../theme/colors';
import CustomHeader from '../../components/CustomHeader';

const { width } = Dimensions.get('window');

const getGradeColor = (marks, maxMarks) => {
  if (marks === null || marks === undefined || !maxMarks) return '#F1F5F9'; // Default Gray
  const pct = (marks / maxMarks) * 100;
  if (pct >= 90) return '#10B981'; // Success Green
  if (pct >= 75) return '#0EA5E9'; // Secondary Blue
  if (pct >= 60) return '#F59E0B'; // Warning Yellow
  if (pct >= 40) return '#F97316'; // Orange
  return '#EF4444'; // Danger Red
};

const getGradeText = (marks, maxMarks) => {
  if (marks === null || marks === undefined || !maxMarks) return 'N/A';
  const pct = (marks / maxMarks) * 100;
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
};

const calculateTotalPct = (student, subjects) => {
  let obtained = 0;
  let max = 0;
  subjects.forEach(sub => {
    const gradeData = student.grades[sub.subject];
    if (gradeData && gradeData.marksObtained != null) {
      obtained += gradeData.marksObtained;
      max += gradeData.maxMarks;
    }
  });
  return max > 0 ? (obtained / max) * 100 : 0;
};

const ClassResultsScreen = ({ route, navigation }) => {
  const { title, classId, className } = route.params;
  const { data, isLoading, refetch, isFetching } = useGetDateSheetGradesQuery({ title, classId });
  
  const [filter, setFilter] = useState('All'); // 'All', 'Passed', 'Failed'
  const [sort, setSort] = useState('Highest Score'); // 'Name', 'Highest Score', 'Lowest Score'
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);

  const filters = ['All', 'Passed', 'Failed'];
  const sorts = ['Name', 'Highest Score', 'Lowest Score'];

  const subjects = data?.subjects || [];
  const rawResults = data?.results || [];

  const onRefresh = React.useCallback(() => {
    refetch();
  }, [refetch]);

  const processedResults = useMemo(() => {
    let filtered = rawResults.filter(student => {
      const pct = calculateTotalPct(student, subjects);
      if (filter === 'Passed') return pct >= 40;
      if (filter === 'Failed') return pct > 0 && pct < 40; // Don't count 0 if they didn't take the exam
      return true;
    });

    return filtered.sort((a, b) => {
      if (sort === 'Name') return a.name.localeCompare(b.name);
      
      const pctA = calculateTotalPct(a, subjects);
      const pctB = calculateTotalPct(b, subjects);
      if (sort === 'Highest Score') return pctB - pctA;
      if (sort === 'Lowest Score') return pctA - pctB;
      
      return 0;
    });
  }, [rawResults, subjects, filter, sort]);

  const handleStudentPress = (student) => {
    navigation.navigate('StudentAcademicHistoryScreen', { 
      student: { id: student.student_id, name: student.name, admission_number: student.admission_number } 
    });
  };

  const chartData = useMemo(() => {
    if (subjects.length === 0 || rawResults.length === 0) return [];
    
    return subjects.map(sub => {
      let totalObtained = 0;
      let totalMax = 0;
      
      rawResults.forEach(student => {
        const gradeData = student.grades[sub.subject];
        if (gradeData && gradeData.marksObtained != null) {
          totalObtained += gradeData.marksObtained;
          totalMax += gradeData.maxMarks;
        }
      });
      
      const pct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
      return {
        label: sub.subject,
        pct: pct,
        color: getGradeColor(totalObtained, totalMax)
      };
    });
  }, [subjects, rawResults]);

  // UI Responsiveness Calculation
  const nameColWidth = 160;
  const availableWidthForSubjects = width - 32 - nameColWidth - 2; // 32 for margins, 2 for borders
  const minSubjectWidth = 100;
  const dynamicSubjectWidth = subjects.length > 0 ? Math.max(minSubjectWidth, availableWidthForSubjects / subjects.length) : minSubjectWidth;
  const totalTableWidth = nameColWidth + (dynamicSubjectWidth * subjects.length);

  return (
    <View style={styles.container}>
      <CustomHeader title={title} showBack />
      
      <View style={styles.headerInfo}>
        <View>
          <Text style={styles.headerClass}>Class: {className}</Text>
          <Text style={styles.headerStats}>{rawResults.length} Students</Text>
        </View>
        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlBadge} onPress={() => setFilterMenuVisible(true)}>
            <Icon name="filter" size={14} color={colors.primary} />
            <Text style={styles.controlText}>{filter}</Text>
            <Icon name="chevron-down" size={14} color={colors.primary} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBadge} onPress={() => setSortMenuVisible(true)}>
            <Icon name="bar-chart-2" size={14} color={colors.primary} />
            <Text style={styles.controlText}>{sort}</Text>
            <Icon name="chevron-down" size={14} color={colors.primary} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.mainScroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : rawResults.length === 0 ? (
          <Text style={styles.emptyText}>No results available for this exam yet.</Text>
        ) : (
          <View>
            {chartData.length > 0 && (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Class Average per Subject</Text>
                <View style={styles.chartContainer}>
                  {chartData.map((d, i) => (
                    <View key={i} style={styles.hBarRow}>
                      <View style={styles.hBarLabelContainer}>
                        <Text style={styles.hBarLabel} numberOfLines={1}>{d.label}</Text>
                        <Text style={[styles.hBarValue, { color: d.color }]}>{d.pct.toFixed(0)}%</Text>
                      </View>
                      <View style={styles.hBarBg}>
                        <View style={[styles.hBarFill, { width: `${d.pct}%`, backgroundColor: d.color }]} />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={[styles.tableContainer, { minWidth: Math.max(totalTableWidth, width - 32) }]}>
              
              {/* Table Header */}
              <View style={styles.tableHeaderRow}>
                <View style={[styles.headerCell, styles.nameCol]}>
                  <Text style={styles.headerText}>Student</Text>
                </View>
                {subjects.map((sub, i) => (
                  <View key={i} style={[styles.headerCell, { width: dynamicSubjectWidth }]}>
                    <Text style={styles.headerText} numberOfLines={1}>{sub.subject}</Text>
                    <Text style={styles.headerSubText}>Out of {sub.maxMarks}</Text>
                  </View>
                ))}
              </View>

              {/* Table Rows */}
              {processedResults.length === 0 ? (
                <Text style={styles.emptyText}>No students match the selected filter.</Text>
              ) : (
                processedResults.map((student, idx) => (
                  <TouchableOpacity 
                    key={idx} 
                    style={[styles.tableRow, idx % 2 === 1 && styles.rowAlternate]}
                    onPress={() => handleStudentPress(student)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.cell, styles.nameCol]}>
                      <Text style={styles.studentName} numberOfLines={1}>{student.name}</Text>
                      <Text style={styles.studentRoll}>{student.admission_number}</Text>
                    </View>
                    
                    {subjects.map((sub, i) => {
                      const gradeData = student.grades[sub.subject];
                      const marks = gradeData?.marksObtained;
                      const maxMarks = gradeData?.maxMarks;
                      const cellColor = getGradeColor(marks, maxMarks);
                      
                      return (
                        <View key={i} style={[styles.cell, { width: dynamicSubjectWidth }]}>
                          <View style={[styles.gradeBadge, { backgroundColor: marks != null ? cellColor + '15' : '#F1F5F9' }]}>
                            <Text style={[styles.gradeText, { color: marks != null ? cellColor : colors.textMuted }]}>
                              {marks != null ? marks : '-'}
                            </Text>
                            {marks != null && (
                              <Text style={[styles.letterGrade, { color: cellColor }]}>
                                {getGradeText(marks, maxMarks)}
                              </Text>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </TouchableOpacity>
                ))
              )}

            </View>
          </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Filter Menu Modal */}
      <Modal visible={filterMenuVisible} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setFilterMenuVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.menuContainer}>
              <Text style={styles.menuTitle}>Filter Results</Text>
              {filters.map((f, i) => (
                <TouchableOpacity 
                  key={i} 
                  style={[styles.menuItem, filter === f && styles.menuItemActive]}
                  onPress={() => {
                    setFilter(f);
                    setFilterMenuVisible(false);
                  }}
                >
                  <Text style={[styles.menuItemText, filter === f && styles.menuItemTextActive]}>{f}</Text>
                  {filter === f && <Icon name="check" size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Sort Menu Modal */}
      <Modal visible={sortMenuVisible} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setSortMenuVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.menuContainer}>
              <Text style={styles.menuTitle}>Sort Results</Text>
              {sorts.map((s, i) => (
                <TouchableOpacity 
                  key={i} 
                  style={[styles.menuItem, sort === s && styles.menuItemActive]}
                  onPress={() => {
                    setSort(s);
                    setSortMenuVisible(false);
                  }}
                >
                  <Text style={[styles.menuItemText, sort === s && styles.menuItemTextActive]}>{s}</Text>
                  {sort === s && <Icon name="check" size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    zIndex: 1,
  },
  headerClass: { fontSize: 16, fontWeight: '700', color: colors.primary },
  headerStats: { fontSize: 13, color: colors.textMuted, fontWeight: '500', marginTop: 2 },
  controls: {
    flexDirection: 'row',
    gap: 8,
  },
  controlBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  controlText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 6,
  },
  mainScroll: { flex: 1, paddingBottom: 40 },
  emptyText: { textAlign: 'center', color: colors.textMuted, marginTop: 40, padding: 24 },
  
  chartCard: {
    backgroundColor: colors.surface,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    ...shadows.card,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 16,
  },
  chartContainer: {
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

  tableContainer: {
    backgroundColor: colors.surface,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.card,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '05',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rowAlternate: {
    backgroundColor: '#FAFAFA',
  },
  headerCell: {
    padding: 12,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.borderLight,
  },
  cell: {
    padding: 12,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.borderLight,
  },
  nameCol: {
    width: 160,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  headerSubText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  studentName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  studentRoll: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  gradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'center',
    minWidth: 44,
  },
  gradeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  letterGrade: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    width: 250,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    ...shadows.card,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  menuItemActive: {
    backgroundColor: colors.primary + '10',
  },
  menuItemText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  menuItemTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});

export default ClassResultsScreen;
