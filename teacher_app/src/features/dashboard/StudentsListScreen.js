import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Linking } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useSelector } from 'react-redux';
import { colors, shadows } from '../../theme/colors';
import { useGetClassStudentsQuery } from '../../store/apiSlice';
import CustomHeader from '../../components/CustomHeader';
import CustomModal from '../../components/CustomModal';

const StudentsListScreen = ({ navigation }) => {
  const { activeClassId, activeClassName } = useSelector((state) => state.app);
  
  const { data: studentsData, isLoading, refetch, isFetching } = useGetClassStudentsQuery(activeClassId, { 
    skip: !activeClassId 
  });
  
  const onRefresh = React.useCallback(() => {
    if (activeClassId) refetch();
  }, [refetch, activeClassId]);
  
  const students = studentsData?.students || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'
  const [modalState, setModalState] = useState({ visible: false, type: 'info', title: '', message: '' });

  const processedStudents = useMemo(() => {
    let result = [...students];
    
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => 
        (s.name && s.name.toLowerCase().includes(q)) || 
        (s.admission_number && s.admission_number.toLowerCase().includes(q))
      );
    }
    
    result.sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });
    
    return result;
  }, [students, searchQuery, sortOrder]);

  const handleSelectStudent = (student) => {
    navigation.navigate('StudentProfile', { student });
  };

  const handleCall = (phone) => {
    if (!phone) {
      setModalState({ visible: true, type: 'warning', title: 'No Phone Number', message: 'No contact number available for this student.' });
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const handleWhatsApp = (phone) => {
    if (!phone) {
      setModalState({ visible: true, type: 'warning', title: 'No Phone Number', message: 'No contact number available for this student.' });
      return;
    }
    Linking.openURL(`whatsapp://send?phone=${phone}`);
  };

  const renderStudent = ({ item }) => (
    <TouchableOpacity 
      style={styles.studentCard} 
      onPress={() => handleSelectStudent(item)}
      activeOpacity={0.8}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name?.charAt(0) || 'S'}</Text>
      </View>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName} numberOfLines={1}>{item.name || 'Unknown Student'}</Text>
        <Text style={styles.studentDetails}>ID: {item.admission_number || item.id?.substring(0, 8) || 'N/A'}</Text>
      </View>
      
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionBtnCall} onPress={() => handleCall(item.phone)}>
          <Icon name="phone" size={16} color="#10B981" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtnWa} onPress={() => handleWhatsApp(item.phone)}>
          <Icon name="message-circle" size={16} color="#0EA5E9" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <CustomHeader title={`Students - ${activeClassName || ''}`} showBack={true} />

      {/* Search and Sort Controls */}
      {!isLoading && activeClassId && students.length > 0 && (
        <View style={styles.controlsContainer}>
          <View style={styles.searchBox}>
            <Icon name="search" size={18} color={colors.textMuted} />
            <TextInput 
              style={styles.searchInput}
              placeholder="Search by name or ID..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="x-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            style={styles.sortBtn}
            onPress={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
          >
            <Icon name={sortOrder === 'asc' ? "arrow-down" : "arrow-up"} size={16} color={colors.primary} />
            <Text style={styles.sortBtnText}>{sortOrder === 'asc' ? 'A-Z' : 'Z-A'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !activeClassId ? (
        <View style={styles.center}>
          <Icon name="alert-circle" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>Please select a class from the dashboard first.</Text>
        </View>
      ) : students.length === 0 ? (
        <View style={styles.center}>
          <Icon name="users" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>No students enrolled in this class yet.</Text>
        </View>
      ) : processedStudents.length === 0 ? (
        <View style={styles.center}>
          <Icon name="users" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>No students match your search.</Text>
        </View>
      ) : (
        <FlatList
          data={processedStudents}
          keyExtractor={(item) => item.id || item.student_id}
          renderItem={renderStudent}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={isFetching}
          onRefresh={onRefresh}
        />
      )}

      <CustomModal
        visible={modalState.visible}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        primaryButtonText="OK"
        onPrimaryPress={() => setModalState(prev => ({ ...prev, visible: false }))}
        onClose={() => setModalState(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 10 },
  backButton: { marginRight: 16, padding: 4 },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  subtitle: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 16, color: colors.textMuted, textAlign: 'center', marginTop: 16 },
  
  controlsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: colors.text,
    height: '100%',
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    height: 44,
  },
  sortBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 6,
  },

  listContent: { padding: 16, paddingBottom: 100 },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
  studentInfo: { flex: 1, paddingRight: 8 },
  studentName: { fontSize: 14, fontWeight: 'bold', color: colors.text, marginBottom: 2 },
  studentDetails: { fontSize: 11, color: colors.textMuted },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnCall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B98115',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnWa: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0EA5E915',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default StudentsListScreen;
