import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity, Image, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useSelector, useDispatch } from 'react-redux';
import { colors, shadows } from '../../theme/colors';
import CustomHeader from '../../components/CustomHeader';
import { useGetExamsQuery, useGetCoursesQuery, useGetTimetableQuery, useGetTeacherClassesQuery, useGetClassStudentsQuery, useGetAttendanceQuery, useGetEventsQuery, useGetClassPerformanceQuery, useGetSpotlightOfTodayQuery } from '../../store/apiSlice';
import { setAvailableClasses, setActiveClass } from '../../store/appSlice';

const DashboardScreen = ({ navigation }) => {
  const { user } = useSelector((state) => state.auth);
  const { activeClassId, activeClassName, availableClasses } = useSelector((state) => state.app);
  const dispatch = useDispatch();


  const { data: examsData, refetch: refetchExams, isFetching: fetchingExams } = useGetExamsQuery(activeClassId, { skip: !activeClassId });
  const { data: coursesData, refetch: refetchCourses, isFetching: fetchingCourses } = useGetCoursesQuery(activeClassId, { skip: !activeClassId });
  const { data: classesData, refetch: refetchClasses, isFetching: fetchingClasses } = useGetTeacherClassesQuery();
  const { data: timetableData, refetch: refetchTimetable, isFetching: fetchingTimetable } = useGetTimetableQuery(activeClassId, { skip: !activeClassId });

  useEffect(() => {
    if (classesData?.classes) {
      dispatch(setAvailableClasses(classesData.classes));
    }
  }, [classesData, dispatch]);

  const todayDate = new Date().toISOString().split('T')[0];

  let examsCount = 0;
  if (examsData?.exams) {
    examsCount = examsData.exams.filter(exam => exam.date >= todayDate).length;
  }
  const assignmentsCount = coursesData?.courses?.length || 0;

  const { data: studentsData, refetch: refetchStudents, isFetching: fetchingStudents } = useGetClassStudentsQuery(activeClassId, { skip: !activeClassId });
  const totalStudents = studentsData?.students?.length || 0;
  const { data: attendanceData, refetch: refetchAttendance, isFetching: fetchingAttendance } = useGetAttendanceQuery(
    { startDate: todayDate, endDate: todayDate, classId: activeClassId },
    { skip: !activeClassId }
  );

  const { data: eventsData, refetch: refetchEvents, isFetching: fetchingEvents } = useGetEventsQuery(activeClassId, { skip: !activeClassId });
  const { data: performanceResponse, refetch: refetchPerformance, isFetching: fetchingPerformance } = useGetClassPerformanceQuery(activeClassId, { skip: !activeClassId });
  const { data: sotwResponse, refetch: refetchSotw, isFetching: fetchingSotw } = require('../../store/apiSlice').useGetStudentOfWeekQuery(activeClassId, { skip: !activeClassId });
  const { data: spotlightResponse, refetch: refetchSpotlight } = useGetSpotlightOfTodayQuery();
  const spotlightOfToday = spotlightResponse?.data;
  const studentOfWeek = sotwResponse?.data;
  const studentOfWeekList = Array.isArray(studentOfWeek)
    ? studentOfWeek
    : (studentOfWeek ? [studentOfWeek] : []);
  const performanceData = performanceResponse?.data || [];
  const topPerformers = performanceData.slice(0, 5);
  const bottomPerformers = [...performanceData].reverse().slice(0, 5);

  const spotlightRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spotlightRotation, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      })
    ).start();
  }, [spotlightRotation]);

  const rotationInterpolate = spotlightRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

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

  const onRefresh = React.useCallback(() => {
    refetchExams();
    refetchCourses();
    refetchClasses();
    refetchTimetable();
    refetchEvents();
    refetchSpotlight();
    if (activeClassId) {
      refetchSotw();
      refetchStudents();
      refetchAttendance();
      refetchPerformance();
    }
  }, [refetchExams, refetchCourses, refetchClasses, refetchTimetable, refetchStudents, refetchEvents, refetchAttendance, refetchPerformance, refetchSotw, refetchSpotlight, activeClassId]);

  const isRefreshing = fetchingExams || fetchingCourses || fetchingClasses || fetchingTimetable || fetchingStudents || fetchingAttendance || fetchingEvents || fetchingPerformance || fetchingSotw;

  let attendanceMetric = "Pending";
  if (!activeClassId) {
    attendanceMetric = "N/A";
  } else if (attendanceData?.records) {
    const records = attendanceData.records;
    if (records.length > 0 && totalStudents > 0) {
      const present = records.filter(r => r.status === 'present').length;
      attendanceMetric = `${Math.round((present / totalStudents) * 100)}%`;
    } else if (records.length > 0) {
      attendanceMetric = "Done";
    } else {
      attendanceMetric = "Pending";
    }
  }

  let upcomingEventsCount = 0;
  let upcomingEventsList = [];
  if (eventsData?.data) {
    const upcoming = eventsData.data.filter(event => {
      const eventDate = event.end_date || event.start_date;
      return eventDate >= todayDate;
    }).sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    
    upcomingEventsCount = upcoming.length;
    upcomingEventsList = upcoming.slice(0, 3);
  }


  const GridItem = ({ icon, label, color, onPress }) => (
    <TouchableOpacity style={styles.gridItem} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.gridIconCircle, { backgroundColor: color + '15' }]}>
        <Icon name={icon} size={28} color={color} />
      </View>
      <Text style={styles.gridLabel}>{label}</Text>
    </TouchableOpacity>
  );

  const renderStudentCard = (student, isWeak) => (
    <TouchableOpacity 
      key={student.id} 
      style={[styles.studentCard, { borderColor: isWeak ? colors.danger + '30' : colors.success + '30' }]}
      onPress={() => navigation.navigate('StudentProfile', { student })}
    >
      <View style={[styles.studentAvatar, { backgroundColor: isWeak ? colors.danger + '15' : colors.success + '15' }]}>
        <Text style={[styles.studentAvatarText, { color: isWeak ? colors.danger : colors.success }]}>
          {student.name ? student.name.charAt(0) : 'S'}
        </Text>
      </View>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName} numberOfLines={1}>{student.name}</Text>
        <Text style={styles.studentScore}>Score: {student.overallScore ? student.overallScore.toFixed(1) + '%' : 'N/A'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <CustomHeader title="The Arc School" />

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileInfoRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'S'}</Text>
            </View>
            <View style={styles.profileTextCol}>
              <Text style={styles.profileName}>{user?.name || 'Sarah Mitchell'}</Text>
            </View>
            <TouchableOpacity style={styles.viewProfileBtn} onPress={() => navigation.navigate('Profile')}>
              <Text style={styles.viewProfileBtnText}>View Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Spotlight of the Day Banner */}
        {spotlightOfToday && (
          <View style={{
            marginHorizontal: 16,
            marginBottom: 24,
            borderRadius: 24,
            overflow: 'hidden',
            padding: 2, // Forms the glowing border thickness
            backgroundColor: '#e2e8f0', // Neutral fallback border
            ...shadows.card,
            position: 'relative'
          }}>
            {/* Rotating Border Beam */}
            <Animated.View style={{
              position: 'absolute',
              width: '200%',
              height: '200%',
              top: '-50%',
              left: '-50%',
              transform: [{ rotate: rotationInterpolate }],
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              {/* Glowing light beam strip */}
              <View style={{
                width: 140,
                height: '100%',
                backgroundColor: '#F59E0B', // Glowing gold laser beam
                opacity: 0.8,
              }} />
            </Animated.View>

            {/* Inner Content Card (covers center of rotating beam) */}
            <View style={{
              backgroundColor: '#ffffff',
              borderRadius: 22,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
            }}>
              <View style={{ flex: 1, marginRight: spotlightOfToday.image_url ? 12 : 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 8
                  }}>
                    <Icon name="star" size={12} color="#D97706" />
                  </View>
                  <Text style={{
                    fontSize: 11,
                    color: '#000080',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    letterSpacing: 1
                  }}>
                    Spotlight of the Day
                  </Text>
                </View>
                <Text style={{
                  fontSize: 18,
                  color: '#0F172A',
                  fontWeight: 'bold',
                  marginBottom: 6
                }}>
                  {spotlightOfToday.title}
                </Text>
                <Text style={{
                  fontSize: 13,
                  color: '#475569',
                  lineHeight: 18
                }}>
                  {spotlightOfToday.description}
                </Text>
              </View>
              {spotlightOfToday.image_url && (
                <Image 
                  source={{ uri: spotlightOfToday.image_url }} 
                  style={{ 
                    width: 90, 
                    height: 90, 
                    borderRadius: 16, 
                    resizeMode: 'cover', 
                    borderWidth: 1, 
                    borderColor: 'rgba(0, 0, 0, 0.05)' 
                  }} 
                />
              )}
            </View>
          </View>
        )}

        {/* Student of the Week Banner */}
        {studentOfWeekList && studentOfWeekList.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 13, color: '#d97706', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginHorizontal: 20, marginBottom: 10 }}>
              Students of the Week
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 12 }}
            >
              {studentOfWeekList.map((winner, idx) => (
                <View
                  key={winner.id || idx}
                  style={{
                    width: studentOfWeekList.length > 1 ? 290 : 340,
                    marginHorizontal: 4,
                    backgroundColor: '#fff',
                    borderRadius: 16,
                    padding: 16,
                    shadowColor: '#000',
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 4,
                    borderWidth: 1,
                    borderColor: '#fef08a',
                    position: 'relative'
                  }}
                >
                  {/* Rank Badge */}
                  <View style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 12,
                    backgroundColor: idx === 0 ? '#fef3c7' : idx === 1 ? '#f3f4f6' : '#ffedd5',
                    borderWidth: 1,
                    borderColor: idx === 0 ? '#fbbf24' : idx === 1 ? '#d1d5db' : '#fed7aa',
                    zIndex: 10
                  }}>
                    <Icon 
                      name="star" 
                      size={10} 
                      color={idx === 0 ? '#d97706' : idx === 1 ? '#4b5563' : '#c2410c'} 
                      style={{ marginRight: 3 }}
                    />
                    <Text style={{
                      fontSize: 9,
                      fontWeight: '950',
                      color: idx === 0 ? '#d97706' : idx === 1 ? '#4b5563' : '#c2410c',
                      textTransform: 'uppercase'
                    }}>
                      {idx === 0 ? 'Gold' : idx === 1 ? 'Silver' : 'Bronze'}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 60 }}>
                    {winner.student?.avatar_url ? (
                      <Image source={{ uri: winner.student.avatar_url }} style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12, borderWidth: 2, borderColor: '#fbbf24' }} />
                    ) : (
                      <View style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12, backgroundColor: '#fbbf24', justifyContent: 'center', alignItems: 'center', shadowColor: '#fbbf24', shadowOpacity: 0.4, shadowRadius: 4, elevation: 2 }}>
                        <Icon name="award" size={24} color="#fff" />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, color: '#1f2937', fontWeight: 'bold' }} numberOfLines={1}>{winner.student?.name}</Text>
                      <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{winner.reason}</Text>
                    </View>
                  </View>
                  
                  {/* Metrics Row */}
                  {winner.metrics ? (
                    <View style={{ flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6', gap: 10 }}>
                      <View style={{ flex: 1, backgroundColor: '#ecfdf5', padding: 6, borderRadius: 6, alignItems: 'center' }}>
                        <Text style={{ fontSize: 10, color: '#059669', fontWeight: '600', textTransform: 'uppercase' }}>Attendance</Text>
                        <Text style={{ fontSize: 14, color: '#047857', fontWeight: 'bold', marginTop: 2 }}>{winner.metrics.attendance || 0} pts</Text>
                      </View>
                      <View style={{ flex: 1, backgroundColor: '#eff6ff', padding: 6, borderRadius: 6, alignItems: 'center' }}>
                        <Text style={{ fontSize: 10, color: '#2563eb', fontWeight: '600', textTransform: 'uppercase' }}>Grades</Text>
                        <Text style={{ fontSize: 14, color: '#1d4ed8', fontWeight: 'bold', marginTop: 2 }}>{Math.round(winner.metrics.grades || 0)} pts</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Next in School (Upcoming Events) */}
        {upcomingEventsList.length > 0 && (
          <View style={[styles.performanceSection, { marginTop: 0, marginBottom: 24 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 4, height: 18, backgroundColor: colors.primary, borderRadius: 2, marginRight: 8 }} />
                <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text, letterSpacing: -0.5 }}>New in School</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('AnnualPlanner')} style={{ padding: 4 }}>
                <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '800' }}>View All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }}>
              {upcomingEventsList.map((ev, i) => {
                const isExam = ev.category === 'Exam';
                const colorPalette = [colors.primary, colors.success, colors.pink, colors.info];
                const cardColor = isExam ? colors.warning : colorPalette[i % colorPalette.length];
                const iconName = isExam ? 'edit-3' : 'calendar';
                
                // Format date nicely
                let dateStr = ev.start_date;
                try {
                  dateStr = new Date(ev.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                } catch(e) {}

                return (
                  <TouchableOpacity 
                    activeOpacity={0.9} 
                    key={i} 
                    style={[styles.eventMiniCard, { backgroundColor: cardColor }]}
                    onPress={() => isExam ? navigation.navigate('DateSheetScreen') : navigation.navigate('AnnualPlanner')}
                  >
                    {/* Faded Background Icon */}
                    <Icon name={iconName} size={80} color="rgba(255,255,255,0.15)" style={{ position: 'absolute', right: -10, bottom: -10 }} />
                    
                    <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ color: colors.surface, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>
                        {ev.category || (isExam ? 'Exam' : 'Event')}
                      </Text>
                    </View>
                    
                    <View style={{ marginTop: 12 }}>
                      <Text style={styles.eventMiniTitle} numberOfLines={2}>{ev.title}</Text>
                      
                      <View style={styles.eventMiniDateRow}>
                        <Icon name="clock" size={14} color={colors.surface} />
                        <Text style={styles.eventMiniDate}>{dateStr}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Summary Row 1 */}
        <View style={styles.summaryRow}>
          <TouchableOpacity 
            style={[styles.summaryCard, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Attend')}
            activeOpacity={0.8}
          >
            <View style={styles.summaryTop}>
              <Text style={styles.summaryTitle}>Attendance</Text>
              <View style={styles.summaryBadge}><Text style={styles.summaryBadgeText}>Today</Text></View>
            </View>
            <View style={styles.summaryBottom}>
              <Text style={styles.summarySub}>Class{'\n'}<Text style={{fontWeight: '700'}}>Status</Text></Text>
              <Text style={styles.summaryCount}>{attendanceMetric}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.summaryCard, { backgroundColor: colors.warning }]}
            onPress={() => navigation.navigate('Work', { screen: 'ExamsList' })}
            activeOpacity={0.8}
          >
            <View style={styles.summaryTop}>
              <Text style={styles.summaryTitle}>Exams</Text>
              <View style={styles.summaryBadge}><Text style={styles.summaryBadgeText}>Active</Text></View>
            </View>
            <View style={styles.summaryBottom}>
              <Text style={styles.summarySub}>Next{'\n'}<Text style={{fontWeight: '700'}}>Exams</Text></Text>
              <Text style={styles.summaryCount}>{examsCount}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Summary Row 2 */}
        <View style={styles.summaryRow}>
          <TouchableOpacity 
            style={[styles.summaryCard, { backgroundColor: colors.success }]} 
            onPress={() => navigation.navigate('AnnualPlanner')}
            activeOpacity={0.8}
          >
            <View style={styles.summaryTop}>
              <Text style={styles.summaryTitle}>Events</Text>
              <View style={styles.summaryBadge}><Text style={styles.summaryBadgeText}>Upcoming</Text></View>
            </View>
            <View style={styles.summaryBottom}>
              <Text style={styles.summarySub}>School{'\n'}<Text style={{fontWeight: '700'}}>Calendar</Text></Text>
              <Text style={styles.summaryCount}>{upcomingEventsCount}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.summaryCard, { backgroundColor: colors.pink || '#EC4899' }]}
            onPress={() => navigation.navigate('Work', { screen: 'ResultsHome' })}
            activeOpacity={0.8}
          >
            <View style={styles.summaryTop}>
              <Text style={styles.summaryTitle}>Leader Board</Text>
              <View style={styles.summaryBadge}><Text style={styles.summaryBadgeText}>Top</Text></View>
            </View>
            <View style={styles.summaryBottom}>
              <Text style={styles.summarySub}>Students{'\n'}<Text style={{fontWeight: '700'}}>Ranked</Text></Text>
              <Text style={styles.summaryCount}>{activeClassId ? totalStudents : 0}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Total Students Card */}
        {activeClassId && (
          <View style={styles.totalStudentsCard}>
            <View style={styles.totalStudentsLeft}>
              <View style={styles.totalIconCircle}>
                <Icon name="users" size={24} color={colors.surface} />
              </View>
              <View>
                <Text style={styles.totalTitle}>Total Students</Text>
                <Text style={styles.totalSub}>Enrolled in {activeClassName}</Text>
              </View>
            </View>
            <Text style={styles.totalCount}>{totalStudents}</Text>
          </View>
        )}

        {/* Main Grid */}
        <View style={styles.gridContainer}>
          <GridItem icon="calendar" label="Academic Planner" color={colors.primaryLight} onPress={() => navigation.navigate('AnnualPlanner')} />
          <GridItem icon="check-square" label="Attendance" color={colors.primary} onPress={() => navigation.navigate('Attend')} />
          <GridItem icon="info" label="Circulars" color={colors.secondary} onPress={() => navigation.navigate('Circulars')} />
          <GridItem icon="clock" label="Date Sheet" color={colors.info || '#17a2b8'} onPress={() => navigation.navigate('DateSheetScreen')} />
          <GridItem icon="image" label="Gallery" color={colors.pink || '#EC4899'} onPress={() => navigation.navigate('Gallery')} />
          <GridItem icon="edit-3" label="Grades" color={colors.warning} onPress={() => navigation.navigate('Work', { screen: 'ExamsList' })} />
          <GridItem icon="user" label="Profile" color={colors.pink} onPress={() => navigation.navigate('Profile')} />
          <GridItem icon="award" label="Results" color={colors.danger} onPress={() => navigation.navigate('Work', { screen: 'ResultsHome' })} />
          <GridItem icon="users" label="Students" color={colors.success} onPress={() => navigation.navigate('StudentsList')} />
          <GridItem icon="calendar" label="Timetable" color={colors.purple} onPress={() => navigation.navigate('Timetable')} />
        </View>

        {activeClassId && topPerformers.length > 0 && (
          <View style={styles.performanceSection}>
            <Text style={styles.sectionTitle}>Top Performers</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }}>
              {topPerformers.map(st => renderStudentCard(st, false))}
            </ScrollView>
          </View>
        )}

        {activeClassId && bottomPerformers.length > 0 && (
          <View style={styles.performanceSection}>
            <Text style={styles.sectionTitle}>Bottom Performers</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }}>
              {bottomPerformers.map(st => renderStudentCard(st, true))}
            </ScrollView>
          </View>
        )}

        <Text style={styles.sectionTitle}>Coursework & HR</Text>
        <View style={styles.gridContainer}>
          <GridItem icon="file-text" label="Assignment" color={colors.purple} onPress={() => navigation.navigate('CourseWork', { moduleType: 'assignment' })} />
          <GridItem icon="book-open" label="Homework" color={colors.secondary} onPress={() => navigation.navigate('CourseWork', { moduleType: 'homework' })} />
          <GridItem icon="book" label="Study Material" color={colors.success} onPress={() => navigation.navigate('CourseWork', { moduleType: 'study_material' })} />
          <GridItem icon="dollar-sign" label="Payroll" color={colors.info || '#17a2b8'} onPress={() => navigation.navigate('PayrollScreen')} />
          <GridItem icon="calendar" label="Leaves" color={colors.warning} onPress={() => navigation.navigate('LeavesScreen')} />
          <View style={{ width: '31%' }} />
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16, paddingBottom: 100 },
  
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  profileInfoRow: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: colors.surface, fontSize: 20, fontWeight: 'bold' },
  profileTextCol: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  profileRole: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  viewProfileBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 16,
  },
  viewProfileBtnText: { color: colors.surface, fontSize: 12, fontWeight: '700' },


  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  summaryCard: {
    flex: 1, borderRadius: 20, padding: 16, ...shadows.card, marginHorizontal: 4,
  },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  summaryTitle: { color: colors.surface, fontSize: 16, fontWeight: '800' },
  summaryBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  summaryBadgeText: { color: colors.surface, fontSize: 10, fontWeight: '700' },
  summaryBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  summarySub: { color: colors.surface + 'E6', fontSize: 12 },
  summaryCount: { color: colors.surface, fontSize: 36, fontWeight: '900', lineHeight: 40 },

  totalStudentsCard: {
    backgroundColor: colors.secondary,
    borderRadius: 20, padding: 20, marginBottom: 24,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    ...shadows.card,
  },
  totalStudentsLeft: { flexDirection: 'row', alignItems: 'center' },
  totalIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  totalTitle: { color: colors.surface, fontSize: 18, fontWeight: '800' },
  totalSub: { color: colors.surface + 'E6', fontSize: 13, marginTop: 2 },
  totalCount: { color: colors.surface, fontSize: 32, fontWeight: '900' },

  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.textMuted, marginBottom: 16, marginTop: 16, letterSpacing: 0.5 },
  gridItem: {
    width: '31%', backgroundColor: colors.surface,
    borderRadius: 20, paddingVertical: 20, paddingHorizontal: 8,
    alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: colors.borderLight,
    ...shadows.card,
  },
  gridIconCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  gridLabel: { fontSize: 12, fontWeight: '700', color: colors.text, textAlign: 'center'  },

  performanceSection: {
    marginTop: 10,
    marginBottom: 10,
  },
  studentCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    marginRight: 12,
    width: 140,
    borderWidth: 1,
    alignItems: 'center',
    ...shadows.sm,
  },
  studentAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  studentAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  studentInfo: {
    alignItems: 'center',
  },
  studentName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  studentScore: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  eventMiniCard: {
    borderRadius: 20,
    padding: 16,
    width: 220,
    height: 140,
    marginRight: 16,
    overflow: 'hidden',
    justifyContent: 'space-between',
    ...shadows.card,
  },
  eventMiniTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.surface,
    marginBottom: 6,
    lineHeight: 22,
  },
  eventMiniDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventMiniDate: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.surface,
    marginLeft: 6,
  },

});

export default DashboardScreen;
