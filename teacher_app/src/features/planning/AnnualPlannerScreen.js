import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useGetEventsQuery, useGetExamsQuery } from '../../store/apiSlice';
import { colors, shadows } from '../../theme/colors';
import CustomHeader from '../../components/CustomHeader';
import CustomModal from '../../components/CustomModal';
import { exportToPDF } from '../../utils/exportUtils';

const AnnualPlannerScreen = ({ navigation }) => {
  const { data: eventsData, isLoading: loadingEvents, refetch: refetchEvents, isFetching: fetchingEvents } = useGetEventsQuery();
  const { data: examsData, isLoading: loadingExams, refetch: refetchExams, isFetching: fetchingExams } = useGetExamsQuery();
  
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedYear, setSelectedYear] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [modalState, setModalState] = useState({ visible: false, type: 'info', title: '', message: '' });

  const isRefreshing = fetchingEvents || fetchingExams;

  const getAcademicYear = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed (April is 3)
    if (month >= 3) {
      return `${year}-${String(year + 1).slice(2)}`;
    } else {
      return `${year - 1}-${String(year).slice(2)}`;
    }
  };

  const onRefresh = useCallback(() => {
    refetchEvents();
    refetchExams();
  }, [refetchEvents, refetchExams]);

  const combinedData = useMemo(() => {
    const evs = eventsData?.data || [];
    const exs = examsData?.exams || [];
    
    const mappedExams = exs.map(ex => ({
      title: ex.subject ? `Exam: ${ex.subject}` : ex.title,
      description: `Scheduled at ${ex.time}`,
      start_date: ex.date,
      category: 'Exam',
      className: ex.className || ex.class,
      section: ex.section
    }));

    const all = [...evs, ...mappedExams];
    return all.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
  }, [eventsData, examsData]);

  const categories = useMemo(() => {
    const cats = new Set(combinedData.map(item => item.category || 'Other'));
    return ['All', ...Array.from(cats).sort()];
  }, [combinedData]);

  const academicYears = useMemo(() => {
    const years = new Set();
    combinedData.forEach(item => {
      const ay = getAcademicYear(item.start_date);
      if (ay !== 'Unknown') years.add(ay);
    });
    return Array.from(years).sort().reverse();
  }, [combinedData]);

  React.useEffect(() => {
    if (academicYears.length > 0 && !selectedYear) {
      const currentAY = getAcademicYear(new Date().toISOString());
      if (academicYears.includes(currentAY)) {
        setSelectedYear(currentAY);
      } else {
        setSelectedYear(academicYears[0]);
      }
    }
  }, [academicYears, selectedYear]);

  const displayEvents = useMemo(() => {
    let filtered = combinedData;
    if (selectedYear) {
      filtered = filtered.filter(item => getAcademicYear(item.start_date) === selectedYear);
    }
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(item => (item.category || 'Other') === selectedCategory);
    }
    return filtered;
  }, [combinedData, selectedCategory, selectedYear]);

  const groupedEvents = useMemo(() => {
    const groups = {};
    displayEvents.forEach(ev => {
      if (!ev.start_date) return;
      
      const date = new Date(ev.start_date);
      const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(ev);
    });
    return groups;
  }, [displayEvents]);

  const loading = loadingEvents || loadingExams;

  const getCategoryTheme = (category) => {
    const cat = category?.toLowerCase() || '';
    if (cat === 'holiday') return { color: colors.danger, icon: 'sun' };
    if (cat === 'exam') return { color: colors.warning, icon: 'edit-3' };
    if (cat === 'event') return { color: colors.purple, icon: 'star' };
    if (cat === 'ptm') return { color: colors.info || '#0ea5e9', icon: 'users' };
    return { color: colors.primary, icon: 'calendar' };
  };

  const handleExportPDF = async () => {
    if (displayEvents.length === 0) {
        setModalState({ visible: true, type: 'warning', title: 'No Data', message: 'There are no events to export.' });
        return;
    }
    
    setIsExporting(true);
    try {
        const columns = ['Date', 'Category', 'Title', 'Description'];
        const data = displayEvents.map(ev => [
            ev.start_date || 'TBA',
            (ev.category || 'Event').toUpperCase(),
            ev.title || '',
            ev.description || ''
        ]);
        
        await exportToPDF(columns, data, `Academic_Planner_${selectedCategory}`, `Academic Planner - ${selectedCategory}`);
    } catch (error) {
        setModalState({ visible: true, type: 'error', title: 'Export Failed', message: 'Failed to generate or share the PDF.' });
    } finally {
        setIsExporting(false);
    }
  };

  return (
    <View style={styles.container}>
      <CustomHeader title="Academic Planner" showBack={true} />

      {academicYears.length > 0 && (
        <View style={styles.yearToggleWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.yearScroll}>
            {academicYears.map(year => {
              const isActive = selectedYear === year;
              return (
                <TouchableOpacity 
                  key={year} 
                  style={[styles.yearChip, isActive && styles.yearChipActive]}
                  onPress={() => setSelectedYear(year)}
                >
                  <Text style={[styles.yearChipText, isActive && styles.yearChipTextActive]}>{year}</Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>
      )}

      <View style={styles.filtersWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
          {categories.map(cat => {
            const isActive = selectedCategory === cat;
            return (
              <TouchableOpacity 
                key={cat} 
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      <ScrollView 
        style={styles.eventsList} 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {loading && !isRefreshing ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : displayEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="calendar" size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>No events found for this category.</Text>
          </View>
        ) : (
          Object.keys(groupedEvents).map(monthYear => {
            const eventsInMonth = groupedEvents[monthYear];
            return (
              <View key={monthYear} style={styles.monthSection}>
                <View style={styles.monthHeader}>
                  <Text style={styles.monthTitle}>{monthYear}</Text>
                  <View style={styles.monthCountBadge}>
                    <Text style={styles.monthCountText}>{eventsInMonth.length} {eventsInMonth.length === 1 ? 'Event' : 'Events'}</Text>
                  </View>
                </View>
                {eventsInMonth.map((ev, index) => {
                  const theme = getCategoryTheme(ev.category);
                  const isLast = index === eventsInMonth.length - 1;
                  
                  return (
                    <View key={index} style={styles.timelineRow}>
                      {/* Timeline Axis */}
                      <View style={styles.timelineAxis}>
                          <View style={[styles.timelineDot, { backgroundColor: theme.color + '20', borderColor: theme.color }]}>
                              <Icon name={theme.icon} size={12} color={theme.color} />
                          </View>
                          {!isLast && <View style={styles.timelineLine} />}
                      </View>

                      {/* Event Card */}
                      <View style={styles.eventCard}>
                        <View style={styles.eventHeader}>
                          <Text style={styles.eventTitle}>{ev.title}</Text>
                          <View style={[styles.categoryBadge, { backgroundColor: theme.color + '15' }]}>
                            <Text style={[styles.categoryBadgeText, { color: theme.color }]}>{ev.category || 'Event'}</Text>
                          </View>
                        </View>
                        <Text style={styles.eventDesc}>{ev.description}</Text>
                        
                        {(ev.className || ev.section) && (
                          <View style={[styles.dateRow, { marginBottom: 6 }]}>
                            <Icon name="book-open" size={12} color={colors.textMuted} />
                            <Text style={styles.dateText}>
                              Class {ev.className || ''} {ev.section ? `- ${ev.section}` : ''}
                            </Text>
                          </View>
                        )}

                        {ev.start_date && (
                          <View style={styles.dateRow}>
                            <Icon name="calendar" size={12} color={colors.textMuted} />
                            <Text style={styles.dateText}>{ev.start_date}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Export FAB */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={handleExportPDF}
        disabled={isExporting}
      >
        {isExporting ? (
            <ActivityIndicator color="#FFF" />
        ) : (
            <Icon name="download" size={24} color="#FFF" />
        )}
      </TouchableOpacity>

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
  
  yearToggleWrapper: { backgroundColor: colors.surface, paddingTop: 16, paddingBottom: 8 },
  yearScroll: { paddingHorizontal: 16, alignItems: 'center' },
  yearChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.background, marginRight: 10 },
  yearChipActive: { backgroundColor: colors.primary + '20' },
  yearChipText: { fontSize: 14, fontWeight: '700', color: colors.textMuted },
  yearChipTextActive: { color: colors.primary },

  filtersWrapper: { paddingVertical: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  filtersScroll: { paddingHorizontal: 16, alignItems: 'center' },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.background, marginRight: 10, borderWidth: 1, borderColor: colors.borderLight },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  filterChipTextActive: { color: colors.background },

  eventsList: { flex: 1, paddingHorizontal: 16 },
  emptyState: { alignItems: 'center', padding: 32, marginTop: 40 },
  emptyText: { color: colors.textMuted, marginTop: 12, fontWeight: '500' },
  
  monthSection: { marginBottom: 24 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 4 },
  monthTitle: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  monthCountBadge: { backgroundColor: colors.primary + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  monthCountText: { fontSize: 12, fontWeight: '700', color: colors.primary },

  timelineRow: { flexDirection: 'row' },
  timelineAxis: { width: 40, alignItems: 'center', marginRight: 8 },
  timelineDot: { 
      width: 28, height: 28, borderRadius: 14, borderWidth: 2, 
      justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface,
      marginTop: 4, zIndex: 2
  },
  timelineLine: { flex: 1, width: 2, backgroundColor: colors.borderLight, marginTop: -4, marginBottom: -4, zIndex: 1 },

  eventCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderLight + '50',
    ...shadows.sm,
  },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  eventTitle: { fontSize: 16, fontWeight: '800', color: colors.text, letterSpacing: -0.5, flex: 1, marginRight: 8 },
  eventDesc: { fontSize: 14, fontWeight: '500', color: colors.textMuted, marginBottom: 12, lineHeight: 20 },
  
  dateRow: { flexDirection: 'row', alignItems: 'center' },
  dateText: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginLeft: 6 },
  
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  categoryBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },

  fab: {
      position: 'absolute',
      bottom: 30,
      right: 30,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      ...shadows.lg,
      elevation: 6
  }
});

export default AnnualPlannerScreen;
