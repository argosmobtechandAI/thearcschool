import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useGetAcademicsQuery } from '../../store/apiSlice';
import Icon from 'react-native-vector-icons/Feather';
import { theme } from '../../theme/theme';
import { format } from 'date-fns';
import Card from '../../components/Card';
import Button from '../../components/Button';

const AcademicsHomeScreen = ({ navigation }) => {
  const { data, isLoading, isFetching, refetch, error } = useGetAcademicsQuery();

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load academics data.</Text>
        <Button label="Retry" onPress={refetch} variant="primary" />
      </View>
    );
  }

  const { grades = [], upcomingExams = [] } = data || {};

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isFetching || false} onRefresh={refetch} colors={[theme.colors.primary]} />}
      showsVerticalScrollIndicator={false}
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
              <Card variant="elevated" key={index} style={styles.examCard}>
                <View style={styles.dateBox}>
                  <Text style={styles.dateDay}>{format(new Date(exam.date), 'dd')}</Text>
                  <Text style={styles.dateMonth}>{format(new Date(exam.date), 'MMM')}</Text>
                </View>
                <View style={styles.examDetails}>
                  <Text style={styles.subjectText}>{exam.subject?.name}</Text>
                  <Text style={styles.timeText}>{exam.start_time.slice(0,5)} - {exam.end_time.slice(0,5)}</Text>
                </View>
                <Icon name="calendar" size={20} color={theme.colors.primary} />
              </Card>
            ))
          ) : (
            <Card variant="flat" style={styles.emptyCard}>
              <Icon name="check-circle" size={32} color={theme.colors.success} style={{ marginBottom: 8 }} />
              <Text style={styles.emptyText}>No upcoming exams scheduled.</Text>
            </Card>
          )}
        </View>

        {/* Academic Results */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exam Results</Text>
          {grades.length > 0 ? (
            grades.map((grade, index) => {
              const percentage = grade.exams?.marks > 0 ? (grade.marks / grade.exams.marks) * 100 : 0;
              let scoreColor = theme.colors.success;
              if (percentage < 40) scoreColor = theme.colors.danger;
              else if (percentage < 70) scoreColor = theme.colors.warning;

              return (
                <Card variant="elevated" key={index} style={styles.resultCard}>
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
                        <Icon name="message-circle" size={14} color={theme.colors.textMuted} style={{ marginRight: 6 }} />
                        <Text style={styles.feedbackText} numberOfLines={2}>{grade.feedback}</Text>
                      </View>
                    )}
                  </View>
                </Card>
              );
            })
          ) : (
            <Card variant="flat" style={styles.emptyCard}>
              <Text style={styles.emptyText}>No exam results published yet.</Text>
            </Card>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    paddingTop: theme.layout.padding.screen + 40, // Account for notch
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.xxl,
    fontFamily: theme.typography.fontFamily.heading,
    color: theme.colors.text,
  },
  content: {
    padding: theme.spacing.md,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.heading,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  examCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  dateBox: {
    backgroundColor: theme.colors.primary + '15',
    padding: 10,
    borderRadius: theme.layout.borderRadius.md,
    alignItems: 'center',
    width: 60,
  },
  dateDay: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.heading,
    color: theme.colors.primary,
  },
  dateMonth: {
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.primary,
    textTransform: 'uppercase',
  },
  examDetails: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
  },
  subjectText: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
  },
  timeText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.medium,
  },
  resultCard: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    paddingBottom: 12,
    marginBottom: 12,
  },
  examNameText: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
  },
  examDateText: {
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.textMuted,
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
    fontFamily: theme.typography.fontFamily.heading,
  },
  scoreRaw: {
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  feedbackBox: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    padding: 10,
    borderRadius: theme.layout.borderRadius.md,
  },
  feedbackText: {
    flex: 1,
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.danger,
    marginBottom: theme.spacing.md,
  },
});

export default AcademicsHomeScreen;
