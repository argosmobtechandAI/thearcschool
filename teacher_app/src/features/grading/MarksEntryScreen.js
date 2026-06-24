import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useGetClassStudentsQuery, useSubmitBulkGradesMutation, useGetExamGradesQuery } from '../../store/apiSlice';
import { colors } from '../../theme/colors';
import CustomHeader from '../../components/CustomHeader';
import CustomModal from '../../components/CustomModal';

const MarksEntryScreen = ({ route, navigation }) => {
  const { examId, examDetails } = route.params;
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState({ visible: false, type: 'info', title: '', message: '', primaryButtonText: 'OK', onPrimaryPress: null, secondaryButtonText: null, onSecondaryPress: null });
  
  const [submitBulkGrades, { isLoading: saving }] = useSubmitBulkGradesMutation();

  // If exam doesn't pass class_id directly, fallback to using class name to find ID if needed, 
  // but let's assume class_id is passed or we handle null.
  const classId = examDetails?.class_id || examDetails?.classId || examDetails?.class; 
  const { data: studentsData, isLoading: loadingStudents, refetch, isFetching } = useGetClassStudentsQuery(classId, {
    skip: !classId
  });

  const { data: examGradesData, refetch: refetchGrades } = useGetExamGradesQuery(examId);

  const onRefresh = React.useCallback(() => {
    if (classId) refetch();
    if (examId) refetchGrades();
  }, [refetch, classId, refetchGrades, examId]);

  useEffect(() => {
    if (studentsData?.students) {
      const gradesMap = {};
      if (examGradesData?.grades) {
        examGradesData.grades.forEach(g => {
          gradesMap[g.student_id] = g.marks;
        });
      }
      setStudents(studentsData.students.map(s => ({ 
        ...s, 
        _id: s.id, 
        marks: gradesMap[s.id] !== undefined ? String(gradesMap[s.id]) : '' 
      })));
    }
  }, [studentsData, examGradesData]);

  const handleMarksChange = (id, value) => {
    // Only allow numbers
    let numericValue = value.replace(/[^0-9]/g, '');
    
    // Validate against max marks
    const maxMarks = examDetails?.marks ? parseInt(examDetails.marks) : 100;
    if (numericValue !== '' && parseInt(numericValue) > maxMarks) {
       numericValue = String(maxMarks);
    }
    
    const updated = students.map(s => s._id === id ? { ...s, marks: numericValue } : s);
    setStudents(updated);
  };

  const processSubmit = async () => {
    try {
      const payload = students.map(s => ({
        student_id: s._id,
        exam_id: examId,
        marks: s.marks !== '' && s.marks !== undefined && s.marks !== null ? Number(s.marks) : 0
      }));

      await submitBulkGrades(payload).unwrap();
      
      setModalState({
        visible: true,
        type: 'success',
        title: 'Success',
        message: 'Marks saved successfully',
        primaryButtonText: 'OK',
        onPrimaryPress: () => navigation.goBack(),
        secondaryButtonText: null,
        onSecondaryPress: null
      });
    } catch (error) {
      setModalState({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error?.data?.message || 'Failed to save marks',
        primaryButtonText: 'OK',
        onPrimaryPress: () => setModalState(prev => ({ ...prev, visible: false })),
        secondaryButtonText: null,
        onSecondaryPress: null
      });
    }
  };

  const handleSubmit = () => {
    const hasBlanks = students.some(s => s.marks === '' || s.marks === undefined || s.marks === null);

    if (hasBlanks) {
      setModalState({
        visible: true,
        type: 'warning',
        title: 'Missing Grades',
        message: 'Some students do not have marks entered. These will be automatically recorded as 0. Do you want to proceed?',
        primaryButtonText: 'Proceed',
        onPrimaryPress: () => {
          setModalState(prev => ({ ...prev, visible: false }));
          processSubmit();
        },
        secondaryButtonText: 'Cancel',
        onSecondaryPress: () => setModalState(prev => ({ ...prev, visible: false }))
      });
    } else {
      processSubmit();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <CustomHeader title={examDetails?.title || 'Enter Marks'} showBack={true} />
      
      <View style={styles.contextBanner}>
        <Text style={styles.contextText}>{examDetails?.class} • {examDetails?.subject}</Text>
      </View>

      {loadingStudents ? (
        <ActivityIndicator color={colors.warning} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={onRefresh} colors={[colors.warning]} />}
        >
          <View style={styles.infoBanner}>
            <Icon name="info" size={20} color={colors.warning} />
            <Text style={styles.infoText}>Enter marks out of {examDetails?.marks || 100}.</Text>
          </View>

          {students.map((student) => (
            <View key={student._id} style={styles.studentCard}>
              <TouchableOpacity 
                style={styles.studentInfo}
                onPress={() => navigation.navigate('StudentProfile', { student })}
                activeOpacity={0.7}
              >
                <Text style={styles.studentName}>{student.name}</Text>
                <Text style={styles.studentRoll}>ID: {student.admission_number || student.id?.substring(0, 8) || 'N/A'}</Text>
              </TouchableOpacity>
              <View style={styles.marksContainer}>
                <TextInput
                  style={styles.marksInput}
                  keyboardType="numeric"
                  maxLength={3}
                  value={student.marks}
                  onChangeText={(val) => handleMarksChange(student._id, val)}
                  placeholder="--"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={styles.maxMarks}>/ {examDetails?.marks || 100}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.submitButton, saving && styles.submitButtonDisabled]} 
          onPress={handleSubmit}
          disabled={saving || loadingStudents || students.length === 0}
        >
          {saving ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.submitText}>Save Marks</Text>
          )}
        </TouchableOpacity>
      </View>

      <CustomModal
        visible={modalState.visible}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        primaryButtonText={modalState.primaryButtonText}
        onPrimaryPress={modalState.onPrimaryPress}
        secondaryButtonText={modalState.secondaryButtonText}
        onSecondaryPress={modalState.onSecondaryPress}
        onClose={() => setModalState(prev => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  contextBanner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contextText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  scrollContent: { padding: 16 },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: colors.warning + '15',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  infoText: { marginLeft: 8, color: colors.warning, fontWeight: '600' },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  studentRoll: { fontSize: 12, color: colors.textMuted },
  marksContainer: { flexDirection: 'row', alignItems: 'center' },
  marksInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    width: 60,
    height: 48,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    backgroundColor: colors.background,
  },
  maxMarks: { marginLeft: 8, fontSize: 16, color: colors.textMuted, fontWeight: '600' },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  submitButton: {
    backgroundColor: colors.warning,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitText: { color: colors.background, fontSize: 16, fontWeight: 'bold' },
});

export default MarksEntryScreen;
