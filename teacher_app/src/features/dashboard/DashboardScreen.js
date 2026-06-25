import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useSelector, useDispatch } from 'react-redux';
import { colors, shadows } from '../../theme/colors';
import CustomHeader from '../../components/CustomHeader';
import { useGetExamsQuery, useGetCoursesQuery, useGetTimetableQuery, useGetTeacherClassesQuery, useGetClassStudentsQuery, useGetAttendanceQuery, useGetEventsQuery, useGetClassPerformanceQuery } from '../../store/apiSlice';
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
  const studentOfWeek = sotwResponse?.data;
  const performanceData = performanceResponse?.data || [];
  const topPerformers = performanceData.slice(0, 5);
  const bottomPerformers = [...performanceData].reverse().slice(0, 5);

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
    if (activeClassId) {
      refetchSotw();
      refetchStudents();
      refetchAttendance();
      refetchPerformance();
    }
  }, [refetchExams, refetchCourses, refetchClasses, refetchTimetable, refetchStudents, refetchEvents, refetchAttendance, refetchPerformance, refetchSotw, activeClassId]);

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

        {/* Student of the Week Banner */}
        {studentOfWeek && (
          <View style={{ marginHorizontal: 16, marginBottom: 24, backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, borderWidth: 1, borderColor: '#fef08a' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {studentOfWeek.student?.avatar_url ? (
                <Image source={{ uri: studentOfWeek.student.avatar_url }} style={{ width: 56, height: 56, borderRadius: 28, marginRight: 16, borderWidth: 2, borderColor: '#fbbf24' }} />
              ) : (
                <View style={{ width: 56, height: 56, borderRadius: 28, marginRight: 16, backgroundColor: '#fbbf24', justifyContent: 'center', alignItems: 'center', shadowColor: '#fbbf24', shadowOpacity: 0.4, shadowRadius: 4, elevation: 2 }}>
                  <Icon name="award" size={28} color="#fff" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, color: '#d97706', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>Student of the Week</Text>
                <Text style={{ fontSize: 20, color: '#1f2937', fontWeight: 'bold', marginTop: 2 }}>{studentOfWeek.student?.name}</Text>
                <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{studentOfWeek.reason}</Text>
              </View>
            </View>
            
            {/* Metrics Row */}
            {studentOfWeek.metrics && (
              <View style={{ flexDirection: 'row', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6', gap: 12 }}>
                <View style={{ flex: 1, backgroundColor: '#ecfdf5', padding: 8, borderRadius: 8, alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, color: '#059669', fontWeight: '600', textTransform: 'uppercase' }}>Attendance</Text>
                  <Text style={{ fontSize: 16, color: '#047857', fontWeight: 'bold', marginTop: 2 }}>{studentOfWeek.metrics.attendance || 0} pts</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#eff6ff', padding: 8, borderRadius: 8, alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, color: '#2563eb', fontWeight: '600', textTransform: 'uppercase' }}>Grades</Text>
                  <Text style={{ fontSize: 16, color: '#1d4ed8', fontWeight: 'bold', marginTop: 2 }}>{Math.round(studentOfWeek.metrics.grades || 0)} pts</Text>
                </View>
              </View>
            )}
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
          <GridItem icon="user" label="Profile" color={colors.pink} onPress={() => navigation.navigate('Profile')} />
          <GridItem icon="check-square" label="Attendance" color={colors.primary} onPress={() => navigation.navigate('Attend')} />
          <GridItem icon="edit-3" label="Grades" color={colors.warning} onPress={() => navigation.navigate('Work', { screen: 'ExamsList' })} />
          <GridItem icon="calendar" label="Timetable" color={colors.purple} onPress={() => navigation.navigate('Timetable')} />
          <GridItem icon="clock" label="Date Sheet" color={colors.info || '#17a2b8'} onPress={() => navigation.navigate('DateSheetScreen')} />
          <GridItem icon="users" label="Students" color={colors.success} onPress={() => navigation.navigate('StudentsList')} />
          <GridItem icon="award" label="Results" color={colors.danger} onPress={() => navigation.navigate('Work', { screen: 'ResultsHome' })} />
          <GridItem icon="calendar" label="Academic Planner" color={colors.primaryLight} onPress={() => navigation.navigate('AnnualPlanner')} />
          <View style={{ width: '31%' }} />
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

        <Text style={styles.sectionTitle}>Coming Soon</Text>
        <View style={styles.gridContainer}>
          <GridItem icon="file-text" label="Assignment" color={colors.purple} onPress={() => navigation.navigate('ComingSoon', { moduleName: 'Assignments' })} />
          <GridItem icon="book-open" label="Homework" color={colors.secondary} onPress={() => navigation.navigate('ComingSoon', { moduleName: 'Homework' })} />
          <GridItem icon="book" label="Study Material" color={colors.success} onPress={() => navigation.navigate('ComingSoon', { moduleName: 'Study Material' })} />
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
