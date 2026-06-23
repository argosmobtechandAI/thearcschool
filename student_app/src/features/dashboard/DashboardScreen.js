import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useGetDashboardQuery } from '../../store/apiSlice';
import Icon from 'react-native-vector-icons/Feather';
import { colors, shadows } from '../../theme/colors';

const DashboardScreen = ({ navigation }) => {
  const { data, isLoading, isFetching, refetch, error } = useGetDashboardQuery();

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
        <Text style={styles.errorText}>Failed to load dashboard.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refetch}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { profile, classInfo, todaySchedule, latestGrade, attendance } = data?.data || {};

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Welcome,</Text>
            <Text style={styles.studentName}>{profile?.name}</Text>
          </View>
          <TouchableOpacity 
            style={styles.notificationBtn}
            onPress={() => navigation.navigate('Home', { screen: 'Notifications' })}
          >
            <Icon name="bell" size={24} color={colors.surface} />
          </TouchableOpacity>
        </View>
        <Text style={styles.classInfo}>
          Class {classInfo?.name} • Section {classInfo?.section} • Admn: {profile?.admission_number}
        </Text>
      </View>

      <View style={styles.content}>
        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigation.navigate('Attendance')}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.secondary + '20' }]}>
              <Icon name="calendar" size={24} color={colors.secondary} />
            </View>
            <Text style={styles.statValue}>{attendance?.percentage?.toFixed(1) || 0}%</Text>
            <Text style={styles.statLabel}>Attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigation.navigate('Academics')}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.success + '20' }]}>
              <Icon name="award" size={24} color={colors.success} />
            </View>
            <Text style={styles.statValue}>{latestGrade?.percentage?.toFixed(1) || 0}%</Text>
            <Text style={styles.statLabel}>Latest Grade</Text>
          </TouchableOpacity>
        </View>

        {/* Today's Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          {todaySchedule?.length > 0 ? (
            todaySchedule.map((tt, index) => (
              <View key={index} style={styles.scheduleItem}>
                <View style={styles.timeBox}>
                  <Text style={styles.timeText}>{tt.start_time.slice(0,5)}</Text>
                  <Text style={styles.timeTextMuted}>to</Text>
                  <Text style={styles.timeText}>{tt.end_time.slice(0,5)}</Text>
                </View>
                <View style={styles.scheduleDetails}>
                  <Text style={styles.subjectText}>{tt.subject}</Text>
                  <Text style={styles.roomText}>Room: {tt.room || 'N/A'}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Icon name="coffee" size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
              <Text style={styles.emptyText}>No classes scheduled for today.</Text>
            </View>
          )}
        </View>

        {/* Latest Results */}
        {latestGrade && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Academic Performance</Text>
            <View style={styles.gradeCard}>
              <View>
                <Text style={styles.examName}>{latestGrade.examName}</Text>
                <Text style={styles.examScore}>Score: {latestGrade.obtained} / {latestGrade.total}</Text>
              </View>
              <View style={styles.gradeCircle}>
                <Text style={styles.gradeCircleText}>{latestGrade.percentage?.toFixed(0)}%</Text>
              </View>
            </View>
          </View>
        )}
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
    backgroundColor: colors.primary,
    padding: 24,
    paddingTop: 48,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...shadows.card,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 16,
    color: colors.surface,
    opacity: 0.9,
  },
  studentName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.surface,
    marginTop: 4,
  },
  notificationBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },
  classInfo: {
    fontSize: 14,
    color: colors.surface,
    opacity: 0.9,
    marginTop: 16,
  },
  content: {
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
    marginTop: -40,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    ...shadows.card,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
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
  scheduleItem: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...shadows.card,
  },
  timeBox: {
    alignItems: 'center',
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  timeTextMuted: {
    fontSize: 12,
    color: colors.textMuted,
    marginVertical: 2,
  },
  scheduleDetails: {
    flex: 1,
    paddingLeft: 16,
    justifyContent: 'center',
  },
  subjectText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  roomText: {
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
  gradeCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.card,
  },
  examName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  examScore: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  gradeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeCircleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.success,
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

export default DashboardScreen;
