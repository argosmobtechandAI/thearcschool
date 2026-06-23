import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { colors, shadows } from '../../theme/colors';
import { useGetCourseWorkQuery, useGetAcademicsQuery } from '../../store/apiSlice';
import { useDrawer } from '../../navigation/DrawerContext';

const TABS = ['Materials', 'Assignments', 'Exams'];

const subjectColors = [
  colors.primary, colors.purple, colors.success, '#E67E22', colors.danger, '#16A085',
];

const SubjectCard = ({ name, count, label, color, onPress }) => (
  <TouchableOpacity style={[styles.subjectCard, { borderTopColor: color }]} onPress={onPress} activeOpacity={0.8}>
    <View style={[styles.subjectIcon, { backgroundColor: color + '20' }]}>
      <Icon name="book-open" size={22} color={color} />
    </View>
    <Text style={styles.subjectName} numberOfLines={2}>{name}</Text>
    <Text style={styles.subjectCount}>{count} {label}</Text>
  </TouchableOpacity>
);

const CourseWorkScreen = ({ navigation }) => {
  const { openDrawer } = useDrawer();
  const [activeTab, setActiveTab] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const { data: courseData, isLoading: courseLoading, refetch: refetchCourse } = useGetCourseWorkQuery();
  const { data: academicsData, isLoading: acadLoading, refetch: refetchAcad } = useGetAcademicsQuery();

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchCourse(), refetchAcad()]);
    setRefreshing(false);
  };

  const isLoading = courseLoading || acadLoading;

  // Group course items by subject
  const materials = courseData?.courses || [];
  const assignments = courseData?.courses || []; // backend returns course materials; adapt as needed
  const grades = academicsData?.grades || [];
  const upcomingExams = academicsData?.upcomingExams || [];

  const getSubjectGroups = (items, nameKey = 'subject') => {
    const map = {};
    items.forEach((item, i) => {
      const subj = item[nameKey] || item.title || item.name || 'General';
      if (!map[subj]) map[subj] = [];
      map[subj].push(item);
    });
    return Object.entries(map).map(([name, list], i) => ({
      name,
      count: list.length,
      color: subjectColors[i % subjectColors.length],
    }));
  };

  const getExamSubjectGroups = () => {
    const map = {};
    upcomingExams.forEach((ex, i) => {
      const subj = ex.subject?.name || ex.name || 'Exam';
      if (!map[subj]) map[subj] = [];
      map[subj].push(ex);
    });
    return Object.entries(map).map(([name, list], i) => ({
      name,
      count: list.length,
      color: subjectColors[i % subjectColors.length],
    }));
  };

  const tabData = [
    getSubjectGroups(materials, 'subject'),
    getSubjectGroups(assignments, 'subject'),
    getExamSubjectGroups(),
  ];

  const currentGroups = tabData[activeTab];
  const tabLabels = ['material', 'assignment', 'exam'];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openDrawer} style={styles.headerBtn}>
          <Icon name="menu" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>The Arc School</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Icon name="bell" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>My Course Work</Text>
          <Text style={styles.pageSubtitle}>Access materials, assignments, and exams</Text>
        </View>

        {/* Segmented Control */}
        <View style={styles.segmentWrapper}>
          <View style={styles.segment}>
            {TABS.map((tab, i) => (
              <TouchableOpacity
                key={tab}
                style={[styles.segmentTab, activeTab === i && styles.segmentTabActive]}
                onPress={() => setActiveTab(i)}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentText, activeTab === i && styles.segmentTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <>
            <Text style={styles.selectSubjectLabel}>SELECT SUBJECT</Text>

            {currentGroups.length > 0 ? (
              <View style={styles.grid}>
                {currentGroups.map((group, i) => (
                  <SubjectCard
                    key={i}
                    name={group.name}
                    count={group.count}
                    label={`${tabLabels[activeTab]}${group.count !== 1 ? 's' : ''}`}
                    color={group.color}
                    onPress={() => {}}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Icon name="inbox" size={48} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No {TABS[activeTab]} Yet</Text>
                <Text style={styles.emptyText}>Check back later for new content.</Text>
              </View>
            )}
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.primary },
  scroll: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 },

  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerBtn: { padding: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10 },

  pageHeader: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: colors.text },
  pageSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4 },

  segmentWrapper: { paddingHorizontal: 20, marginBottom: 20, marginTop: 12 },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: 14,
    padding: 4,
  },
  segmentTab: {
    flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 11,
  },
  segmentTabActive: { backgroundColor: colors.surface, ...shadows.card },
  segmentText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  segmentTextActive: { color: colors.text },

  selectSubjectLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    letterSpacing: 1, paddingHorizontal: 20, marginBottom: 14,
  },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, gap: 12,
  },
  subjectCard: {
    width: '46%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderTopWidth: 3,
    ...shadows.card,
  },
  subjectIcon: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  subjectName: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  subjectCount: { fontSize: 12, color: colors.textMuted },

  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 14, color: colors.textMuted },
});

export default CourseWorkScreen;
