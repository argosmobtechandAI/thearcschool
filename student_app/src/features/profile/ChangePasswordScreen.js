import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { colors, shadows } from '../../theme/colors';
import CustomHeader from '../../components/CustomHeader';
import AppModal from '../../components/AppModal';
import { useChangePasswordMutation } from '../../store/apiSlice';

const ChangePasswordScreen = ({ navigation }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [modalState, setModalState] = useState({ visible: false, type: '', title: '', message: '' });

  const [changePassword, { isLoading }] = useChangePasswordMutation();

  const handleChangePassword = async () => {
    Keyboard.dismiss();

    if (!currentPassword || !newPassword || !confirmPassword) {
      setModalState({ visible: true, type: 'error', title: 'Error', message: 'All fields are required.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setModalState({ visible: true, type: 'error', title: 'Error', message: 'New passwords do not match.' });
      return;
    }

    if (newPassword.length < 6) {
      setModalState({ visible: true, type: 'error', title: 'Error', message: 'New password must be at least 6 characters long.' });
      return;
    }

    try {
      const response = await changePassword({ currentPassword, newPassword }).unwrap();
      
      if (response.success) {
        setModalState({ 
          visible: true, 
          type: 'success', 
          title: 'Success', 
          message: 'Your password has been changed successfully.',
          onClose: () => {
             setModalState(prev => ({ ...prev, visible: false }));
             navigation.goBack();
          }
        });
      } else {
        setModalState({ visible: true, type: 'error', title: 'Error', message: response.message || 'Failed to change password.' });
      }
    } catch (err) {
      const errorMessage = err.data?.message || err.message || 'An error occurred while changing password.';
      setModalState({ visible: true, type: 'error', title: 'Error', message: errorMessage });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <CustomHeader title="Change Password" showBack={true} />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.card}>
          
          {/* Current Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Current Password</Text>
            <View style={styles.inputWrapper}>
              <Icon name="lock" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter current password"
                placeholderTextColor={colors.textMuted}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrentPassword}
              />
              <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)} style={styles.eyeIcon}>
                <Icon name={showCurrentPassword ? "eye" : "eye-off"} size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* New Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.inputWrapper}>
              <Icon name="shield" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                placeholderTextColor={colors.textMuted}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
              />
              <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeIcon}>
                <Icon name={showNewPassword ? "eye" : "eye-off"} size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm New Password</Text>
            <View style={styles.inputWrapper}>
              <Icon name="check-circle" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                placeholderTextColor={colors.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                <Icon name={showConfirmPassword ? "eye" : "eye-off"} size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]} 
            onPress={handleChangePassword}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.submitButtonText}>Update Password</Text>
            )}
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>

      <AppModal 
        visible={modalState.visible}
        title={modalState.title}
        message={modalState.message}
        icon={modalState.type === 'success' ? 'check-circle' : 'alert-circle'}
        iconColor={modalState.type === 'success' ? colors.success : colors.danger}
        actions={[
          {
            label: 'OK',
            style: 'primary',
            onPress: () => {
              if (modalState.onClose) {
                modalState.onClose();
              } else {
                setModalState(prev => ({ ...prev, visible: false }));
              }
            }
          }
        ]}
        onClose={() => {
          if (modalState.onClose) {
            modalState.onClose();
          } else {
            setModalState(prev => ({ ...prev, visible: false }));
          }
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    ...shadows.card,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    height: '100%',
  },
  eyeIcon: {
    padding: 8,
  },
  submitButton: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    ...shadows.button,
  },
  submitButtonDisabled: {
    backgroundColor: colors.primaryLight,
  },
  submitButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ChangePasswordScreen;
