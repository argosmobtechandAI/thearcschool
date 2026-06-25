import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  ActivityIndicator, TouchableOpacity, Share, Platform,
  Animated, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  useGetDashboardQuery, 
  useGetNotificationsQuery,
  useGetConsentsQuery,
  useGetFeesQuery,
  useGetTimetableQuery
} from '../../store/apiSlice';
import Icon from 'react-native-vector-icons/Feather';
import { theme } from '../../theme/theme';
import { useDrawer } from '../../navigation/DrawerContext';
import { PieChart } from 'react-native-gifted-charts';

const { width } = Dimensions.get('window');

const getLetterGrade = (pct) => {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  return 'D';
};

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  return timeStr.substring(0, 5);
};

// Quick Action Bubble
const QuickAction = ({ title, iconName, color, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => Animated.spring(scale, { toValue: 0.9, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={[styles.quickActionContainer, { transform: [{ scale }] }]}>
      <TouchableOpacity 
        style={styles.quickActionBtn}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <View style={[styles.quickActionIconBox, { backgroundColor: color + '20', borderColor: color + '30' }]}>
          <Icon name={iconName} size={24} color={color} />
        </View>
        <Text style={styles.quickActionTitle} numberOfLines={1}>{title}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Number Metric Card
const NumberMetricCard = ({ number, label, iconName, color, onPress }) => {
  return (
    <TouchableOpacity 
      style={[styles.numberCard, { backgroundColor: color, overflow: 'hidden' }]} 
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Background Watermark Icon */}
      <Icon name={iconName} size={70} color="rgba(255,255,255,0.15)" style={{ position: 'absolute', right: -10, bottom: -10 }} />
      
      {/* Small Icon Badge */}
      <View style={styles.numberIconBoxSolid}>
        <Icon name={iconName} size={16} color={color} />
      </View>
      
      {/* Content */}
      <View style={{ marginTop: 16 }}>
        <Text style={[styles.numberCardValue, { color: '#fff' }]}>{number}</Text>
        <Text style={[styles.numberCardLabel, { color: 'rgba(255,255,255,0.9)' }]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
};

// Stat Chart Ring (Real Data)
const StatChartRing = ({ percentage, valueLabel, title, subtitle, color, iconName = 'activity' }) => {
  const pieData = [
    { value: percentage, color: color },
    { value: 100 - percentage > 0 ? 100 - percentage : 0, color: color + '15' }
  ];

  return (
    <View style={[styles.statRingCard, { borderColor: color + '30' }]}>
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: color + '08', borderRadius: 24 }]} />
      
      {/* Decorative Icon */}
      <Icon name={iconName} size={80} color={color + '05'} style={{ position: 'absolute', top: -10, right: -15, transform: [{ rotate: '15deg' }] }} />

      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <View style={styles.pieChartBg}>
          <PieChart
            donut
            isAnimated
            animationDuration={1000}
            radius={40}
            innerRadius={28}
            data={pieData}
            centerLabelComponent={() => {
              return <Text style={[styles.ringCenterText, { color }]}>{valueLabel}</Text>;
            }}
          />
        </View>
      </View>
      <View style={{ marginTop: 16, alignItems: 'center' }}>
        <Text style={[styles.ringTitle, { color: '#1E293B' }]} numberOfLines={1}>{title}</Text>
        <View style={[styles.subtitleBadge, { backgroundColor: color + '15' }]}>
          <Text style={[styles.ringSubtitle, { color: color }]} numberOfLines={1}>{subtitle}</Text>
        </View>
      </View>
    </View>
  );
};

const DashboardScreen = ({ navigation }) => {
  const { openDrawer } = useDrawer();
    
  const { data, isLoading, isFetching, refetch: refetchDash, error } = useGetDashboardQuery();
  const { data: notificationsData, refetch: refetchNotifs } = useGetNotificationsQuery();
  const { data: consentsData, refetch: refetchConsents } = useGetConsentsQuery();
  const { data: feesData, refetch: refetchFees } = useGetFeesQuery();
  const { data: timetableData, refetch: refetchTimetable } = useGetTimetableQuery();
  
  const classId = data?.data?.classInfo?.id;
  const { data: sotwResponse, refetch: refetchSotw } = require('../../store/apiSlice').useGetStudentOfWeekQuery(classId, { skip: !classId });
  const studentOfWeek = sotwResponse?.data;
  
  const [registerFcmToken] = require('../../store/apiSlice').useRegisterFcmTokenMutation();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    const initNotifications = async () => {
      try {
        const { requestUserPermission, getFCMToken } = require('../../utils/notificationHandler');
        const hasPermission = await requestUserPermission();
        if (hasPermission) {
          const fcmToken = await getFCMToken();
          if (fcmToken) {
            registerFcmToken({ fcm_token: fcmToken, device_type: Platform.OS })
              .unwrap()
              .catch(err => console.log('Failed to register FCM token:', err));
          }
        }
      } catch (err) {}
    };
    initNotifications();
  }, [registerFcmToken, fadeAnim]);

  const onRefresh = useCallback(async () => {
        const promises = [refetchDash(), refetchNotifs(), refetchConsents(), refetchFees(), refetchTimetable()];
        if (classId) promises.push(refetchSotw());
        await Promise.all(promises);
      }, [refetchDash, refetchNotifs, refetchConsents, refetchFees, refetchTimetable, refetchSotw, classId]);

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
        <Icon name="wifi-off" size={48} color={theme.colors.textMuted} />
        <Text style={styles.errorText}>Failed to load dashboard.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refetchDash}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- EXTRACT REAL DATA ---
  const { 
    profile, classInfo, avgGradePercentage, attendance, 
    todaySchedule, upcomingEvents, latestGrade, pendingCount 
  } = data?.data || {};

  const notices = notificationsData?.data || [];
  const unreadCount = notices.filter(n => !n.is_read).length;
  
  const consents = consentsData?.data || [];
  const pendingConsentsCount = consents.filter(c => c.status === 'pending').length;

  const totalDues = feesData?.fees?.reduce((sum, f) => sum + ((f.fee?.amount || 0) - (f.total_paid_amount || 0)), 0) || 0;
  
  const d = new Date();
  const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  
  let realTodaySchedule = [];
  if (timetableData?.timeTables) {
    timetableData.timeTables.forEach(classObj => {
      const dates = classObj.dates || {};
      if (dates[todayStr]) {
        dates[todayStr].forEach(p => realTodaySchedule.push({ ...p, _date: todayStr }));
      }
    });
    realTodaySchedule.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    // Map it to match the expected format (time_slot instead of time)
    realTodaySchedule = realTodaySchedule.map(p => ({
      ...p,
      time_slot: p.time,
      is_break: p.type === 'break'
    }));
  }

  const initials = profile?.name ? profile.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() : 'S';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Navbar */}
      <View style={[styles.navbar, { position: 'relative' }]}>
        <TouchableOpacity onPress={openDrawer} style={[styles.headerBtn, { zIndex: 10 }]}>
          <Icon name="menu" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}>
          <Text style={styles.navTitle}>The Arc School</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, zIndex: 10 }}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Notifications')}>
            <View>
              <Icon name="bell" size={24} color="#fff" />
              {unreadCount > 0 && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Profile')}>
            <View style={styles.headerAvatarCircle}>
              <Text style={styles.headerAvatarText}>{initials}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={isFetching || false} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          
          {/* Welcome Header */}
          <View style={styles.heroHeaderContainer}>
            <View style={styles.heroBackground} />
            <View style={styles.heroOverlay}>
              <View style={styles.heroTextContent}>
                <Text style={styles.heroGreeting}>Welcome back,</Text>
                <Text style={styles.heroName}>{profile?.name || 'Student'}</Text>
                <Text style={styles.heroSubText}>
                  Class {classInfo?.name}-{classInfo?.section} • Roll {profile?.admission_number || 'N/A'}
                </Text>
              </View>
            </View>
          </View>

          {/* Student of the Week Banner */}
          {studentOfWeek && (
            <View style={{ marginHorizontal: 16, marginBottom: 20, backgroundColor: '#fff', borderRadius: 24, padding: 20, shadowColor: '#f59e0b', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 6, borderWidth: 1, borderColor: '#fef08a' }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                {studentOfWeek.student?.avatar_url ? (
                  <Image source={{ uri: studentOfWeek.student.avatar_url }} style={{ width: 64, height: 64, borderRadius: 32, marginRight: 16, borderWidth: 3, borderColor: '#fbbf24' }} />
                ) : (
                  <View style={{ width: 64, height: 64, borderRadius: 32, marginRight: 16, backgroundColor: '#fef3c7', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fbbf24' }}>
                    <Icon name="award" size={32} color="#f59e0b" />
                  </View>
                )}
                <View style={{ flex: 1, paddingTop: 2 }}>
                  <Text style={{ fontSize: 12, color: '#d97706', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Student of the Week</Text>
                  <Text style={{ fontSize: 20, color: '#1e293b', fontWeight: '900', letterSpacing: -0.5 }}>{studentOfWeek.student?.name}</Text>
                  <Text style={{ fontSize: 13, color: '#64748b', marginTop: 6, lineHeight: 18 }}>{studentOfWeek.reason}</Text>
                </View>
              </View>
              
              {/* Metrics Row */}
              {studentOfWeek.metrics && (
                <View style={{ flexDirection: 'row', marginTop: 20, gap: 12 }}>
                  <View style={{ flex: 1, backgroundColor: '#ecfdf5', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#d1fae5' }}>
                    <Text style={{ fontSize: 11, color: '#059669', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Attendance</Text>
                    <Text style={{ fontSize: 20, color: '#047857', fontWeight: '900', marginTop: 4 }}>{studentOfWeek.metrics.attendance || 0} pts</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: '#eff6ff', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#dbeafe' }}>
                    <Text style={{ fontSize: 11, color: '#2563eb', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Grades</Text>
                    <Text style={{ fontSize: 20, color: '#1d4ed8', fontWeight: '900', marginTop: 4 }}>{Math.round(studentOfWeek.metrics.grades || 0)} pts</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Quick Action Grid (2 Rows) */}
          <View style={styles.stripContainer}>
            <View style={styles.gridContent}>
              <View style={styles.gridItem}><QuickAction title="Fees" iconName="credit-card" color="#EF4444" onPress={() => navigation.navigate('Fees')} /></View>
              <View style={styles.gridItem}><QuickAction title="Timetable" iconName="calendar" color="#8B5CF6" onPress={() => navigation.navigate('Class')} /></View>
              <View style={styles.gridItem}><QuickAction title="Grades" iconName="award" color="#EAB308" onPress={() => navigation.navigate('Result')} /></View>
              <View style={styles.gridItem}><QuickAction title="Consents" iconName="check-square" color="#4F46E5" onPress={() => navigation.navigate('Consents')} /></View>
              <View style={styles.gridItem}><QuickAction title="Chat" iconName="message-square" color="#14B8A6" onPress={() => navigation.navigate('Communication')} /></View>
              <View style={styles.gridItem}><QuickAction title="Notices" iconName="bell" color="#F43F5E" onPress={() => navigation.navigate('Notifications')} /></View>
              <View style={styles.gridItem}><QuickAction title="Calendar" iconName="file-text" color="#06B6D4" onPress={() => navigation.navigate('AcademicCalendar')} /></View>
              <View style={styles.gridItem}><QuickAction title="Exams" iconName="edit-3" color="#F97316" onPress={() => navigation.navigate('DateSheet')} /></View>
            </View>
          </View>

          <View style={styles.metricsContainer}>
            
            {/* Real Data Rings */}
            <View style={styles.ringsRow}>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => navigation.navigate('Attendance')} activeOpacity={0.8}>
                <View pointerEvents="none">
                  <StatChartRing
                    percentage={attendance?.percentage || 0}
                    valueLabel={`${attendance?.percentage?.toFixed(0) || 0}%`}
                    title="Overall Attendance"
                    subtitle={`${attendance?.present || 0} / ${attendance?.total || 0} Days`}
                    color="#10B981"
                    iconName="check-circle"
                  />
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => navigation.navigate('Result')} activeOpacity={0.8}>
                <View pointerEvents="none">
                  <StatChartRing
                    percentage={avgGradePercentage > 0 ? avgGradePercentage : 0}
                    valueLabel={latestGrade ? getLetterGrade(avgGradePercentage) : '-'}
                    title="Overall Grade"
                    subtitle={latestGrade ? `${latestGrade.examName}: ${latestGrade.percentage?.toFixed(0)}%` : 'No exams yet'}
                    color="#3B82F6"
                    iconName="award"
                  />
                </View>
              </TouchableOpacity>
            </View>

            {/* Real Data Numbers Grid */}
            <View style={styles.numbersGrid}>
              <View style={styles.numbersRow}>
                <NumberMetricCard 
                  number={totalDues > 0 ? `₹${totalDues}` : '₹0'} 
                  label="Outstanding Fees" 
                  iconName="credit-card" 
                  color="#EF4444" 
                  onPress={() => navigation.navigate('Fees')} 
                />
                <NumberMetricCard 
                  number={pendingConsentsCount} 
                  label="Pending Consents" 
                  iconName="clipboard" 
                  color="#F59E0B" 
                  onPress={() => navigation.navigate('Consents')} 
                />
              </View>
              <View style={styles.numbersRow}>
                <NumberMetricCard 
                  number={unreadCount} 
                  label="Unread Notices" 
                  iconName="bell" 
                  color="#ec4899" 
                  onPress={() => navigation.navigate('Notifications')} 
                />
                <NumberMetricCard 
                  number={upcomingEvents?.length || 0} 
                  label="Upcoming Events" 
                  iconName="calendar" 
                  color="#8B5CF6" 
                  onPress={() => navigation.navigate('AcademicCalendar')} 
                />
              </View>
            </View>

            {/* Today's Timetable Horizontal List */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Today's Schedule</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Class')}>
                  <Text style={styles.sectionLink}>Calendar</Text>
                </TouchableOpacity>
              </View>
              {realTodaySchedule && realTodaySchedule.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timetableScroll}>
                  {realTodaySchedule.map((tt, index) => {
                    const config = (() => {
                      if (tt.is_break) return { bg: '#F0FDF4', text: theme.colors.success, icon: 'coffee' };
                      if (!tt.subject) return { bg: '#F8FAFC', text: theme.colors.textMuted, icon: 'sun' };
                      const lower = tt.subject.toLowerCase();
                      if (lower.includes('math')) return { bg: '#EEF2FF', text: '#4F46E5', icon: 'pie-chart' }; 
                      if (lower.includes('sci') || lower.includes('phy') || lower.includes('chem') || lower.includes('bio')) return { bg: '#FEF9C3', text: '#CA8A04', icon: 'activity' }; 
                      if (lower.includes('eng') || lower.includes('lit')) return { bg: '#FCE7F3', text: '#DB2777', icon: 'book-open' }; 
                      if (lower.includes('comp') || lower.includes('it')) return { bg: '#E0F2FE', text: '#0284C7', icon: 'monitor' }; 
                      if (lower.includes('hist') || lower.includes('geo')) return { bg: '#FFEDD5', text: '#EA580C', icon: 'globe' }; 
                      if (lower.includes('art') || lower.includes('draw')) return { bg: '#F3E8FF', text: '#9333EA', icon: 'pen-tool' }; 
                      if (lower.includes('sport') || lower.includes('pe')) return { bg: '#DCFCE7', text: '#16A34A', icon: 'dribbble' }; 
                      return { bg: theme.colors.primary + '15', text: theme.colors.primary, icon: 'book' };
                    })();

                    return (
                      <TouchableOpacity 
                        key={index} 
                        style={[styles.timetableCard, { width: 160, overflow: 'hidden', backgroundColor: config.bg, borderColor: config.bg }]}
                        activeOpacity={0.8}
                        onPress={() => {
                          navigation.navigate('Class', { date: todayStr });
                        }}
                      >
                         <Icon name={config.icon} size={80} color="#ffffff" style={{ position: 'absolute', top: -15, right: -15, opacity: 0.3, transform: [{ rotate: '15deg' }] }} />
                         <View style={[styles.ttIconBox, { backgroundColor: 'rgba(255,255,255,0.6)' }]}>
                           <Icon name={config.icon} size={22} color={config.text} />
                         </View>
                         <Text style={styles.ttSubject} numberOfLines={1}>{tt.subject}</Text>
                         <Text style={styles.ttTime}>{tt.time_slot}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No classes scheduled for today.</Text>
                </View>
              )}
            </View>

            {/* Upcoming Events Vertical List */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Upcoming Events</Text>
                <TouchableOpacity onPress={() => navigation.navigate('AcademicCalendar')}>
                  <Text style={styles.sectionLink}>Academic Annual Planner</Text>
                </TouchableOpacity>
              </View>
              
              {upcomingEvents && upcomingEvents.length > 0 ? (
                <View style={styles.eventsWrapper}>
                  {upcomingEvents.map((evt, idx) => {
                    let chipBg = theme.colors.primary + '15';
                    let iconColor = theme.colors.primary;
                    let iconName = 'calendar';
                    const cat = evt.type?.toLowerCase() || '';
                    if (cat === 'exam') { chipBg = theme.colors.examChip; iconColor = theme.colors.examChipText; iconName = 'edit-3'; }
                    else if (cat === 'holiday') { chipBg = theme.colors.academicChip; iconColor = theme.colors.academicChipText; iconName = 'sun'; }
                    else if (cat === 'event') { chipBg = theme.colors.eventChip; iconColor = theme.colors.eventChipText; iconName = 'star'; }

                    return (
                      <View key={evt.id} style={styles.eventRow}>
                        <View style={[styles.eventIconBox, { backgroundColor: chipBg }]}>
                          <Icon name={iconName} size={22} color={iconColor} />
                        </View>
                        <View style={{ flex: 1 }}>
                           <Text style={styles.eventTitle}>{evt.title}</Text>
                           <View style={styles.eventMetaRow}>
                             <Icon name="clock" size={12} color={theme.colors.textMuted} />
                             <Text style={styles.eventDate}>
                               {new Date(evt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                             </Text>
                           </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No upcoming events found.</Text>
                </View>
              )}
            </View>

          </View>

          <View style={{ height: theme.spacing.xxl }} />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.primary },
  scroll: { flex: 1, backgroundColor: '#f1f5f9' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' },
  errorText: { fontSize: theme.typography.fontSize.md, color: theme.colors.textMuted, marginTop: theme.spacing.md, marginBottom: theme.spacing.md },
  retryButton: { backgroundColor: theme.colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: theme.layout.borderRadius.md },
  retryText: { color: '#fff', fontFamily: theme.typography.fontFamily.bold },

  navbar: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg, paddingVertical: 14,
  },
  navTitle: { color: '#fff', fontSize: 18, fontFamily: theme.typography.fontFamily.bold, letterSpacing: 0.5 },
  headerBtn: { padding: 4 },
  headerAvatarCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' },
  headerAvatarText: { fontSize: 14, fontFamily: theme.typography.fontFamily.bold, color: '#fff' },
  badgeContainer: { position: 'absolute', top: -4, right: -6, backgroundColor: '#ef4444', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontFamily: theme.typography.fontFamily.bold },

  // Hero Header
  heroHeaderContainer: { paddingBottom: 24, backgroundColor: theme.colors.primary, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden', position: 'relative', marginBottom: 20 },
  heroBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0f172a', opacity: 0.1 },
  heroOverlay: { paddingHorizontal: 24, paddingTop: 12, justifyContent: 'flex-start' },
  heroTextContent: { marginTop: 0 },
  heroGreeting: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontFamily: theme.typography.fontFamily.medium, marginBottom: 2 },
  heroName: { fontSize: 24, fontFamily: theme.typography.fontFamily.heading, color: '#fff', letterSpacing: 0.5 },
  heroSubText: { fontSize: 11, color: 'rgba(255,255,255,0.9)', marginTop: 6, fontFamily: theme.typography.fontFamily.medium, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },

  // Quick Action Grid
  stripContainer: { marginBottom: 16, paddingHorizontal: 16 },
  gridContent: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  gridItem: { width: '22%', alignItems: 'center', marginBottom: 8 },
  quickActionContainer: { alignItems: 'center' },
  quickActionBtn: { alignItems: 'center' },
  quickActionIconBox: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1, 
    marginBottom: 8 
  },
  quickActionTitle: { fontSize: 12, color: '#334155', fontFamily: theme.typography.fontFamily.bold, fontWeight: '700', textAlign: 'center' },

  metricsContainer: { paddingHorizontal: 16, gap: 20 },

  // Stat Rings
  ringsRow: { flexDirection: 'row', gap: 16 },
  statRingCard: { 
    flex: 1, 
    backgroundColor: '#fff', 
    borderRadius: 24, 
    paddingVertical: 24, 
    paddingHorizontal: 16, 
    alignItems: 'center', 
    borderWidth: 1, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.04, 
    shadowRadius: 16, 
    elevation: 3,
    overflow: 'hidden'
  },
  pieChartBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1
  },
  ringCenterText: { fontSize: 18, fontFamily: theme.typography.fontFamily.heading },
  ringTitle: { fontSize: 13, fontFamily: theme.typography.fontFamily.bold, color: '#1E293B' },
  subtitleBadge: { marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  ringSubtitle: { fontSize: 10, fontFamily: theme.typography.fontFamily.bold },

  // Number Metrics Grid
  numbersGrid: { gap: 12 },
  numbersRow: { flexDirection: 'row', gap: 12 },
  numberCard: { flex: 1, borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  numberIconBoxSolid: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  numberCardValue: { fontSize: 24, fontFamily: theme.typography.fontFamily.heading },
  numberCardLabel: { fontSize: 12, fontFamily: theme.typography.fontFamily.medium, marginTop: 2 },

  // Section Blocks
  sectionBlock: { marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 18, fontFamily: theme.typography.fontFamily.heading, color: '#0f172a' },
  sectionLink: { fontSize: 13, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.primary },

  // Timetable
  timetableScroll: { gap: 16, paddingRight: theme.spacing.lg },
  timetableCard: { 
    backgroundColor: theme.colors.surface, 
    borderRadius: theme.layout.borderRadius.xl, 
    padding: theme.spacing.md, 
    width: 150, 
    ...theme.shadows.card, 
    borderWidth: 1, 
    borderColor: theme.colors.borderLight 
  },
  ttIconBox: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: theme.colors.primary + '10', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  ttSubject: { fontSize: theme.typography.fontSize.md, fontFamily: theme.typography.fontFamily.heading, color: theme.colors.text, marginBottom: 6 },
  ttTime: { fontSize: theme.typography.fontSize.xs, color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.medium },

  // Events
  eventsWrapper: { 
    gap: 12,
    paddingHorizontal: 4,
    paddingBottom: 4
  },
  eventRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: theme.colors.surface, 
    borderRadius: theme.layout.borderRadius.xl, 
    padding: theme.spacing.md, 
    ...theme.shadows.card, 
    borderWidth: 1, 
    borderColor: 'rgba(0,0,0,0.03)'
  },
  eventIconBox: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 16 
  },
  eventTitle: { fontSize: theme.typography.fontSize.sm, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.text, marginBottom: 6 },
  eventMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eventDate: { fontSize: theme.typography.fontSize.xs, color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.medium },

  emptyCard: { backgroundColor: theme.colors.surface, borderRadius: theme.layout.borderRadius.lg, padding: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.borderLight, borderStyle: 'dashed' },
  emptyText: { fontSize: theme.typography.fontSize.sm, color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.medium },
});

export default DashboardScreen;
