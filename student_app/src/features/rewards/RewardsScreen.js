import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { colors, shadows } from '../../theme/colors';
import { useGetRewardsQuery } from '../../store/apiSlice';

const BadgeIcon = ({ level, size = 56 }) => {
  const config = {
    perfect: { emoji: '🏅', bg: '#FEF3C7', border: colors.gold },
    gold:    { emoji: '🥇', bg: '#FEF9C3', border: colors.gold },
    silver:  { emoji: '🥈', bg: '#F1F5F9', border: colors.silver },
    bronze:  { emoji: '🥉', bg: '#FEF3C7', border: colors.bronze },
    none:    { emoji: '⚪', bg: colors.border, border: colors.textMuted },
  };
  const c = config[level] || config.none;
  return (
    <View style={[styles.badgeIcon, { width: size, height: size, borderRadius: size / 2, backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={{ fontSize: size * 0.5 }}>{c.emoji}</Text>
    </View>
  );
};

const ProgressBar = ({ current, target, color }) => {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  return (
    <View style={styles.progBg}>
      <View style={[styles.progFill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
};

const RewardsScreen = () => {
  const { data, isLoading, refetch, isFetching } = useGetRewardsQuery();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const { attendance, academics, studentOfWeek } = data?.data || {};

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Icon name="star" size={22} color="#fff" />
        <Text style={styles.headerTitle}>My Rewards</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} colors={[colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>Keep up the great work and unlock rewards! 🎯</Text>

        {/* Attendance Badge */}
        <View style={[styles.card]}>
          <View style={styles.cardHeader}>
            <BadgeIcon level={attendance?.badge?.level} />
            <View style={styles.cardHeaderInfo}>
              <Text style={styles.cardTitle}>{attendance?.badge?.label || 'Attendance'}</Text>
              <Text style={styles.cardSub}>Current: {attendance?.percentage || 0}% attendance</Text>
            </View>
          </View>

          <View style={styles.milestoneRow}>
            <Icon name="calendar" size={14} color={colors.primary} />
            <Text style={styles.milestoneText}> Next goal: reach {attendance?.nextMilestone}% attendance</Text>
          </View>

          <ProgressBar
            current={attendance?.percentage || 0}
            target={attendance?.nextMilestone || 100}
            color={colors.success}
          />

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{attendance?.presentDays || 0}</Text>
              <Text style={styles.statLbl}>Days Present</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{attendance?.totalDays || 0}</Text>
              <Text style={styles.statLbl}>Total Days</Text>
            </View>
          </View>
        </View>

        {/* Academic Badge */}
        <View style={[styles.card]}>
          <View style={styles.cardHeader}>
            <BadgeIcon level={academics?.badge?.level} />
            <View style={styles.cardHeaderInfo}>
              <Text style={styles.cardTitle}>{academics?.badge?.label || 'Academics'}</Text>
              <Text style={styles.cardSub}>Current avg: {academics?.percentage || 0}%</Text>
            </View>
          </View>

          <View style={styles.milestoneRow}>
            <Icon name="trending-up" size={14} color={colors.primary} />
            <Text style={styles.milestoneText}> Next goal: reach {academics?.nextMilestone}% average grade</Text>
          </View>

          <ProgressBar
            current={academics?.percentage || 0}
            target={academics?.nextMilestone || 90}
            color={colors.primary}
          />
        </View>

        {/* How to earn rewards */}
        <View style={[styles.card, styles.howCard]}>
          <Text style={styles.howTitle}>🏆 How to Earn Rewards</Text>
          {[
            { icon: 'check-circle', color: colors.success, text: '75%+ attendance → Bronze Badge' },
            { icon: 'check-circle', color: colors.success, text: '90%+ attendance → Silver Badge' },
            { icon: 'check-circle', color: colors.gold,    text: '100% attendance → Gold Badge 🎉' },
            { icon: 'trending-up', color: colors.primary,  text: '60%+ avg grade → Bronze Academic' },
            { icon: 'trending-up', color: colors.primary,  text: '80%+ avg grade → Silver Academic' },
            { icon: 'trending-up', color: colors.gold,     text: '90%+ avg grade → Academic Excellence 🏅' },
          ].map((item, i) => (
            <View key={i} style={styles.howRow}>
              <Icon name={item.icon} size={16} color={item.color} />
              <Text style={styles.howText}>{item.text}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.primary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },

  scroll: { padding: 16, backgroundColor: colors.background },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: 20, paddingHorizontal: 4 },

  card: {
    backgroundColor: colors.surface, borderRadius: 20, padding: 20,
    marginBottom: 16, ...shadows.card,
  },

  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  badgeIcon: { borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
  cardHeaderInfo: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  cardSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },

  milestoneRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  milestoneText: { fontSize: 13, color: colors.primary, fontWeight: '600' },

  progBg: { height: 10, backgroundColor: colors.border, borderRadius: 5, overflow: 'hidden', marginBottom: 16 },
  progFill: { height: '100%', borderRadius: 5 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  statItem: { alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '800', color: colors.text },
  statLbl: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.border },

  howCard: { gap: 10 },
  howTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
  howRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  howText: { fontSize: 13, color: colors.textMuted, flex: 1 },
});

export default RewardsScreen;
