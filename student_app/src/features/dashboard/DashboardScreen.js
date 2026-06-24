import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  ActivityIndicator, TouchableOpacity, Share, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGetDashboardQuery, useGetQuoteQuery, useGetRewardsQuery, useGetNotificationsQuery } from '../../store/apiSlice';
import Icon from 'react-native-vector-icons/Feather';
import { colors, shadows } from '../../theme/colors';
import { useDrawer } from '../../navigation/DrawerContext';

const eventTypeConfig = {
  exam:     { bg: colors.examChip,     text: colors.examChipText,     label: 'EXAM' },
  event:    { bg: colors.eventChip,    text: colors.eventChipText,    label: 'EVENT' },
  academic: { bg: colors.academicChip, text: colors.academicChipText, label: 'ACADEMIC' },
};

const formatEventDate = (dateStr) => {
  if (!dateStr) return { month: '---', day: '--' };
  const d = new Date(dateStr);
  return {
    month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: d.getDate(),
  };
};

const getLetterGrade = (pct) => {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  return 'D';
};

const getTimeStatus = (startTime, endTime) => {
  if (!startTime) return null;
  const now = new Date();
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = (endTime || '23:59').split(':').map(Number);
  const start = new Date(); start.setHours(sh, sm, 0, 0);
  const end = new Date(); end.setHours(eh, em, 0, 0);
  if (now < start) return 'Next';
  if (now >= start && now <= end) return 'Now';
  return 'Done';
};

const StatChip = ({ value, label, icon, color }) => (
  <View style={[styles.statChip, { borderBottomColor: color }]}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    <Icon name={icon} size={16} color={color} style={{ marginTop: 4 }} />
  </View>
);

