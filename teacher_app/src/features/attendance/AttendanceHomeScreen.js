import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/Feather';
import { colors, shadows } from '../../theme/colors';
import CustomHeader from '../../components/CustomHeader';
import { useGetTeacherClassesQuery } from '../../store/apiSlice';

const AttendanceHomeScreen = ({ navigation }) => {
  const { activeClassId } = useSelector((state) => state.app);
  const { data: classesData, isLoading, refetch, isFetching } = useGetTeacherClassesQuery();
  
  const onRefresh = React.useCallback(() => {
    refetch();
  }, [refetch]);

  const allClasses = classesData?.classes || [];
  const assignedClasses = allClasses.filter(c => c.isClassTeacher);
  const activeClass = allClasses.find(c => c.classId === activeClassId);
  const isActiveClassTeacher = activeClass ? activeClass.isClassTeacher : true; // default true if no active class

  const dispatch = useDispatch();

  const handleSelectClass = (cls) => {
    dispatch({ type: 'app/setActiveClass', payload: cls.classId });
    navigation.navigate('AttendanceMarkingScreen', { 
      classId: cls.classId,
      className: cls.className,
      section: cls.section
    });
  };

  return (
    <View style={styles.container}>
      <CustomHeader title="The Arc School" />

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>Attendance</Text>
          <Text style={styles.pageSubtitle}>Select a class to mark or view attendance</Text>
        </View>

        {!isActiveClassTeacher && activeClassId ? (
          <View style={[styles.emptyState, { backgroundColor: colors.danger + '10', padding: 20, borderRadius: 16, marginTop: 20 }]}>
            <Icon name="alert-triangle" size={40} color={colors.danger} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyStateText, { color: colors.danger, textAlign: 'center' }]}>
              You are not the class teacher for {activeClass?.className} {activeClass?.section ? `- ${activeClass.section}` : ''}.
            </Text>
            <Text style={[styles.emptyStateText, { fontSize: 14, marginTop: 8, textAlign: 'center' }]}>
              Only the designated Class Teacher can manage attendance. Please switch to a class you manage using the dropdown above.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>

              <TouchableOpacity 
                style={styles.actionCard} 
                onPress={() => navigation.navigate('AttendanceReportsScreen')}
                activeOpacity={0.8}
              >
                <View style={[styles.iconBox, { backgroundColor: colors.success + '15' }]}>
                  <Icon name="bar-chart-2" size={24} color={colors.success} />
                </View>
                <Text style={styles.classText}>View Class Reports</Text>
                <Icon name="chevron-right" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
            ) : assignedClasses.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>YOUR ASSIGNED CLASSES</Text>
                {assignedClasses.map((cls, index) => (
                  <TouchableOpacity key={cls.classId || index} style={styles.classCard} onPress={() => handleSelectClass(cls)} activeOpacity={0.8}>
                    <View style={styles.iconBox}>
                      <Icon name="users" size={24} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.classTitle}>Class {cls.className} {cls.section ? `- ${cls.section}` : ''}</Text>
                      <Text style={styles.classSubtitle}>Mark Attendance</Text>
                    </View>
                    <Icon name="chevron-right" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Icon name="info" size={40} color={colors.textMuted} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyStateText}>No classes assigned to you.</Text>
              </View>
            )}
          </>
        )}

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 20, paddingBottom: 60 },
  
  titleSection: { marginBottom: 24 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 15, color: colors.textMuted, marginTop: 4, fontWeight: '500' },

  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: colors.textMuted, marginBottom: 16, letterSpacing: 0.5 },
  
  classCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  classText: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
  classTitle: { fontSize: 18, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
  classSubtitle: { fontSize: 13, fontWeight: '600', color: colors.primary, marginTop: 4 },
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyStateText: { fontSize: 16, color: colors.textMuted, fontWeight: '500' },
});

export default AttendanceHomeScreen;
