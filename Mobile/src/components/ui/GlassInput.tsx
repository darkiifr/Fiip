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
      <GlassCard intensity={isDark ? 30 : 50} cornerRadius={12} style={[styles.containerIOS, style]}>
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
    <View style={[styles.containerAndroid, { backgroundColor: colors.card, borderBottomColor: colors.primary }, style]}>
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
    height: 48,
    marginBottom: 12,
  },
  containerAndroid: {
    height: 48,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 2,
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
  }
});
