/**
 * AppModal — Reusable branded modal/alert for the student app.
 * Replaces the system Alert.alert() with a premium on-brand design.
 */
import React from 'react';
import {
  Modal, View, Text, StyleSheet, Pressable, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { theme } from '../theme/theme';
import Button from './Button';

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

  const getButtonVariant = (style?: string) => {
    switch (style) {
      case 'danger': return 'danger';
      case 'primary': return 'primary';
      case 'success': return 'primary'; // using primary and overriding color if needed, or fallback
      case 'cancel': return 'ghost';
      default: return 'primary';
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
            <View style={[styles.iconWrap, { backgroundColor: (iconColor || theme.colors.primary) + '18' }]}>
              <Icon name={icon} size={28} color={iconColor || theme.colors.primary} />
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
                const variant = getButtonVariant(action.style);
                return (
                  <Button
                    key={i}
                    variant={variant}
                    label={action.label}
                    onPress={action.onPress || (() => {})}
                    icon={action.icon}
                    style={actions.length <= 2 ? { flex: 1 } : { marginBottom: theme.spacing.sm }}
                  />
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
    padding: theme.layout.padding.screen,
  },
  modalBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.layout.borderRadius.xl,
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    ...theme.shadows.heavy,
  },
  iconWrap: {
    width: 64, height: 64, borderRadius: 32,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    fontFamily: theme.typography.fontFamily.heading,
    fontSize: theme.typography.fontSize.xl,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  message: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: theme.spacing.lg,
  },
  actions: {
    flexDirection: 'row', gap: theme.spacing.sm, width: '100%',
  },
  actionsColumn: {
    flexDirection: 'column',
  },
});

export default AppModal;
