import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { colors, shadows } from '../../theme/colors';
import { Calendar } from 'react-native-calendars';
import { useGetEventsQuery, useGetAcademicsQuery } from '../../store/apiSlice';
import { useDrawer } from '../../navigation/DrawerContext';
import { useSelector, useDispatch } from 'react-redux';
import { setAcademicYear } from '../../store/settingsSlice';

// Helper to format YYYY-MM-DD
const formatDate = (dateObj) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const AcademicCalendarScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { openDrawer } = useDrawer();
  const academicYear = useSelector(state => state.settings.academicYear);
  const [currentMonth, setCurrentMonth] = useState(formatDate(new Date()));
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('dateSheet'); // 'dateSheet' | 'annualCalendar'

  const getAvailableYears = () => {
    const currentStartYear = parseInt(academicYear.split('-')[0]) || new Date().getFullYear();
    return [
      `${currentStartYear - 1}-${currentStartYear}`,
      `${currentStartYear}-${currentStartYear + 1}`,
      `${currentStartYear + 1}-${currentStartYear + 2}`
    ];
  };

  const availableYears = getAvailableYears();

  const { data: eventsData, isLoading: eventsLoading, refetch: refetchEvents } = useGetEventsQuery(academicYear);
  const { data: acadData, isLoading: acadLoading, refetch: refetchAcads } = useGetAcademicsQuery(academicYear);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchEvents(), refetchAcads()]);
    setRefreshing(false);
  }, [refetchEvents, refetchAcads]);

  const isLoading = eventsLoading || acadLoading;

  // Process Events
  const { eventsList, eventsMarks } = useMemo(() => {
    const list = [];
    const marks = {};
    const plannerEvents = eventsData?.data || [];
    
    plannerEvents.forEach(evt => {
      const startStr = evt.start_date;
      if (!startStr) return;
      
      let color = colors.primary; // General Event
      let icon = 'flag';
      const category = evt.category || 'Event';
      
      if (category === 'Holiday') { color = '#10b981'; icon = 'coffee'; }
      if (category === 'Exam') { color = '#ef4444'; icon = 'edit-3'; }
      if (category === 'PTM') { color = '#f59e0b'; icon = 'users'; }
      if (category === 'Competition') { color = '#8b5cf6'; icon = 'award'; }

      const endStr = evt.end_date || startStr;

      list.push({
        id: `evt-${evt.id}`,
        title: evt.title,
        subtitle: category,
        description: evt.description,
        requiresConsent: evt.requires_consent,
        date: startStr,
        endDate: endStr !== startStr ? endStr : null,
        type: 'event',
        color,
        icon
      });

      // Period marks
      const startDate = new Date(startStr);
      const endDate = new Date(endStr);
      const diff = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));

      for (let i = 0; i <= diff; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const dStr = formatDate(d);
        
        marks[dStr] = {
          ...marks[dStr],
          selected: true,
          selectedColor: color,
          textColor: '#ffffff',
        };
      }
    });
    
    // Make sure today is marked if not already part of a period
    const todayStr = formatDate(new Date());
    if (!marks[todayStr]) {
      marks[todayStr] = { marked: true, dotColor: colors.primary };
    }
    
    list.sort((a, b) => new Date(a.date) - new Date(b.date));
    return { eventsList: list, eventsMarks: marks };
  }, [eventsData]);

  // Process Exams (Date Sheet)
  const examsList = useMemo(() => {
    const list = [];
    const upcomingExams = acadData?.upcomingExams || [];
    
    upcomingExams.forEach(ex => {
      const dStr = ex.date;
      if (!dStr) return;
      const title = ex.title ? `${ex.title} - ${ex.subject || 'Subject'}` : (ex.subject || 'Exam');
      
      list.push({
        id: `exam-${ex.id}`,
        title: title,
        subtitle: `Duration: ${ex.duration || 60} mins`,
        date: dStr,
        time: ex.time || '09:00 AM',
        type: 'exam',
        color: colors.danger,
        icon: 'edit-3'
      });
    });
    list.sort((a, b) => new Date(a.date) - new Date(b.date));
    return list;
  }, [acadData]);

  const renderAgendaItem = ({ item }) => {
    const d = new Date(item.date);
    const day = d.getDate();
    const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    
    return (
      <View style={styles.agendaCard}>
        <View style={styles.agendaDate}>
          <Text style={styles.agendaMonth}>{month}</Text>
          <Text style={styles.agendaDay}>{day}</Text>
        </View>
        <View style={[styles.agendaDivider, { backgroundColor: item.color }]} />
        <View style={styles.agendaInfo}>
          <Text style={styles.agendaTitle}>{item.title}</Text>
          <Text style={styles.agendaSubtitle}>{item.time ? `Starts at ${item.time} • ` : ''}{item.subtitle}</Text>
          {item.description ? (
            <Text style={styles.agendaDescription}>{item.description}</Text>
          ) : null}
          {item.endDate && (
            <Text style={styles.agendaDuration}>Ends: {new Date(item.endDate).toLocaleDateString()}</Text>
          )}
          {item.requiresConsent && (
            <View style={styles.consentBadge}>
              <Icon name="alert-circle" size={12} color="#b45309" style={{marginRight: 4}} />
              <Text style={styles.consentText}>Parent Consent Required</Text>
            </View>
          )}
        </View>
        {activeTab === 'dateSheet' ? (
          <TouchableOpacity style={[styles.addToCalBtn, { backgroundColor: item.color + '15' }]}>
            <Icon name="calendar" size={16} color={item.color} />
          </TouchableOpacity>
        ) : (
          <View style={[styles.agendaIcon, { backgroundColor: item.color + '15' }]}>
            <Icon name={item.icon} size={20} color={item.color} />
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openDrawer} style={styles.headerBtn}>
          <Icon name="menu" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Planner</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Notifications')}>
          <Icon name="bell" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yearScroll} contentContainerStyle={styles.yearScrollContent}>
          {availableYears.map(year => (
            <TouchableOpacity 
              key={year} 
              style={[styles.yearChip, academicYear === year && styles.yearChipActive]}
              onPress={() => {
                if (academicYear === year) {
                  refetchEvents();
                  refetchAcads();
                } else {
                  dispatch(setAcademicYear(year));
                }
              }}
            >
              <Text style={[styles.yearChipText, academicYear === year && styles.yearChipTextActive]}>{year}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Dual Tab Toggle */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabBtn, activeTab === 'dateSheet' && styles.tabBtnActive]}
            onPress={() => setActiveTab('dateSheet')}
          >
            <Icon name="file-text" size={16} color={activeTab === 'dateSheet' ? '#fff' : colors.textMuted} style={styles.tabIcon} />
            <Text style={[styles.tabText, activeTab === 'dateSheet' && styles.tabTextActive]}>Date Sheet</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabBtn, activeTab === 'annualCalendar' && styles.tabBtnActive]}
            onPress={() => setActiveTab('annualCalendar')}
          >
            <Icon name="calendar" size={16} color={activeTab === 'annualCalendar' ? '#fff' : colors.textMuted} style={styles.tabIcon} />
            <Text style={[styles.tabText, activeTab === 'annualCalendar' && styles.tabTextActive]}>Annual Calendar</Text>
          </TouchableOpacity>
        </View>

        {isLoading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <>
            {activeTab === 'annualCalendar' && (
              <>
                <View style={styles.calendarContainer}>
                  <Calendar
                    current={currentMonth}
                    onMonthChange={(month) => setCurrentMonth(month.dateString)}
                    markedDates={eventsMarks}
                    theme={{
                      todayTextColor: colors.primary,
                      arrowColor: colors.primary,
                      textDayFontWeight: '500',
                      textMonthFontWeight: 'bold',
                      textDayHeaderFontWeight: '600',
                      calendarBackground: colors.surface,
                    }}
                    enableSwipeMonths={true}
                  />
                </View>
                <View style={styles.agendaHeader}>
                  <Text style={styles.agendaHeaderText}>School Events</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                    <Text style={styles.legendText}>Holiday</Text>
                    <View style={[styles.legendDot, { backgroundColor: '#ef4444', marginLeft: 12 }]} />
                    <Text style={styles.legendText}>Exam</Text>
                    <View style={[styles.legendDot, { backgroundColor: '#f59e0b', marginLeft: 12 }]} />
                    <Text style={styles.legendText}>PTM</Text>
                    <View style={[styles.legendDot, { backgroundColor: '#8b5cf6', marginLeft: 12 }]} />
                    <Text style={styles.legendText}>Competition</Text>
                    <View style={[styles.legendDot, { backgroundColor: colors.primary, marginLeft: 12 }]} />
                    <Text style={styles.legendText}>General</Text>
                  </ScrollView>
                </View>
              </>
            )}

            {activeTab === 'dateSheet' && examsList.length > 0 && (
              <View style={styles.dateSheetHeader}>
                <Text style={styles.dateSheetTitle}>Upcoming Exams Timeline</Text>
                <Text style={styles.dateSheetSubtitle}>Add exams to your device calendar to never miss a paper.</Text>
              </View>
            )}

            <FlatList
              data={activeTab === 'dateSheet' ? examsList : eventsList}
              keyExtractor={item => item.id}
              renderItem={renderAgendaItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
              ListEmptyComponent={() => (
                <View style={styles.emptyState}>
                  <Icon name={activeTab === 'dateSheet' ? 'file-text' : 'calendar'} size={48} color={colors.textMuted} />
                  <Text style={styles.emptyTitle}>Nothing Scheduled</Text>
                  <Text style={styles.emptyText}>There are no upcoming {activeTab === 'dateSheet' ? 'exams' : 'events'} to display.</Text>
                </View>
              )}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.primary },
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerBtn: { padding: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10 },

  yearScroll: { maxHeight: 50, flexGrow: 0, marginTop: 16 },
  yearScrollContent: { paddingHorizontal: 16, gap: 10 },
  yearChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  yearChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  yearChipText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  yearChipTextActive: { color: '#fff' },

  tabContainer: {
    flexDirection: 'row', backgroundColor: colors.surface,
    marginHorizontal: 16, marginTop: 20, marginBottom: 16,
    borderRadius: 30, padding: 4, ...shadows.card
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 26,
  },
  tabBtnActive: { backgroundColor: colors.primary },
  tabIcon: { marginRight: 6 },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: '#fff' },

  calendarContainer: {
    backgroundColor: colors.surface, marginHorizontal: 16,
    borderRadius: 20, overflow: 'hidden', ...shadows.card, marginBottom: 20,
  },

  agendaHeader: {
    paddingHorizontal: 20, marginBottom: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  agendaHeaderText: { fontSize: 16, fontWeight: '700', color: colors.text },
  legendRow: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  legendText: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },

  dateSheetHeader: { paddingHorizontal: 20, marginBottom: 16 },
  dateSheetTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  dateSheetSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4 },

  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  agendaCard: {
    backgroundColor: colors.surface, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center',
    padding: 16, marginBottom: 12, ...shadows.card,
  },
  agendaDate: { alignItems: 'center', width: 44 },
  agendaMonth: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  agendaDay: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: -2 },
  agendaDivider: { width: 4, height: '100%', borderRadius: 2, marginHorizontal: 16 },
  agendaInfo: { flex: 1, justifyContent: 'center' },
  agendaTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  agendaSubtitle: { fontSize: 13, color: colors.textMuted },
  agendaDescription: { fontSize: 13, color: colors.text, marginTop: 4, lineHeight: 18 },
  agendaDuration: { fontSize: 11, color: colors.primary, fontWeight: '600', marginTop: 4 },
  consentBadge: { 
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, 
    borderRadius: 12, marginTop: 8 
  },
  consentText: { fontSize: 11, color: '#b45309', fontWeight: '600' },
  
  agendaIcon: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginLeft: 12,
  },
  addToCalBtn: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginLeft: 12,
  },

  emptyState: { alignItems: 'center', paddingTop: 60, paddingBottom: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 40 },
});

export default AcademicCalendarScreen;
