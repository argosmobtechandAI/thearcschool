import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  Animated, 
  TouchableWithoutFeedback 
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { colors, shadows } from '../theme/colors';

const CustomModal = ({
  visible,
  onClose,
  type = 'default', // 'success', 'warning', 'error', 'info', 'default'
  title,
  message,
  primaryButtonText = 'Confirm',
  onPrimaryPress,
  secondaryButtonText = 'Cancel',
  onSecondaryPress,
  children,
  dismissable = true,
}) => {
  const scaleValue = useRef(new Animated.Value(0.8)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 7,
        }),
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleValue, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, scaleValue, opacityValue]);

  // Determine icon and color based on type
  const getVariantConfig = () => {
    switch (type) {
      case 'success':
        return { icon: 'check-circle', color: colors.success };
      case 'error':
        return { icon: 'x-circle', color: colors.danger };
      case 'warning':
        return { icon: 'alert-triangle', color: colors.warning };
      case 'info':
        return { icon: 'info', color: colors.info || '#0EA5E9' };
      default:
        return { icon: null, color: colors.primary };
    }
  };

  const { icon, color } = getVariantConfig();

  const handleDismiss = () => {
    if (dismissable && onClose) {
      onClose();
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none" // We handle animation manually
      onRequestClose={handleDismiss}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPressOut={handleDismiss}
      >
        <Animated.View 
          style={[
            styles.modalContainer, 
            { 
              transform: [{ scale: scaleValue }],
              opacity: opacityValue 
            }
          ]}
          onStartShouldSetResponder={() => true}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          {/* Optional Header Icon */}
          {icon && (
            <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
              <Icon name={icon} size={32} color={color} />
            </View>
          )}

          {/* Title & Message */}
          {title && <Text style={styles.title}>{title}</Text>}
          {message && <Text style={styles.message}>{message}</Text>}

          {/* Custom Content */}
          {children && <View style={styles.childrenContainer}>{children}</View>}

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {onSecondaryPress && (
              <TouchableOpacity 
                style={[styles.button, styles.secondaryButton]} 
                onPress={onSecondaryPress}
              >
                <Text style={styles.secondaryButtonText}>{secondaryButtonText}</Text>
              </TouchableOpacity>
            )}
            {onPrimaryPress && (
              <TouchableOpacity 
                style={[styles.button, { backgroundColor: color }]} 
                onPress={onPrimaryPress}
              >
                <Text style={styles.primaryButtonText}>{primaryButtonText}</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)', // Slate 900 with opacity
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...shadows.card,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  childrenContainer: {
    width: '100%',
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: colors.borderLight,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default CustomModal;
