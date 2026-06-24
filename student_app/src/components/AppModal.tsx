/**
 * AppModal — Reusable branded modal/alert for the student app.
 * Replaces the system Alert.alert() with a premium on-brand design.
 *
 * Usage:
 *   <AppModal
 *     visible={showModal}
 *     title="Logout"
 *     message="Are you sure you want to log out?"
 *     icon="log-out"
 *     iconColor={colors.danger}
 *     actions={[
 *       { label: 'Cancel', onPress: () => setShowModal(false), style: 'cancel' },
 *       { label: 'Logout', onPress: handleLogout, style: 'danger' },
 *     ]}
 *     onClose={() => setShowModal(false)}
 *   />
 */
import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Pressable, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { colors, shadows } from '../theme/colors';

export interface AppModalAction {
  label: string;
  onPress?: () => void;
  style?: 'primary' | 'danger' | 'success' | 'cancel' | string;
  icon?: string;
}

export interface AppModalProps {
  visible?: boolean;
  title?: string;
  message?: string;
  icon?: string;
  iconColor?: string;
  actions?: AppModalAction[];
  onClose?: () => void;
  children?: React.ReactNode;
}

const AppModal: React.FC<AppModalProps> = ({
  visible = false,
  title,
  message,
  icon,
  iconColor,
  actions = [],
  onClose,
  children,
}) => {
  if (!visible) return null;

  const buttonStyle = (style?: string) => {
    switch (style) {
      case 'danger':    return { bg: colors.danger,   text: '#fff' };
      case 'primary':   return { bg: colors.primary,  text: '#fff' };
      case 'success':   return { bg: colors.success,  text: '#fff' };
      case 'cancel':    return { bg: colors.border,   text: colors.textMuted };
      default:          return { bg: colors.primary,  text: '#fff' };
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>

          {/* Icon (optional) */}
          {icon && (
            <View style={[styles.iconWrap, { backgroundColor: (iconColor || colors.primary) + '18' }]}>
              <Icon name={icon} size={28} color={iconColor || colors.primary} />
            </View>
          )}

          {/* Title */}
          {title && <Text style={styles.title}>{title}</Text>}

          {/* Message */}
          {message && <Text style={styles.message}>{message}</Text>}

          {/* Custom children content */}
          {children}

          {/* Action Buttons */}
          {actions.length > 0 && (
            <View style={[styles.actions, actions.length > 2 && styles.actionsColumn]}>
              {actions.map((action, i) => {
                const bs = buttonStyle(action.style);
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.actionBtn,
                      { backgroundColor: bs.bg },
                      actions.length <= 2 ? { flex: 1 } : undefined,
                    ]}
                    onPress={action.onPress}
                    activeOpacity={0.8}
                  >
                    {action.icon && (
                      <Icon name={action.icon} size={16} color={bs.text} style={{ marginRight: 6 }} />
                    )}
                    <Text style={[styles.actionText, { color: bs.text }]}>{action.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    ...shadows.heavy,
  },
  iconWrap: {
    width: 64, height: 64, borderRadius: 32,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20, fontWeight: '800', color: colors.text,
    textAlign: 'center', marginBottom: 8,
  },
  message: {
    fontSize: 14, color: colors.textMuted, textAlign: 'center',
    lineHeight: 20, marginBottom: 24,
  },
  actions: {
    flexDirection: 'row', gap: 10, width: '100%',
  },
  actionsColumn: {
    flexDirection: 'column',
  },
  actionBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 20,
    borderRadius: 14,
  },
  actionText: {
    fontSize: 15, fontWeight: '700',
  },
});

export default AppModal;
