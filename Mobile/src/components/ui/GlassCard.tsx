import React from 'react';
import { Platform, View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useAppTheme } from '../../hooks/useAppTheme';
import { fiipRadius, getPlatformDesignSpec } from '../../theme/fiipDesign';

interface GlassCardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  cornerRadius?: number;
  interactive?: boolean;
  tint?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  style, 
  intensity = 30, 
  cornerRadius = fiipRadius.lg,
  interactive = false,
  tint,
}) => {
  const { colors, isDark } = useAppTheme();
  const design = getPlatformDesignSpec(Platform.OS, isDark);

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
    // Dynamic require keeps Android and Jest from loading the iOS-only native view.
    const { LiquidGlassView, isLiquidGlassSupported } = require('@callstack/liquid-glass');
    const supportsLiquidGlass = typeof isLiquidGlassSupported === 'function' ? isLiquidGlassSupported() : true;
    const liquidGlassEffect = design.language === 'liquid-glass' && normalizedIntensity > 18
      ? design.surface.material
      : 'clear';
    return (
      <View testID="glass-card" style={[cardStyle, style]}>
        {supportsLiquidGlass ? (
          <LiquidGlassView
            style={StyleSheet.absoluteFill}
            effect={liquidGlassEffect}
            tintColor={tint || (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.18)')}
            colorScheme={isDark ? 'dark' : 'light'}
            interactive={interactive}
          />
        ) : null}
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
      borderColor: design.surface.stroke,
      borderWidth: StyleSheet.hairlineWidth,
      minHeight: design.controls.minimumHeight,
      overflow: 'hidden',
      elevation: interactive ? 3 : design.surface.elevation,
    };

    return (
      <View testID="glass-card" style={[androidStyle, style]}>
        <View style={[StyleSheet.absoluteFill, {
          backgroundColor: interactive ? design.controls.stateLayer : 'transparent',
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
  androidDepthLine: {
    borderWidth: 1,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  androidSpecular: {
    height: '42%',
    left: 0,
    opacity: 0.75,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
