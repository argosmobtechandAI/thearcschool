import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar, Image, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useSelector, useDispatch } from 'react-redux';
import { setActiveClass } from '../store/appSlice';
import { useGetNotificationsQuery } from '../store/apiSlice';
import { colors, shadows } from '../theme/colors';

const LOGO = require('../assets/images/logo.jpeg');

const CustomHeader = ({ title, showBack }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  
  const { activeClassId, activeClassName, availableClasses } = useSelector((state) => state.app);
  const [showClassModal, setShowClassModal] = useState(false);
  
  const { data: notificationsData } = useGetNotificationsQuery();
  const unreadCount = notificationsData?.data?.filter(n => !n.is_read)?.length || 0;

  return (
    <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 20) }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      <View style={styles.headerTop}>
        {showBack ? (
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={28} color={colors.surface} />
          </TouchableOpacity>
        ) : <View style={{ width: 16 }} />}

        <View style={styles.titleContainer}>
          <Image source={LOGO} style={styles.logo} />
          <Text style={styles.headerTitle}>{title || 'The Arc School'}</Text>
        </View>

        <View style={styles.rightIcons}>
          <TouchableOpacity 
            style={styles.headerClassBtn} 
            onPress={() => setShowClassModal(true)}
          >
            <Text style={styles.headerClassText} numberOfLines={1}>
              {activeClassName || 'Select Class'}
            </Text>
            <Icon name="chevron-down" size={14} color={colors.surface} style={{ marginLeft: 4 }} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => navigation.navigate('Home', { screen: 'Notifications' })}
          >
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
            <Icon name="bell" size={24} color={colors.surface} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Custom Dropdown for Class Selection */}
      <Modal transparent={true} visible={showClassModal} animationType="fade" onRequestClose={() => setShowClassModal(false)}>
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={() => setShowClassModal(false)} 
          />
          <View style={styles.dropdownContent}>
            <Text style={styles.modalTitle}>Select Class Context</Text>
            {availableClasses && availableClasses.map((cls) => (
              <TouchableOpacity 
                key={cls.classId || Math.random().toString()} 
                style={styles.modalClassItem}
                onPress={() => {
                  dispatch(setActiveClass(cls.classId));
                  setShowClassModal(false);
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalClassText, activeClassId === cls.classId && styles.modalClassTextActive]}>
                    {`${cls.className} ${cls.section ? `- ${cls.section}` : ''}`}
                  </Text>
                  {cls.isClassTeacher && (
                    <Text style={{ fontSize: 10, color: colors.success, fontWeight: '700', marginTop: 2 }}>CLASS TEACHER</Text>
                  )}
                </View>
                {activeClassId === cls.classId && <Icon name="check" size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowClassModal(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: colors.primary,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...shadows.card,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  logo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.surface,
    letterSpacing: -0.5,
  },
  iconButton: {
    padding: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 6,
    backgroundColor: colors.danger,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  badgeText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: 'bold',
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerClassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    maxWidth: 120,
  },
  headerClassText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: 20,
    zIndex: 90,
  },
  dropdownContent: { 
    width: 250,
    maxHeight: 400,
    backgroundColor: colors.surface, 
    borderRadius: 16, 
    padding: 16, 
    ...shadows.card,
    zIndex: 100,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 12 },
  modalClassItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  modalClassText: { fontSize: 14, color: colors.text, fontWeight: '500' },
  modalClassTextActive: { color: colors.primary, fontWeight: '800' },
  modalCloseBtn: { marginTop: 16, paddingVertical: 10, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight },
  modalCloseText: { color: colors.text, fontSize: 14, fontWeight: '700', textAlign: 'center' },
});

export default CustomHeader;
