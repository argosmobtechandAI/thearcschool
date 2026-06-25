import { colors, shadows } from './colors';

export const typography = {
  fontFamily: {
    regular: 'Quicksand-Regular',
    medium: 'Quicksand-Regular',
    bold: 'Quicksand-Bold',
    heading: 'Cabin-Bold',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const layout = {
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  padding: {
    screen: spacing.md,
  },
};

export const theme = {
  colors,
  shadows,
  typography,
  spacing,
  layout,
};

export default theme;
