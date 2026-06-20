import React from 'react';
import { TextInput, TextInputProps, StyleSheet, Platform, View } from 'react-native';
import { GlassCard } from './GlassCard';
import { useAppTheme } from '../../hooks/useAppTheme';

interface GlassInputProps extends TextInputProps {
  icon?: React.ReactNode;
}

export const GlassInput: React.FC<GlassInputProps> = ({ icon, style, ...props }) => {
  const isIOS = Platform.OS === 'ios';
  const { colors, isDark } = useAppTheme();

  if (isIOS) {
    return (
      <GlassCard intensity={isDark ? 44 : 58} cornerRadius={18} interactive style={[styles.containerIOS, style]}>
        <View style={styles.content}>
          {icon && <View style={styles.iconWrapper}>{icon}</View>}
          <TextInput
            style={[styles.inputIOS, { color: colors.text }]}
            placeholderTextColor={colors.textSecondary}
            {...props}
          />
        </View>
      </GlassCard>
    );
  }

  return (
    <View style={[styles.containerAndroid, {
      backgroundColor: colors.surfaceContainerHighest,
      borderColor: colors.outlineVariant,
      shadowColor: isDark ? '#000' : '#6750A4',
    }, style]}>
      {icon && <View style={styles.iconWrapper}>{icon}</View>}
      <TextInput
        style={[styles.inputAndroid, { color: colors.text }]}
        placeholderTextColor={colors.textSecondary}
        {...props}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  containerIOS: {
    minHeight: 52,
    marginBottom: 12,
  },
  containerAndroid: {
    minHeight: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    elevation: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    paddingLeft: 12,
    paddingRight: 8,
    justifyContent: 'center',
  },
  inputIOS: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: 'System',
  },
  inputAndroid: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 12,
    fontSize: 16,
  },
});
