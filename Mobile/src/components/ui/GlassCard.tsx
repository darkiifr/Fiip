import React from 'react';
import { Platform, View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useAppTheme } from '../../hooks/useAppTheme';
import { fiipRadius } from '../../theme/fiipDesign';

interface GlassCardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  cornerRadius?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  style, 
  intensity = 30, 
  cornerRadius = fiipRadius.lg 
}) => {
  const { isDark } = useAppTheme();

  // Premium glass colors
  const glassBg = isDark 
    ? `rgba(28, 28, 30, ${0.45 + (intensity - 30) * 0.005})` 
    : `rgba(255, 255, 255, ${0.68 + (intensity - 30) * 0.004})`;

  const glassBorderColor = isDark 
    ? 'rgba(255, 255, 255, 0.09)' 
    : 'rgba(255, 255, 255, 0.45)';

  const cardStyle: ViewStyle = {
    borderRadius: cornerRadius,
    backgroundColor: glassBg,
    borderColor: glassBorderColor,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: isDark ? '#000' : '#4E4844',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: isDark ? 0.3 : 0.06,
        shadowRadius: 18,
      },
      android: {
        elevation: 2,
      }
    })
  };

  if (Platform.OS === 'ios') {
    // We import dynamically to avoid issues if not running on iOS
    const { LiquidGlassView } = require('@callstack/liquid-glass');
    return (
      <View testID="glass-card" style={[cardStyle, style]}>
        <LiquidGlassView 
          style={StyleSheet.absoluteFill} 
          intensity={intensity} 
        />
        {/* Soft inner glow highlight */}
        <View style={[StyleSheet.absoluteFill, { 
          borderTopWidth: 1,
          borderLeftWidth: 0.5,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.6)',
          borderRadius: cornerRadius
        }]} pointerEvents="none" />
        {children}
      </View>
    );
  }

  // High-fidelity fallback for Android that emulates Liquid Glass beautifully
  return (
    <View testID="glass-card" style={[cardStyle, style]}>
      {children}
    </View>
  );
};