const DashboardScreen = ({ navigation }) => {
  const { openDrawer } = useDrawer();
  const [refreshing, setRefreshing] = useState(false);
  const { data, isLoading, refetch: refetchDash, error } = useGetDashboardQuery();
  const { data: quoteData, refetch: refetchQuote } = useGetQuoteQuery();
  const { data: rewardsData, refetch: refetchRewards } = useGetRewardsQuery();
  const { data: notificationsData, refetch: refetchNotifs } = useGetNotificationsQuery();
  const [registerFcmToken] = require('../../store/apiSlice').useRegisterFcmTokenMutation();

  useEffect(() => {
    const initNotifications = async () => {
      try {
        const { requestUserPermission, getFCMToken } = require('../../utils/notificationHandler');
        const hasPermission = await requestUserPermission();
        if (hasPermission) {
          const fcmToken = await getFCMToken();
          if (fcmToken) {
            registerFcmToken({ fcm_token: fcmToken, device_type: Platform.OS })
              .unwrap()
              .catch(err => console.log('Failed to register FCM token from dashboard:', err));
          }
        }
      } catch (err) {
        console.log('Failed to request notifications permission from dashboard:', err);
      }
    };
    initNotifications();
  }, [registerFcmToken]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchDash(), refetchQuote(), refetchRewards(), refetchNotifs()]);
    setRefreshing(false);
  }, [refetchDash, refetchQuote, refetchRewards, refetchNotifs]);

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
        <Icon name="wifi-off" size={48} color={colors.textMuted} />
        <Text style={styles.errorText}>Failed to load dashboard.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refetchDash}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { profile, classInfo, todaySchedule, avgGradePercentage, attendance, upcomingEvents } = data?.data || {};
  const quote = quoteData?.data;
  const rewards = rewardsData?.data;
  const notices = notificationsData?.data || [];
  
  const studentOfWeek = rewards?.studentOfWeek;
  const attendanceBadge = rewards?.attendance?.badge;
  const academicBadge = rewards?.academics?.badge;
  
  const initials = profile?.name
    ? profile.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
    : 'S';

  const handleShareQuote = async () => {
    if (!quote) return;
    try {
      await Share.share({ message: `"${quote.text}" — ${quote.author}` });
    } catch (_) {}
  };

  const hasBadges = 
    (attendanceBadge && attendanceBadge.level !== 'none') || 
    (academicBadge && academicBadge.level !== 'none');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 1. Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openDrawer} style={styles.headerBtn}>
          <Icon name="menu" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>The Arc School</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Notifications')}>
          <Icon name="bell" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Identity Banner */}
        <View style={[styles.card, styles.profileCard]}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileHi}>Hi, {profile?.name?.split(' ')[0] || 'Student'} 👋</Text>
            <Text style={styles.profileSub}>
              Class {classInfo?.name}-{classInfo?.section} • Roll No. {profile?.admission_number || 'N/A'}
            </Text>
          </View>
          <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.profileBtnText}>Profile</Text>
          </TouchableOpacity>
        </View>

        {/* 2. Daily Motivation: Thought of the Day */}
        {quote && (
          <View style={styles.quoteCard}>
            <View style={styles.quoteHeader}>
              <Text style={styles.quoteTag}>THOUGHT FOR THE DAY</Text>
              <TouchableOpacity onPress={handleShareQuote}>
                <Icon name="share-2" size={18} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            </View>
            <Text style={styles.quoteText}>"{quote.text}"</Text>
            <Text style={styles.quoteAuthor}>— {quote.author}</Text>
          </View>
        )}

        {/* 2. Daily Motivation: Student of the Week */}
        {studentOfWeek && (
          <View style={[styles.card, styles.sotwCard]}>
            <View style={styles.sotwHeader}>
              <View style={styles.sotwTitleRow}>
                <Text style={styles.sotwIcon}>🏆</Text>
                <View>
                  <Text style={styles.sotwTitle}>STUDENT OF THE WEEK</Text>
                  <Text style={styles.sotwDate}>{studentOfWeek.weekRange}</Text>
                </View>
              </View>
              {classInfo && <Text style={styles.sotwClass}>Class {classInfo.name}-{classInfo.section}</Text>}
            </View>
            <View style={styles.sotwBody}>
              <View style={styles.sotwAvatar}>
                <Text style={styles.sotwAvatarText}>{studentOfWeek.initials}</Text>
                <View style={styles.sotwStar}><Text style={{ fontSize: 10 }}>⭐</Text></View>
              </View>
              <View style={styles.sotwInfo}>
                <Text style={styles.sotwName}>{studentOfWeek.name}</Text>
                <View style={styles.sotwAchievements}>
                  {studentOfWeek.achievements.slice(0, 3).map((ach, i) => (
                    <View key={i} style={styles.sotwAchRow}>
                      <Icon name="check-circle" size={13} color={colors.success} />
                      <Text style={styles.sotwAchText}>{ach}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* 3. Utility: Quick Action Cards */}
        <View style={styles.actionCardsRow}>
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: '#3B82F6' }]}
            onPress={() => navigation.navigate('Fees')}
            activeOpacity={0.8}
          >
            <View style={styles.actionCardIconBox}>
              <Icon name="credit-card" size={18} color="#3B82F6" />
            </View>
            <Text style={styles.actionCardTitle}>Pending{'\n'}Fees</Text>
            <Icon name="credit-card" size={64} color="rgba(255,255,255,0.15)" style={styles.actionCardWatermark} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: '#A855F7' }]}
            onPress={() => navigation.navigate('Result')}
            activeOpacity={0.8}
          >
            <View style={styles.actionCardIconBox}>
              <Icon name="trending-up" size={18} color="#A855F7" />
            </View>
            <Text style={styles.actionCardTitle}>Check{'\n'}Results</Text>
            {avgGradePercentage !== undefined && avgGradePercentage > 0 && (
              <Text style={styles.actionCardSubtitle}>Avg: {avgGradePercentage}% ({getLetterGrade(avgGradePercentage)})</Text>
            )}
            <Icon name="trending-up" size={64} color="rgba(255,255,255,0.15)" style={styles.actionCardWatermark} />
          </TouchableOpacity>
        </View>
        <View style={styles.actionCardsRow}>
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: '#10B981' }]}
            onPress={() => navigation.navigate('Consents')}
            activeOpacity={0.8}
          >
            <View style={styles.actionCardIconBox}>
              <Icon name="file-text" size={18} color="#10B981" />
            </View>
            <Text style={styles.actionCardTitle}>View{'\n'}Consents</Text>
            <Icon name="file-text" size={64} color="rgba(255,255,255,0.15)" style={styles.actionCardWatermark} />
          </TouchableOpacity>
        </View>

        {/* 4. Reward: Trophy Cabinet removed for now */}

        {/* 5. Performance: Stat Chips */}
        <View style={styles.statsRow}>
          <StatChip
            value={`${attendance?.percentage?.toFixed(0) || 0}%`}
            label="ATTENDANCE"
            icon="check-circle"
            color={colors.success}
          />
          <StatChip
            value={avgGradePercentage > 0 ? `${avgGradePercentage}% (${getLetterGrade(avgGradePercentage)})` : 'N/A'}
            label="AVG GRADE"
            icon="trending-up"
            color={colors.primary}
          />
        </View>

        {/* 6. Schedule: Today's Classes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Classes</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Class')}>
              <Text style={styles.sectionLink}>View Full</Text>
            </TouchableOpacity>
          </View>
          {todaySchedule?.length > 0 ? (
            todaySchedule.map((tt, index) => {
              const status = getTimeStatus(tt.start_time, tt.end_time);
              const statusColors = {
                Next: { bg: colors.primary + '20', text: colors.primary },
                Now:  { bg: colors.success + '20', text: colors.success },
                Done: { bg: colors.border,          text: colors.textMuted },
              };
              const sc = statusColors[status] || statusColors.Done;
              return (
                <View key={index} style={[styles.card, styles.classCard]}>
                  <View style={styles.classAccent} />
                  <View style={styles.classInfo}>
                    <Text style={styles.className}>{tt.subject}</Text>
                    <View style={styles.classMetaRow}>
                      <Icon name="clock" size={12} color={colors.textMuted} />
                      <Text style={styles.classMeta}>  {tt.start_time?.slice(0,5)} AM</Text>
                      <Icon name="map-pin" size={12} color={colors.textMuted} style={{ marginLeft: 8 }} />
                      <Text style={styles.classMeta}>  Room {tt.room || 'N/A'}</Text>
                    </View>
                  </View>
                  {status && (
                    <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                      <Text style={[styles.statusText, { color: sc.text }]}>{status}</Text>
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <View style={[styles.card, styles.emptyCard]}>
              <Icon name="coffee" size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
              <Text style={styles.emptyText}>No classes scheduled for today.</Text>
            </View>
          )}
        </View>

        {/* 7. Alerts: Notice Board */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { fontSize: 18 }]}>Notice Board</Text>
            {notices.length > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
                <Text style={styles.sectionLink}>View All</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={[styles.card, { paddingVertical: 8 }]}>
            {notices.length > 0 ? (
              notices.slice(0, 2).map((notif, index) => {
                const isLast = index === Math.min(notices.length, 2) - 1;
                let timeText = '';
                if (notif.created_at) {
                  const d = new Date(notif.created_at);
                  const today = new Date();
                  const diffTime = Math.abs(today - d);
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  if (d.toDateString() === today.toDateString()) {
                    timeText = 'Today, ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                  } else if (diffDays === 1) {
                    timeText = 'Yesterday';
                  } else {
                    timeText = d.toLocaleDateString();
                  }
                }
                
                return (
                  <React.Fragment key={notif.id || index}>
                    <TouchableOpacity 
                      style={styles.noticeRow}
                      onPress={() => navigation.navigate('Notifications')}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.noticeIconBox, { backgroundColor: colors.primary + '15' }]}>
                        <Icon name="bell" size={16} color={colors.primary} />
                      </View>
                      <View style={styles.noticeInfo}>
                        <Text style={styles.noticeTitle} numberOfLines={1}>{notif.title || 'Notice'}</Text>
                        <Text style={styles.noticeTime}>{timeText}</Text>
                      </View>
                    </TouchableOpacity>
                    {!isLast && <View style={styles.noticeDivider} />}
                  </React.Fragment>
                );
              })
            ) : (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <Icon name="bell-off" size={24} color={colors.textMuted} style={{ marginBottom: 6 }} />
                <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '500' }}>No announcements</Text>
              </View>
            )}
          </View>
        </View>

        {/* 8. Preparedness: Upcoming Events */}
        {upcomingEvents?.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="calendar" size={16} color={colors.text} />
                <Text style={styles.sectionTitle}>Upcoming Events</Text>
              </View>
            </View>
            {upcomingEvents.map((ev, index) => {
              const { month, day } = formatEventDate(ev.date);
              const typeKey = (ev.type || 'event').toLowerCase();
              const chip = eventTypeConfig[typeKey] || eventTypeConfig.event;
              return (
                <View key={index} style={[styles.card, styles.eventCard]}>
                  <View style={styles.eventDate}>
                    <Text style={styles.eventMonth}>{month}</Text>
                    <Text style={styles.eventDay}>{day}</Text>
                  </View>
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle}>{ev.title}</Text>
                    <Text style={styles.eventDesc} numberOfLines={1}>{ev.description}</Text>
                  </View>
                  <View style={[styles.eventChip, { backgroundColor: chip.bg }]}>
                    <Text style={[styles.eventChipText, { color: chip.text }]}>{chip.label}</Text>
                  </View>
                </View>
              );
            })}
            <TouchableOpacity 
              style={styles.viewCalendarBtn}
              onPress={() => navigation.navigate('AcademicCalendar')}
            >
              <Text style={styles.viewCalendarText}>View Full Calendar</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.primary },
  scroll: { flex: 1, backgroundColor: colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  errorText: { fontSize: 16, color: colors.textMuted, marginTop: 16, marginBottom: 16 },
  retryButton: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '700' },

  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerBtn: { padding: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10 },

  card: { backgroundColor: colors.surface, borderRadius: 16, ...shadows.card, marginHorizontal: 16, marginBottom: 12 },

  // Identity Banner
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: 16, marginTop: 16 },
  avatarCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: '700', color: colors.primary },
  profileInfo: { flex: 1 },
  profileHi: { fontSize: 16, fontWeight: '700', color: colors.text },
  profileSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  profileBtn: { backgroundColor: colors.primary + '15', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  profileBtnText: { fontSize: 13, fontWeight: '700', color: colors.primary },

  // Quote
  quoteCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 20, backgroundColor: colors.purple, padding: 20, ...shadows.heavy },
  quoteHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  quoteTag: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
  quoteText: { fontSize: 17, fontStyle: 'italic', color: '#fff', lineHeight: 26, marginBottom: 12, fontWeight: '500' },
  quoteAuthor: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'right', fontWeight: '600' },

  // SOTW
  sotwCard: { padding: 16 },
  sotwHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  sotwTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sotwIcon: { fontSize: 22 },
  sotwTitle: { fontSize: 12, fontWeight: '700', color: colors.warning, letterSpacing: 0.5 },
  sotwDate: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  sotwClass: { fontSize: 12, fontWeight: '700', color: colors.primary, backgroundColor: colors.primary + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  sotwBody: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sotwAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.purple, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  sotwAvatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  sotwStar: { position: 'absolute', bottom: -2, right: -2, backgroundColor: colors.warning, borderRadius: 10, padding: 2 },
  sotwInfo: { flex: 1 },
  sotwName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 6 },
  sotwAchievements: { gap: 4 },
  sotwAchRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  sotwAchText: { fontSize: 12, color: colors.textMuted },

  // Action Cards Row
  actionCardsRow: { flexDirection: 'row', marginHorizontal: 16, gap: 12, marginBottom: 20 },
  actionCard: { flex: 1, borderRadius: 16, padding: 16, overflow: 'hidden', position: 'relative' },
  actionCardIconBox: { width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  actionCardTitle: { color: '#fff', fontSize: 16, fontWeight: '800', lineHeight: 22, zIndex: 1 },
  actionCardSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600', marginTop: 4, zIndex: 1 },
  actionCardWatermark: { position: 'absolute', right: -10, bottom: -10, zIndex: 0 },

  // Badges / Trophy Cabinet
  badgeCard: { width: 140, backgroundColor: colors.surface, padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center', ...shadows.card },
  badgeIconBg: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  badgeLabel: { fontSize: 13, fontWeight: '700', color: colors.text, textAlign: 'center' },

  // Stats Row
  statsRow: { flexDirection: 'row', marginHorizontal: 16, gap: 10, marginBottom: 20 },
  statChip: { flex: 1, backgroundColor: colors.surface, borderRadius: 14, padding: 12, alignItems: 'center', borderBottomWidth: 3, ...shadows.card },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600', letterSpacing: 0.5, marginTop: 2 },

  // Sections
  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  sectionLink: { fontSize: 13, fontWeight: '600', color: colors.primary },

  // Class cards
  classCard: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  classAccent: { width: 4, height: 40, backgroundColor: colors.primary, borderRadius: 2 },
  classInfo: { flex: 1 },
  className: { fontSize: 15, fontWeight: '700', color: colors.text },
  classMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  classMeta: { fontSize: 12, color: colors.textMuted },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '700' },

  // Empty
  emptyCard: { padding: 24, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 14 },

  // Notice Board
  noticeRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  noticeIconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  noticeInfo: { flex: 1 },
  noticeTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 2 },
  noticeTime: { fontSize: 12, color: colors.textMuted },
  noticeDivider: { height: 1, backgroundColor: colors.border, marginLeft: 64 },

  // Events
  eventCard: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  eventDate: { alignItems: 'center', minWidth: 36 },
  eventMonth: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5 },
  eventDay: { fontSize: 22, fontWeight: '800', color: colors.text },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  eventDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  eventChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  eventChipText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  viewCalendarBtn: { backgroundColor: colors.background, paddingVertical: 12, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, marginHorizontal: 16, marginTop: -12, marginBottom: 12 },
  viewCalendarText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
});

export default DashboardScreen;
