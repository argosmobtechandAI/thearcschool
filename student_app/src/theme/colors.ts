export const colors = {
  // Brand Primary (The Arc School Navy Blue)
  primary: '#000080',       // Main brand color
  primaryDark: '#000066',   // Slightly darker for active states
  primaryLight: '#333399',  // Lighter accent

  // Accent & Secondary
  secondary: '#0EA5E9',     // Sky blue (retained for generic links if needed)
  accent: '#F59E0B',        // Gold/Amber for highlights (classic school combination)
  
  // Status Colors
  success: '#10B981',       // Emerald green
  warning: '#F59E0B',       // Amber
  danger: '#EF4444',        // Red
  purple: '#7C3AED',        // Violet

  // Medals/Badges
  gold: '#F59E0B',
  silver: '#94A3B8',
  bronze: '#CD7F32',

  // Event type chips (Soft Pastels)
  examChip: '#EFF6FF',      // Pale blue
  examChipText: '#1E3A8A',  // Deep blue
  eventChip: '#DCFCE7',     // Pale green
  eventChipText: '#14532D', // Deep green
  academicChip: '#FEF3C7',  // Pale amber
  academicChipText: '#92400E', // Deep amber

  // Clean Premium Backgrounds
  background: '#F8FAFC',    // Ghost White (softer than #F1F5F9)
  surface: '#FFFFFF',       // Pure white for cards

  // Text & Borders
  text: '#0F172A',          // Deep Slate (Heading text)
  textMuted: '#475569',     // Cool Slate (Body text)
  border: '#E2E8F0',        // Slate-200
  borderLight: '#F1F5F9',   // Slate-100
};

export const shadows = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, // Much softer, premium shadow
    shadowRadius: 16,
    elevation: 3, // Android
  },
  button: {
    shadowColor: '#000080',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4, // Android
  },
  heavy: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
};
