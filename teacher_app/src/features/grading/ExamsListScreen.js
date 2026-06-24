import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useSelector } from 'react-redux';
import { useGetExamsQuery } from '../../store/apiSlice';
import { colors, shadows } from '../../theme/colors';
import CustomHeader from '../../components/CustomHeader';

const ExamsListScreen = ({ navigation }) => {
  const { activeClassId } = useSelector((state) => state.app);
  const { data: examsResponse, isLoading: loading, refetch, isFetching } = useGetExamsQuery(activeClassId);
  const [exams, setExams] = useState([]);

  const onRefresh = React.useCallback(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (examsResponse?.exams) {
      setExams(examsResponse.exams);
    }
  }, [examsResponse]);

  const handleSelectExam = (exam) => {
    navigation.navigate('MarksEntryScreen', { examId: exam.id, examDetails: exam });
  };

  return (
    <View style={styles.container}>
      <CustomHeader title="Grading & Marks" />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        <TouchableOpacity 
          style={styles.actionCard} 
          onPress={() => navigation.navigate('DateSheetScreen')}
          activeOpacity={0.8}
        >
          <View style={styles.actionIconContainer}>
            <Icon name="calendar" size={24} color={colors.primary} />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Date Sheet Calendar</Text>
            <Text style={styles.actionSubtitle}>View upcoming exams and schedules</Text>
          </View>
          <Icon name="chevron-right" size={20} color={colors.border} />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Active Assessments</Text>
        
        {loading ? (
          <ActivityIndicator color={colors.warning} style={{ marginTop: 20 }} />
        ) : exams.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="book" size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>No exams assigned to you yet.</Text>
          </View>
        ) : (
          exams.map((exam) => (
            <TouchableOpacity key={exam.id} style={styles.examCard} onPress={() => handleSelectExam(exam)}>
              <View style={styles.examHeader}>
                <View>
                  <Text style={styles.examTitle}>{exam.title}</Text>
                  <Text style={styles.examTerm}>{exam.term}</Text>
                </View>
                <View style={[
                  styles.statusBadge, 
                  { backgroundColor: exam.status === 'Completed' ? colors.success + '20' : colors.warning + '20' }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: exam.status === 'Completed' ? colors.success : colors.warning }
                  ]}>{exam.status}</Text>
                </View>
              </View>
              
              <View style={styles.examDetails}>
                <View style={styles.detailBox}>
                  <Icon name="users" size={16} color={colors.textMuted} style={styles.detailIcon} />
                  <Text style={styles.detailText}>Class {exam.className || exam.class}</Text>
                </View>
                <View style={styles.detailBox}>
                  <Icon name="book-open" size={16} color={colors.textMuted} style={styles.detailIcon} />
                  <Text style={styles.detailText}>{exam.subject}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 24, paddingBottom: 100 },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionTextContainer: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 2 },
  actionSubtitle: { fontSize: 13, color: colors.textMuted },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 16 },
  emptyState: { alignItems: 'center', padding: 32 },
  emptyText: { color: colors.textMuted, marginTop: 12 },
  examCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  examTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  examTerm: { fontSize: 12, color: colors.textMuted },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  examDetails: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  detailBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  detailIcon: { marginRight: 8 },
  detailText: { fontSize: 14, color: colors.text, fontWeight: '500' },
});

export default ExamsListScreen;
