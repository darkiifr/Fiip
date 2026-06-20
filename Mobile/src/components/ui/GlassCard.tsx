import React from 'react';
import { Platform, View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useAppTheme } from '../../hooks/useAppTheme';
import { fiipRadius } from '../../theme/fiipDesign';

interface GlassCardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  cornerRadius?: number;
  interactive?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  style, 
  intensity = 30, 
  cornerRadius = fiipRadius.lg,
  interactive = false,
}) => {
  const { colors, isDark } = useAppTheme();

  const normalizedIntensity = Math.max(0, Math.min(80, intensity));
  const glassBg = isDark
    ? `rgba(22, 22, 24, ${0.48 + normalizedIntensity * 0.003})`
    : `rgba(255, 255, 255, ${0.58 + normalizedIntensity * 0.0035})`;

  const glassBorderColor = isDark 
    ? 'rgba(255, 255, 255, 0.12)' 
    : 'rgba(255, 255, 255, 0.62)';

  const cardStyle: ViewStyle = {
    borderRadius: cornerRadius,
    backgroundColor: glassBg,
    borderColor: glassBorderColor,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: isDark ? '#000' : '#4E4844',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: isDark ? 0.34 : 0.08,
        shadowRadius: 24,
      },
      android: {
        elevation: interactive ? 8 : 5,
        shadowColor: '#000',
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
          intensity={normalizedIntensity}
          interactive={interactive}
        />
        <View style={[StyleSheet.absoluteFill, {
          backgroundColor: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.22)',
          borderRadius: cornerRadius,
        }]} pointerEvents="none" />
        <View style={[StyleSheet.absoluteFill, { 
          borderTopWidth: 1,
          borderLeftWidth: 1,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.75)',
          borderRadius: cornerRadius
        }]} pointerEvents="none" />
        {children}
      </View>
    );
  }

  if (Platform.OS === 'android') {
    const androidStyle: ViewStyle = {
      borderRadius: cornerRadius,
      backgroundColor: interactive ? colors.surfaceContainerHigh : colors.surfaceContainer,
      borderColor: colors.outlineVariant,
      borderWidth: StyleSheet.hairlineWidth,
      overflow: 'hidden',
      elevation: interactive ? 3 : 1,
    };

    return (
      <View testID="glass-card" style={[androidStyle, style]}>
        <View style={[StyleSheet.absoluteFill, {
          backgroundColor: interactive ? colors.stateLayer : 'transparent',
          opacity: interactive ? 0.42 : 0,
        }]} pointerEvents="none" />
        {children}
      </View>
    );
  }

  return (
    <View testID="glass-card" style={[cardStyle, style]}>
      <View style={[StyleSheet.absoluteFill, {
        borderRadius: cornerRadius,
        backgroundColor: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.3)',
      }]} pointerEvents="none" />
      <View style={[styles.androidSpecular, {
        borderRadius: cornerRadius,
        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.55)',
      }]} pointerEvents="none" />
      <View style={[styles.androidDepthLine, {
        borderRadius: cornerRadius,
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(70,60,48,0.08)',
      }]} pointerEvents="none" />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  androidSpecular: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '42%',
    opacity: 0.75,
  },
  androidDepthLine: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
  },
});
