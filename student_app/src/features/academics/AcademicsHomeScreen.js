import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useGetAcademicsQuery } from '../../store/apiSlice';
import Icon from 'react-native-vector-icons/Feather';
import { colors, shadows } from '../../theme/colors';
import { format } from 'date-fns';

const AcademicsHomeScreen = ({ navigation }) => {
  const { data, isLoading, isFetching, refetch, error } = useGetAcademicsQuery();

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load academics data.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refetch}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { grades = [], upcomingExams = [] } = data || {};

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Academics</Text>
      </View>

      <View style={styles.content}>
        {/* Upcoming Exams */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Exams</Text>
          {upcomingExams.length > 0 ? (
            upcomingExams.map((exam, index) => (
              <View key={index} style={styles.examCard}>
                <View style={styles.dateBox}>
                  <Text style={styles.dateDay}>{format(new Date(exam.date), 'dd')}</Text>
                  <Text style={styles.dateMonth}>{format(new Date(exam.date), 'MMM')}</Text>
                </View>
                <View style={styles.examDetails}>
                  <Text style={styles.subjectText}>{exam.subject?.name}</Text>
                  <Text style={styles.timeText}>{exam.start_time.slice(0,5)} - {exam.end_time.slice(0,5)}</Text>
                </View>
                <Icon name="calendar" size={20} color={colors.primary} />
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Icon name="check-circle" size={32} color={colors.success} style={{ marginBottom: 8 }} />
              <Text style={styles.emptyText}>No upcoming exams scheduled.</Text>
            </View>
          )}
        </View>

        {/* Academic Results */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exam Results</Text>
          {grades.length > 0 ? (
            grades.map((grade, index) => {
              const percentage = grade.exams?.marks > 0 ? (grade.marks / grade.exams.marks) * 100 : 0;
              let scoreColor = colors.success;
              if (percentage < 40) scoreColor = colors.danger;
              else if (percentage < 70) scoreColor = colors.warning;

              return (
                <View key={index} style={styles.resultCard}>
                  <View style={styles.resultHeader}>
                    <Text style={styles.examNameText}>{grade.exams?.name}</Text>
                    <Text style={styles.examDateText}>{format(new Date(grade.exams?.date), 'MMM dd, yyyy')}</Text>
                  </View>
                  <View style={styles.resultBody}>
                    <View style={styles.scoreBox}>
                      <Text style={[styles.scorePercentage, { color: scoreColor }]}>{percentage.toFixed(0)}%</Text>
                      <Text style={styles.scoreRaw}>{grade.marks} / {grade.exams?.marks}</Text>
                    </View>
                    {grade.feedback && (
                      <View style={styles.feedbackBox}>
                        <Icon name="message-circle" size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
                        <Text style={styles.feedbackText} numberOfLines={2}>{grade.feedback}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No exam results published yet.</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  examCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    ...shadows.card,
  },
  dateBox: {
    backgroundColor: colors.primary + '15',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    width: 60,
  },
  dateDay: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  dateMonth: {
    fontSize: 12,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  examDetails: {
    flex: 1,
    paddingHorizontal: 16,
  },
  subjectText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  timeText: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...shadows.card,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: 12,
    marginBottom: 12,
  },
  examNameText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  examDateText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  resultBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreBox: {
    alignItems: 'center',
    marginRight: 20,
    minWidth: 60,
  },
  scorePercentage: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scoreRaw: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  feedbackBox: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: 8,
  },
  feedbackText: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 16,
    color: colors.danger,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AcademicsHomeScreen;
