import React from 'react';
import { Platform, View, StyleSheet, StyleProp, ViewStyle, Dimensions } from 'react-native';
import { Surface } from 'react-native-paper';
import { LiquidGlassView } from '@callstack/liquid-glass';

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
  cornerRadius = 16 
}) => {
  if (Platform.OS === 'ios') {
    return (
      <View style={[styles.glassCard, { borderRadius: cornerRadius }, style]}>
        <LiquidGlassView 
          style={StyleSheet.absoluteFill} 
          intensity={intensity} 
        />
        {children}
      </View>
    );
  }

  // Android Material Design 3 
  return (
    <Surface 
      elevation={2} 
      style={[styles.md3Card, { borderRadius: cornerRadius }, style]}
    >
      {children}
    </Surface>
  );
};

const styles = StyleSheet.create({
  glassCard: {
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  md3Card: {
    backgroundColor: '#fff', 
    overflow: 'hidden',
  },
});
