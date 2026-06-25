import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { theme } from '../theme/theme';
import Icon from 'react-native-vector-icons/Feather';

interface ChipProps {
  label: string;
  type?: 'exam' | 'event' | 'academic' | 'default' | 'success' | 'danger' | 'warning';
  icon?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const Chip: React.FC<ChipProps> = ({ label, type = 'default', icon, style, textStyle }) => {
  const getStyles = () => {
    switch (type) {
      case 'exam':
        return { bg: theme.colors.examChip, text: theme.colors.examChipText };
      case 'event':
        return { bg: theme.colors.eventChip, text: theme.colors.eventChipText };
      case 'academic':
        return { bg: theme.colors.academicChip, text: theme.colors.academicChipText };
      case 'success':
        return { bg: theme.colors.success + '20', text: theme.colors.success };
      case 'danger':
        return { bg: theme.colors.danger + '20', text: theme.colors.danger };
      case 'warning':
        return { bg: theme.colors.warning + '20', text: theme.colors.warning };
      case 'default':
      default:
        return { bg: theme.colors.borderLight, text: theme.colors.textMuted };
    }
  };

  const currentStyles = getStyles();

  return (
    <View style={[styles.container, { backgroundColor: currentStyles.bg }, style]}>
      {icon && (
        <Icon
          name={icon}
          size={12}
          color={currentStyles.text}
          style={styles.icon}
        />
      )}
      <Text style={[styles.label, { color: currentStyles.text }, textStyle]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.layout.borderRadius.full,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
  label: {
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default Chip;
