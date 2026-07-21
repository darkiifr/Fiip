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
  containerAndroid: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 1,
    flexDirection: 'row',
    marginBottom: 12,
    minHeight: 56,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  containerIOS: {
    marginBottom: 12,
    minHeight: 52,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
  },
  iconWrapper: {
    justifyContent: 'center',
    paddingLeft: 12,
    paddingRight: 8,
  },
  inputAndroid: {
    flex: 1,
    fontSize: 16,
    height: '100%',
    paddingHorizontal: 12,
  },
  inputIOS: {
    flex: 1,
    fontFamily: 'System',
    fontSize: 16,
    height: '100%',
    paddingHorizontal: 12,
  },
});
