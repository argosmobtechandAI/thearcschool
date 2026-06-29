import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, ScrollView, ActivityIndicator, Alert, Platform, Linking
} from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/Feather';
import { pick, isCancel } from '@react-native-documents/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, shadows } from '../../theme/colors';
import CustomHeader from '../../components/CustomHeader';
import CustomModal from '../../components/CustomModal';
import {
  useGetCoursesQuery,
  useCreateCourseMutation,
  useUpdateCourseMutation,
  useDeleteCourseMutation,
  useGetTeacherClassesQuery,
  useGetTeacherProfileQuery
} from '../../store/apiSlice';
import axios from 'axios';
import * as Keychain from 'react-native-keychain';
import { API_URL } from '@env';

const getDayName = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
};

const CourseWorkListScreen = ({ route, navigation }) => {
  const scrollViewRef = React.useRef(null);
  const [activeTab, setActiveTab] = useState(route.params?.moduleType || 'assignment'); // 'assignment', 'homework', 'study_material'
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileDetails, setFileDetails] = useState(null);
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);

  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState('date'); // 'date' or 'duedate'
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: 'default',
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    confirmText: 'OK',
    cancelText: null
  });

  const showAlert = (type, title, message, onConfirm = null, confirmText = 'OK', onCancel = null, cancelText = null) => {
    setAlertConfig({
      visible: true,
      type,
      title,
      message,
      onConfirm,
      onCancel,
      confirmText,
      cancelText
    });
  };

  const hideAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  };

  // Form State matching structured format
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    classId: '',
    chapter: '',
    duedate: '',
    date: new Date().toISOString().split('T')[0],
    day: getDayName(new Date().toISOString().split('T')[0]),
    topics_taught: '',
    unit: '',
    lesson_no: '',
    page_number: '',
    others: '',
    homework: '',
  });

  const { data: coursesData, isLoading: coursesLoading, refetch } = useGetCoursesQuery(selectedClassId === 'all' ? undefined : selectedClassId);
  const { data: classesRes } = useGetTeacherClassesQuery();
  const classes = classesRes?.classes || [];
  const { data: profileRes } = useGetTeacherProfileQuery();
  const teacherSubjects = profileRes?.data?.subjects || [];
  
  const { activeClassId } = useSelector(state => state.app);

  React.useEffect(() => {
    if (activeClassId && !formData.classId) {
      setFormData(prev => ({ ...prev, classId: activeClassId }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClassId]);

  const getSubjectsList = () => {
    if (formData.classId) {
      const classSpecific = teacherSubjects
        .filter(s => s.classId === formData.classId)
        .map(s => s.subjectName);
      if (classSpecific.length > 0) {
        return Array.from(new Set(classSpecific));
      }
    }
    const allTaught = teacherSubjects.map(s => s.subjectName).filter(Boolean);
    if (allTaught.length > 0) {
      return Array.from(new Set(allTaught));
    }
    return ['Mathematics', 'Science', 'English', 'Social Studies', 'History', 'Geography', 'Computer Science', 'Art'];
  };
  
  const [createCourse, { isLoading: creatingCourse }] = useCreateCourseMutation();
  const [updateCourse, { isLoading: updatingCourse }] = useUpdateCourseMutation();
  const [deleteCourse] = useDeleteCourseMutation();

  // Filter courses locally by coursework type and subject filter
  const filteredCourses = (coursesData?.courses || []).filter(c => {
    if (c.type !== activeTab) return false;
    if (subjectFilter !== 'All' && c.subject !== subjectFilter) return false;
    return true;
  });

  const handleFilePick = async () => {
    try {
      const [res] = await pick({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/*'],
        allowMultiSelection: false,
      });
      setFileDetails(res);
    } catch (err) {
      if (!isCancel(err)) {
        showAlert('error', 'Error', 'Failed to pick document: ' + err.message);
      }
    }
  };

  const handleSave = async () => {
    setHasSubmitted(true);
    if (!formData.title || !formData.subject || !formData.classId) {
      showAlert('warning', 'Validation Error', 'Title, Subject and Class are required.');
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    const selectedClass = classes.find(c => c.classId === formData.classId);
    if (!selectedClass) {
      showAlert('error', 'Error', 'Invalid class selected.');
      return;
    }

    let fileUrl = null;
    
    // Upload file if selected
    if (fileDetails) {
      try {
        setUploadingFile(true);
        const credentials = await Keychain.getGenericPassword();
        const token = credentials ? credentials.password : '';

        const classCategory = `class_${selectedClass.className.replace(/\s+/g, '_')}_${selectedClass.section.replace(/\s+/g, '_')}`.toLowerCase();
        
        const uploadFormData = new FormData();
        uploadFormData.append('file', {
          uri: fileDetails.uri,
          name: fileDetails.name || 'document.pdf',
          type: fileDetails.type || 'application/pdf',
        });

        const uploadRes = await axios.post(`${API_URL}/upload/file?category=${classCategory}`, uploadFormData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (uploadRes.data?.success) {
          fileUrl = uploadRes.data.url;
        }
      } catch (err) {
        showAlert('error', 'Upload Failed', 'Failed to upload attachment: ' + (err.response?.data?.message || err.message));
        setUploadingFile(false);
        return;
      } finally {
        setUploadingFile(false);
      }
    }

    // Prepare payload
    const payload = {
      title: formData.title,
      subject: formData.subject,
      class: selectedClass.className,
      section: selectedClass.section,
      chapter: formData.chapter,
      duedate: (activeTab === 'study_material') ? null : formData.duedate || null,
      description: formData.others, // use description for general notes
      file_url: fileUrl,
      type: activeTab,
      date: formData.date,
      day: formData.day,
      topics_taught: formData.topics_taught,
      unit: formData.unit,
      lesson_no: formData.lesson_no,
      page_number: formData.page_number,
      others: formData.others,
      homework: (activeTab === 'study_material') ? null : formData.homework,
    };

    try {
      let res;
      if (isEditing) {
        res = await updateCourse({ id: editId, data: payload }).unwrap();
      } else {
        res = await createCourse(payload).unwrap();
      }
      
      if (res.success) {
        showAlert('success', 'Success', `Coursework ${isEditing ? 'updated' : 'created'} successfully!`, hideAlert);
        setIsModalOpen(false);
        setIsEditing(false);
        setEditId(null);
        setFormData({
          title: '',
          subject: '',
          classId: '',
          chapter: '',
          duedate: '',
          date: new Date().toISOString().split('T')[0],
          day: getDayName(new Date().toISOString().split('T')[0]),
          topics_taught: '',
          unit: '',
          lesson_no: '',
          page_number: '',
          others: '',
          homework: '',
        });
        setFileDetails(null);
        refetch();
      }
    } catch (err) {
      console.error(err);
      showAlert('error', 'Error', err.data?.message || err.message || 'Failed to save coursework.');
    }
  };

  const handleEdit = (item) => {
    setIsEditing(true);
    setEditId(item.id);
    setFormData({
      title: item.title || '',
      subject: item.subject || '',
      classId: item.class_id || '',
      chapter: item.chapter || '',
      duedate: item.duedate || '',
      date: item.date || new Date().toISOString().split('T')[0],
      day: item.day || getDayName(item.date || new Date().toISOString().split('T')[0]),
      topics_taught: item.topics_taught || '',
      unit: item.unit || '',
      lesson_no: item.lesson_no || '',
      page_number: item.page_number || '',
      others: item.others || '',
      homework: item.homework || '',
    });
    setFileDetails(null); // File uploading might need careful handling, keep it null to not overwrite unless new file picked
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    showAlert(
      'warning',
      'Delete Coursework',
      'Are you sure you want to delete this item? This action cannot be undone.',
      async () => {
        hideAlert();
        try {
          await deleteCourse(id).unwrap();
          refetch();
        } catch (err) {
          showAlert('error', 'Error', 'Failed to delete coursework.');
        }
      },
      'Delete',
      hideAlert,
      'Cancel'
    );
  };

  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      if (datePickerField === 'date') {
        setFormData(prev => ({
          ...prev,
          date: formattedDate,
          day: getDayName(formattedDate)
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          duedate: formattedDate
        }));
      }
    }
  };

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'homework': return 'Homework';
      case 'study_material': return 'Study Material';
      default: return 'Assignments';
    }
  };

  const renderItem = ({ item }) => {
    const cls = classes.find(c => c.classId === item.class_id);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardMeta}>
            <Text style={styles.cardClass}>Class {cls ? `${cls.className}-${cls.section}` : item.class || 'N/A'}</Text>
            <Text style={styles.cardSubject}>📚 {item.subject}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={() => handleEdit(item)} style={styles.editBtn}>
              <Icon name="edit-2" size={16} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
              <Icon name="trash-2" size={16} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.cardTitle}>{item.title}</Text>
        
        {/* Structured layout view */}
        <View style={styles.detailsBlock}>
          {item.date && <Text style={styles.detailText}>🗓 <Text style={styles.bold}>Date:</Text> {item.date} {item.day ? `(${item.day})` : ''}</Text>}
          {item.chapter && <Text style={styles.detailText}>▫️ <Text style={styles.bold}>Chapter:</Text> {item.chapter}</Text>}
          {item.unit && <Text style={styles.detailText}>▫️ <Text style={styles.bold}>Unit:</Text> {item.unit} | <Text style={styles.bold}>Lesson:</Text> {item.lesson_no}</Text>}
          {item.topics_taught && <Text style={styles.detailText}>▫️ <Text style={styles.bold}>Topics:</Text> {item.topics_taught}</Text>}
          {item.page_number && <Text style={styles.detailText}>▫️ <Text style={styles.bold}>Pages:</Text> {item.page_number}</Text>}
          {item.homework && <Text style={styles.detailText}>◻️ <Text style={styles.bold}>Homework:</Text> {item.homework}</Text>}
          {item.duedate && <Text style={styles.detailText}>◻️ <Text style={styles.bold}>Submission Date:</Text> {item.duedate}</Text>}
          {item.others && <Text style={styles.detailText}>▫️ <Text style={styles.bold}>Notes:</Text> {item.others}</Text>}
        </View>

        {item.file_url && (
          <View style={{ marginTop: 10 }}>
            <TouchableOpacity onPress={async () => {
              try {
                const formattedUrl = item.file_url.startsWith('http') ? item.file_url : `https://${item.file_url}`;
                const supported = await Linking.canOpenURL(formattedUrl);
                if (supported) {
                  await Linking.openURL(formattedUrl);
                } else {
                  showAlert('error', 'Error', 'Cannot open this file type on this device.');
                }
              } catch (err) {
                showAlert('error', 'Error', 'Could not open attachment link.');
              }
            }}>
              <Text style={styles.attachmentText}>📎 <Text style={styles.bold}>Attachment:</Text> {item.file_url.split('/').pop()}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <CustomHeader title={getHeaderTitle()} showBack={true} />
      
      {/* Type Tabs */}
      <View style={styles.tabContainer}>
        {['assignment', 'homework', 'study_material'].map(tab => (
           <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.tabActive]}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                 {tab === 'study_material' ? 'Study Material' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
           </TouchableOpacity>
        ))}
      </View>
      
      {/* Class Selector Bar */}
      <View style={styles.selectorBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          <TouchableOpacity
            style={[styles.selectorTab, selectedClassId === 'all' && styles.selectorTabActive]}
            onPress={() => setSelectedClassId('all')}
          >
            <Text style={[styles.selectorText, selectedClassId === 'all' && styles.selectorTextActive]}>All Classes</Text>
          </TouchableOpacity>
          {classes.map(c => (
            <TouchableOpacity
              key={c.classId}
              style={[styles.selectorTab, selectedClassId === c.classId && styles.selectorTabActive]}
              onPress={() => setSelectedClassId(c.classId)}
            >
              <Text style={[styles.selectorText, selectedClassId === c.classId && styles.selectorTextActive]}>Class {c.className}-{c.section}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterMenuVisible(true)}>
          <Icon name="filter" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {coursesLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredCourses}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="folder" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No coursework found for this filter.</Text>
            </View>
          }
        />
      )}

      {/* Floating Add Button */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => {
          setIsEditing(false);
          setEditId(null);
          setHasSubmitted(false);
          let initialClassId = '';
          if (selectedClassId && selectedClassId !== 'all') {
            initialClassId = selectedClassId;
          } else if (classes && classes.length === 1) {
            initialClassId = classes[0].classId;
          }
          setFormData(prev => ({ ...prev, classId: initialClassId || activeClassId, subject: '', date: new Date().toISOString().split('T')[0], day: getDayName(new Date().toISOString().split('T')[0]) }));
          setIsModalOpen(true);
        }}
      >
        <Icon name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Structured coursework creator Modal */}
      <CustomModal
        visible={isModalOpen}
        onClose={() => { setIsModalOpen(false); setIsEditing(false); setEditId(null); }}
        title={`${isEditing ? 'Edit' : 'Add'} ${getHeaderTitle()}`}
        primaryButtonText={creatingCourse || uploadingFile || updatingCourse ? 'Saving...' : 'Save'}
        onPrimaryPress={handleSave}
        secondaryButtonText="Cancel"
        onSecondaryPress={() => { setIsModalOpen(false); setIsEditing(false); setEditId(null); }}
      >
        <ScrollView ref={scrollViewRef} keyboardShouldPersistTaps="handled" style={{ maxHeight: 400, width: '100%' }} contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false}>
              
              {/* Title Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, hasSubmitted && !formData.title && { color: colors.danger }]}>✍️ Title *</Text>
                <TextInput
                  style={[styles.textInput, hasSubmitted && !formData.title && { borderColor: colors.danger }]}
                  value={formData.title}
                  onChangeText={(val) => setFormData(prev => ({ ...prev, title: val }))}
                  placeholder="e.g. Weekly Math Assignment"
                />
              </View>

              {/* Date Input with Date Picker */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>🗓 Date</Text>
                <TouchableOpacity 
                  style={styles.dateButton} 
                  onPress={() => {
                    setDatePickerField('date');
                    setShowDatePicker(true);
                  }}
                >
                  <Text style={styles.dateButtonText}>{formData.date || 'Select Date'}</Text>
                  <Icon name="calendar" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {/* Day Input (Auto-calculated) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>☀️ Day</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.borderLight, color: colors.textMuted }]}
                  value={formData.day}
                  editable={false}
                  placeholder="Auto-calculated day"
                />
              </View>

              {/* Class Dropdown Selection */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, hasSubmitted && !formData.classId && { color: colors.danger }]}>👉 Select Class & Section *</Text>
                {classes.length === 0 ? (
                  <Text style={{ color: colors.danger, fontSize: 13, marginVertical: 6 }}>
                    No classes assigned. Please contact the administrator to assign classes to your profile.
                  </Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                    {classes.map(c => (
                      <TouchableOpacity
                        key={c.classId}
                        style={[styles.miniButton, formData.classId === c.classId && styles.miniButtonActive]}
                        onPress={() => setFormData(prev => ({ ...prev, classId: c.classId, subject: '' }))}
                      >
                        <Text style={[styles.miniButtonText, formData.classId === c.classId && styles.miniButtonTextActive]}>Class {c.className}-{c.section}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* Subject Dropdown Selector */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, hasSubmitted && !formData.subject && { color: colors.danger }]}>📚 Subject *</Text>
                <TouchableOpacity 
                  style={[styles.dropdownSelector, hasSubmitted && !formData.subject && { borderColor: colors.danger }]} 
                  onPress={() => setShowSubjectDropdown(!showSubjectDropdown)}
                >
                  <Text style={[styles.dropdownSelectorText, !formData.subject && { color: colors.textMuted }]}>
                    {formData.subject || 'Select Subject'}
                  </Text>
                  <Icon name={showSubjectDropdown ? "chevron-up" : "chevron-down"} size={18} color={colors.primary} />
                </TouchableOpacity>

                {showSubjectDropdown && (
                  <View style={styles.dropdownContainer}>
                    {getSubjectsList().map((sub, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.dropdownItem, formData.subject === sub && styles.dropdownItemActive]}
                        onPress={() => {
                          setFormData(prev => ({ ...prev, subject: sub }));
                          setShowSubjectDropdown(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, formData.subject === sub && styles.dropdownItemTextActive]}>
                          {sub}
                        </Text>
                        {formData.subject === sub && <Icon name="check" size={16} color={colors.primary} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Topics Taught */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>▫️ Topics Taught</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.topics_taught}
                  onChangeText={(val) => setFormData(prev => ({ ...prev, topics_taught: val }))}
                  placeholder="e.g. Introduction to Algebra"
                />
              </View>

              {/* Unit */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>▫️ Unit</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.unit}
                  onChangeText={(val) => setFormData(prev => ({ ...prev, unit: val }))}
                  placeholder="e.g. Unit 3"
                />
              </View>

              {/* Lesson No */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>▫️ Lesson No.</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.lesson_no}
                  onChangeText={(val) => setFormData(prev => ({ ...prev, lesson_no: val }))}
                  placeholder="e.g. Lesson 2"
                />
              </View>

              {/* Chapter Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>▫️ Chapter Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.chapter}
                  onChangeText={(val) => setFormData(prev => ({ ...prev, chapter: val }))}
                  placeholder="e.g. Polynomials"
                />
              </View>

              {/* Page Number */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>▫️ Page Number</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.page_number}
                  onChangeText={(val) => setFormData(prev => ({ ...prev, page_number: val }))}
                  placeholder="e.g. Pages 45-50"
                />
              </View>

              {/* Others / Notes */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>▫️ Others (Important Notes)</Text>
                <TextInput
                  style={[styles.textInput, { minHeight: 60 }]}
                  multiline
                  value={formData.others}
                  onChangeText={(val) => setFormData(prev => ({ ...prev, others: val }))}
                  placeholder="Any crucial notes for students..."
                />
              </View>

              {/* Homework & Due Date (Only shown if NOT study material) */}
              {activeTab !== 'study_material' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>◻️ Homework</Text>
                    <TextInput
                      style={[styles.textInput, { minHeight: 80 }]}
                      multiline
                      value={formData.homework}
                      onChangeText={(val) => setFormData(prev => ({ ...prev, homework: val }))}
                      placeholder="Write homework assignment description..."
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>◻️ Submission/Due Date</Text>
                    <TouchableOpacity 
                      style={styles.dateButton} 
                      onPress={() => {
                        setDatePickerField('duedate');
                        setShowDatePicker(true);
                      }}
                    >
                      <Text style={styles.dateButtonText}>{formData.duedate || 'Select Submission Date'}</Text>
                      <Icon name="calendar" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* File Attachment */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>📎 Document Attachment (PDF/Word)</Text>
                <TouchableOpacity style={styles.filePicker} onPress={handleFilePick}>
                  <Icon name="file" size={20} color={colors.primary} />
                  <Text style={styles.filePickerText}>
                    {fileDetails ? fileDetails.name : 'Pick a PDF / Word Document'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>
      </CustomModal>

      <Modal visible={filterMenuVisible} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFilterMenuVisible(false)}>
          <View style={[styles.modalContent, { height: undefined, marginTop: 'auto', marginBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingBottom: 40 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Subject</Text>
              <TouchableOpacity onPress={() => setFilterMenuVisible(false)}>
                <Icon name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
              <TouchableOpacity
                style={[styles.dropdownItem, subjectFilter === 'All' && styles.dropdownItemActive]}
                onPress={() => { setSubjectFilter('All'); setFilterMenuVisible(false); }}
              >
                <Text style={[styles.dropdownItemText, subjectFilter === 'All' && styles.dropdownItemTextActive]}>All Subjects</Text>
                {subjectFilter === 'All' && <Icon name="check" size={16} color={colors.primary} />}
              </TouchableOpacity>
              {getSubjectsList().map((sub, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.dropdownItem, subjectFilter === sub && styles.dropdownItemActive]}
                  onPress={() => { setSubjectFilter(sub); setFilterMenuVisible(false); }}
                >
                  <Text style={[styles.dropdownItemText, subjectFilter === sub && styles.dropdownItemTextActive]}>{sub}</Text>
                  {subjectFilter === sub && <Icon name="check" size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {showDatePicker && (
        <DateTimePicker
          value={datePickerField === 'date' ? new Date(formData.date) : (formData.duedate ? new Date(formData.duedate) : new Date())}
          mode="date"
          display="default"
          onChange={onChangeDate}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: colors.primary },
  selectorBar: { backgroundColor: colors.surface, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center' },
  filterBtn: { padding: 10, paddingRight: 16 },
  selectorTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.borderLight, marginRight: 8 },
  selectorTabActive: { backgroundColor: colors.primary },
  selectorText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  selectorTextActive: { color: '#fff' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 80 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 16, ...shadows.card },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardMeta: { flexDirection: 'row', gap: 10 },
  cardClass: { fontSize: 12, fontWeight: '700', color: colors.primary, backgroundColor: colors.primary + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  cardSubject: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  deleteBtn: { padding: 6 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10 },
  
  detailsBlock: { backgroundColor: colors.borderLight, borderRadius: 10, padding: 12, gap: 6 },
  detailText: { fontSize: 13, color: colors.textMuted },
  attachmentText: { fontSize: 13, color: colors.primary, marginTop: 4 },
  bold: { fontWeight: '700', color: colors.text },

  emptyContainer: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 14, color: colors.textMuted },

  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', ...shadows.button, zIndex: 10 },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '90%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  formScroll: { paddingBottom: 40 },
  
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 6 },
  textInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, color: colors.text, fontSize: 14 },
  
  dateButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface },
  dateButtonText: { fontSize: 14, color: colors.text },

  miniButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.borderLight, marginRight: 8 },
  miniButtonActive: { backgroundColor: colors.primary },
  miniButtonText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  miniButtonTextActive: { color: '#fff' },

  filePicker: { borderStyle: 'dashed', borderWidth: 1.5, borderColor: colors.primary, borderRadius: 8, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary + '05' },
  filePickerText: { fontSize: 13, color: colors.primary, fontWeight: '600' },

  dropdownSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface
  },
  dropdownSelectorText: {
    fontSize: 14,
    color: colors.text
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginTop: 4,
    backgroundColor: colors.surface,
    maxHeight: 200,
    overflow: 'hidden'
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  dropdownItemActive: {
    backgroundColor: colors.primary + '10'
  },
  dropdownItemText: {
    fontSize: 14,
    color: colors.text
  },
  dropdownItemTextActive: {
    fontWeight: '700',
    color: colors.primary
  },

  actionRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnCancel: { backgroundColor: colors.borderLight },
  btnCancelText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  btnSave: { backgroundColor: colors.primary },
  btnSaveText: { fontSize: 14, fontWeight: '600', color: '#fff' }
});

export default CourseWorkListScreen;
