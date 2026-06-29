import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, FlatList, Alert, Linking
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import RNFS from 'react-native-fs';
import FileViewer from 'react-native-file-viewer';
import { colors, shadows } from '../../theme/colors';
import { useGetCourseWorkQuery } from '../../store/apiSlice';
import CustomHeader from '../../components/CustomHeader';
import { theme } from '../../theme/theme';

const TABS = ['Study Material', 'Assignments', 'Homework'];
const TAB_TYPES = ['study_material', 'assignment', 'homework'];

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

const CourseWorkScreen = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedSubject, setSelectedSubject] = useState(null); // String name of subject
  const [downloadingFile, setDownloadingFile] = useState(null); // Track which file is downloading

  const { data: courseData, isLoading, isFetching, refetch } = useGetCourseWorkQuery();
  const courseworkItems = courseData?.courses || [];

  const onRefresh = async () => {
    await refetch();
  };

  // Filter items by type first
  const currentType = TAB_TYPES[activeTab];
  const itemsFilteredByType = courseworkItems.filter(item => item.type === currentType);

  // Group coursework items of the current type by subject name
  const subjectGroups = (() => {
    const map = {};
    itemsFilteredByType.forEach(item => {
      const subj = item.subject || 'General';
      if (!map[subj]) map[subj] = [];
      map[subj].push(item);
    });
    return Object.entries(map).map(([name, list], i) => ({
      name,
      count: list.length,
      items: list,
      color: subjectColors[i % subjectColors.length],
    }));
  })();

  const activeGroup = selectedSubject ? subjectGroups.find(g => g.name === selectedSubject) : null;
  const [statusFilter, setStatusFilter] = useState('All'); // 'All', 'Pending', 'Submitted'
  const [sortOrder, setSortOrder] = useState('Newest First'); // 'Newest First', 'Oldest First'

  // Filter and sort active group items
  const displayItems = (activeGroup?.items || [])
    .filter(item => {
      if (activeTab === 0) return true; // Study Material has no status filter
      if (statusFilter === 'All') return true;
      if (statusFilter === 'Pending' && !item.isSubmitted) return true;
      if (statusFilter === 'Submitted' && item.isSubmitted) return true;
      return false;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date || a.created_at || 0);
      const dateB = new Date(b.date || b.created_at || 0);
      if (sortOrder === 'Newest First') return dateB - dateA;
      return dateA - dateB;
    });

  const handleDownload = async (fileUrl) => {
    if (!fileUrl) return;
    try {
      setDownloadingFile(fileUrl);
      const formattedUrl = fileUrl.startsWith('http') ? fileUrl : `https://${fileUrl}`;
      const supported = await Linking.canOpenURL(formattedUrl);
      if (supported) {
        await Linking.openURL(formattedUrl);
      } else {
        Alert.alert('Error', 'Cannot open this file type on this device.');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not open attachment link.');
    } finally {
      setDownloadingFile(null);
    }
  };

  const renderDetailItem = ({ item }) => {
    const isMaterial = item.type === 'study_material';
    return (
      <View style={styles.detailCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Text style={[styles.detailTitle, { flex: 1 }]}>{item.title}</Text>
          {!isMaterial && (
            <View style={[styles.statusChip, { backgroundColor: item.isSubmitted ? colors.success + '20' : colors.warning + '20' }]}>
              <Text style={[styles.statusChipText, { color: item.isSubmitted ? colors.success : colors.warning }]}>
                {item.isSubmitted ? 'Submitted' : 'Pending'}
              </Text>
            </View>
          )}
        </View>
        
        {/* Structured layout exactly matching client requirements */}
        <View style={styles.clientFormatContainer}>
          {item.date && (
            <Text style={styles.formatRow}>
              🗓 <Text style={styles.boldText}>Date: </Text>{item.date} {item.day ? `(${item.day})` : ''}
            </Text>
          )}

          <Text style={styles.formatRow}>
            📚 <Text style={styles.boldText}>Subject: </Text>{item.subject}
          </Text>

          {item.chapter && (
            <Text style={styles.formatRow}>
              ▫️ <Text style={styles.boldText}>Chapter Name: </Text>{item.chapter}
            </Text>
          )}

          {item.unit && (
            <Text style={styles.formatRow}>
              ▫️ <Text style={styles.boldText}>Unit: </Text>{item.unit} {item.lesson_no ? `| Lesson No.: ${item.lesson_no}` : ''}
            </Text>
          )}

          {item.topics_taught && (
            <Text style={styles.formatRow}>
              ▫️ <Text style={styles.boldText}>Topics Taught: </Text>{item.topics_taught}
            </Text>
          )}

          {item.page_number && (
            <Text style={styles.formatRow}>
              ▫️ <Text style={styles.boldText}>Page Number: </Text>{item.page_number}
            </Text>
          )}

          {item.others && (
            <Text style={styles.formatRow}>
              ▫️ <Text style={styles.boldText}>Others (Notes): </Text>{item.others}
            </Text>
          )}

          {!isMaterial && item.homework && (
            <View style={styles.homeworkBlock}>
              <Text style={styles.formatRow}>
                ◻️ <Text style={styles.boldText}>Homework: </Text>{item.homework}
              </Text>
            </View>
          )}

          {!isMaterial && item.duedate && (
            <Text style={styles.formatRow}>
              ◻️ <Text style={styles.boldText}>Submission Date: </Text>{item.duedate}
            </Text>
          )}

          {item.description && !item.others && (
            <Text style={styles.formatRow}>
              📄 <Text style={styles.boldText}>Instructions: </Text>{item.description}
            </Text>
          )}
        </View>

        {/* Attachment download */}
        {item.file_url && (
          <TouchableOpacity 
            style={styles.downloadBtn} 
            onPress={() => handleDownload(item.file_url)}
            disabled={downloadingFile === item.file_url}
          >
            {downloadingFile === item.file_url ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="download" size={14} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.downloadBtnText}>Download Attachment</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <CustomHeader title="My Coursework" showBack={true} />

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={isFetching || false} onRefresh={onRefresh} colors={[colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>My Coursework</Text>
          <Text style={styles.pageSubtitle}>Access study materials, assignments, and daily homework</Text>
        </View>

        {/* Tab Selection */}
        <View style={styles.segmentWrapper}>
          <View style={styles.segment}>
            {TABS.map((tab, i) => (
              <TouchableOpacity
                key={tab}
                style={[styles.segmentTab, activeTab === i && styles.segmentTabActive]}
                onPress={() => { setActiveTab(i); setSelectedSubject(null); setStatusFilter('All'); setSortOrder('Newest First'); }}
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

            {subjectGroups.length > 0 ? (
              <View style={styles.grid}>
                {subjectGroups.map((group, i) => (
                  <SubjectCard
                    key={i}
                    name={group.name}
                    count={group.count}
                    label={`${currentType === 'study_material' ? 'Material' : currentType}${group.count !== 1 ? 's' : ''}`}
                    color={group.color}
                    onPress={() => setSelectedSubject(group.name)}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Icon name="inbox" size={48} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No {TABS[activeTab]} Yet</Text>
                <Text style={styles.emptyText}>Check back later for new uploads.</Text>
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Lightbox list modal for selected subject */}
      {selectedSubject && activeGroup && (
        <Modal visible={true} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedSubject} - {TABS[activeTab]}</Text>
                <TouchableOpacity onPress={() => setSelectedSubject(null)}>
                  <Icon name="x" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {activeTab !== 0 && (
                <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginBottom: 12, gap: 8 }}>
                  {['All', 'Pending', 'Submitted'].map(f => (
                    <TouchableOpacity
                      key={f}
                      style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}
                      onPress={() => setStatusFilter(f)}
                    >
                      <Text style={[styles.filterChipText, statusFilter === f && styles.filterChipTextActive]}>{f}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {activeTab === 0 && (
                <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginBottom: 12, gap: 8 }}>
                  {['Newest First', 'Oldest First'].map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.filterChip, sortOrder === s && styles.filterChipActive]}
                      onPress={() => setSortOrder(s)}
                    >
                      <Text style={[styles.filterChipText, sortOrder === s && styles.filterChipTextActive]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <FlatList
                data={displayItems}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderDetailItem}
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 },

  pageHeader: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: colors.text, fontFamily: theme.typography.fontFamily.heading },
  pageSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, fontFamily: theme.typography.fontFamily.medium },

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
  segmentText: { fontSize: 13, fontWeight: '600', color: colors.textMuted, fontFamily: theme.typography.fontFamily.bold },
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
  subjectName: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4, fontFamily: theme.typography.fontFamily.bold },
  subjectCount: { fontSize: 12, color: colors.textMuted, fontFamily: theme.typography.fontFamily.medium },

  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, fontFamily: theme.typography.fontFamily.heading },
  emptyText: { fontSize: 14, color: colors.textMuted, fontFamily: theme.typography.fontFamily.medium },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '80%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, fontFamily: theme.typography.fontFamily.heading },

  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.border, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.primary + '15', borderColor: colors.primary },
  filterChipText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  filterChipTextActive: { color: colors.primary },
  
  statusChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusChipText: { fontSize: 11, fontWeight: '700' },

  detailCard: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginBottom: 16 },
  detailTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12, fontFamily: theme.typography.fontFamily.bold },
  
  clientFormatContainer: { gap: 6, marginBottom: 12 },
  formatRow: { fontSize: 13, color: colors.textMuted, fontFamily: theme.typography.fontFamily.medium, lineHeight: 18 },
  boldText: { fontWeight: '700', color: colors.text, fontFamily: theme.typography.fontFamily.bold },
  homeworkBlock: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 6, marginTop: 4 },

  downloadBtn: { flexDirection: 'row', backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16, alignSelf: 'flex-start', alignItems: 'center' },
  downloadBtnText: { color: '#fff', fontSize: 13, fontWeight: '600', fontFamily: theme.typography.fontFamily.bold }
});

export default CourseWorkScreen;
