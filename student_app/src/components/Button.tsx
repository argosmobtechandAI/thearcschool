import React, { useRef } from 'react';
import {
  Text,
  StyleSheet,
  Animated,
  Pressable,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../theme/theme';
import Icon from 'react-native-vector-icons/Feather';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  style,
  textStyle,
  icon,
  loading = false,
  disabled = false,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          bg: disabled ? theme.colors.border : theme.colors.primary,
          text: '#FFFFFF',
          border: 'transparent',
        };
      case 'secondary':
        return {
          bg: disabled ? theme.colors.border : theme.colors.accent,
          text: '#FFFFFF',
          border: 'transparent',
        };
      case 'danger':
        return {
          bg: disabled ? theme.colors.border : theme.colors.danger,
          text: '#FFFFFF',
          border: 'transparent',
        };
      case 'outline':
        return {
          bg: 'transparent',
          text: disabled ? theme.colors.textMuted : theme.colors.primary,
          border: disabled ? theme.colors.border : theme.colors.primary,
        };
      case 'ghost':
        return {
          bg: 'transparent',
          text: disabled ? theme.colors.textMuted : theme.colors.text,
          border: 'transparent',
        };
      default:
        return { bg: theme.colors.primary, text: '#FFFFFF', border: 'transparent' };
    }
  };

  const vStyles = getVariantStyles();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[
          styles.container,
          {
            backgroundColor: vStyles.bg,
            borderColor: vStyles.border,
            borderWidth: variant === 'outline' ? 1.5 : 0,
            opacity: disabled ? 0.6 : 1,
          },
          variant !== 'ghost' && variant !== 'outline' && !disabled ? theme.shadows.button : {},
        ]}
      >
        {loading ? (
          <ActivityIndicator color={vStyles.text} size="small" />
        ) : (
          <>
            {icon && (
              <Icon
                name={icon}
                size={18}
                color={vStyles.text}
                style={{ marginRight: theme.spacing.sm }}
              />
            )}
            <Text
              style={[
                styles.label,
                { color: vStyles.text },
                textStyle,
              ]}
            >
              {label}
            </Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 48,
    borderRadius: theme.layout.borderRadius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  label: {
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.fontSize.md,
    letterSpacing: 0.5,
  },
});

export default Button;
