import React from 'react';
import {
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';

import { useAppTheme } from '../../hooks/useAppTheme';
import { fiipRadius, getPlatformDesignSpec } from '../../theme/fiipDesign';
import { Icon } from './Icon';

type IconName = {
  sfSymbol: string;
  mdIcon: string;
};

interface FiipScreenProps {
  children: React.ReactNode;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

interface FiipActionProps extends IconName {
  label: string;
  onPress: () => void;
  selected?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

interface FiipListRowProps extends IconName {
  title: string;
  subtitle?: string;
  meta?: string;
  onPress?: () => void;
  selected?: boolean;
  accentColor?: string;
  right?: React.ReactNode;
}

interface FiipEmptyStateProps extends IconName {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface FiipToolbarProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function FiipScreen({ children, edges = ['top', 'left', 'right'], style, contentStyle }: FiipScreenProps) {
  const { colors, isDark } = useAppTheme();
  const design = getPlatformDesignSpec(Platform.OS, isDark);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: design.surface.background || colors.background }, style]} edges={edges}>
      <View style={[styles.screenContent, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}

export function FiipToolbar({ children, style }: FiipToolbarProps) {
  const { colors, isDark } = useAppTheme();
  const isIOS = Platform.OS === 'ios';
  const design = getPlatformDesignSpec(Platform.OS, isDark);

  return (
    <View
      style={[
        styles.toolbar,
        {
          backgroundColor: isIOS
            ? isDark ? 'rgba(18,18,20,0.64)' : 'rgba(255,255,255,0.7)'
            : colors.surfaceContainerHigh,
          borderColor: design.surface.stroke,
          borderRadius: design.surface.radius,
          minHeight: design.controls.minimumHeight,
        },
        style,
      ]}
    >
      {isIOS ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.liquidGlassSheen]} />
      ) : (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: design.controls.stateLayer, opacity: 0.12 }]} />
      )}
      {children}
    </View>
  );
}

export function FiipAction({
  label,
  sfSymbol,
  mdIcon,
  onPress,
  selected = false,
  destructive = false,
  disabled = false,
  compact = false,
  style,
}: FiipActionProps) {
  const { colors, isDark } = useAppTheme();
  const design = getPlatformDesignSpec(Platform.OS, isDark);
  const fg = destructive ? colors.danger : selected ? colors.onPrimaryContainer : colors.text;
  const bg = selected
    ? colors.primaryContainer
    : design.language === 'material' ? colors.surfaceContainerHigh : colors.surfaceContainerLow;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        compact && styles.actionCompact,
        {
          backgroundColor: bg,
          borderColor: selected ? colors.primary : colors.outlineVariant,
          borderRadius: compact && design.language === 'material' ? 20 : design.controls.radius,
          minHeight: compact ? design.controls.minimumHeight : Math.max(42, design.controls.minimumHeight),
          opacity: disabled ? 0.48 : pressed ? 0.76 : 1,
        },
        style,
      ]}
    >
      <Icon sfSymbol={sfSymbol} mdIcon={mdIcon} size={compact ? 16 : 18} color={fg} />
      {!compact && <Text style={[styles.actionText, { color: fg }]} numberOfLines={1}>{label}</Text>}
    </Pressable>
  );
}

export function FiipListRow({
  title,
  subtitle,
  meta,
  sfSymbol,
  mdIcon,
  onPress,
  selected = false,
  accentColor,
  right,
}: FiipListRowProps) {
  const { colors, isDark } = useAppTheme();
  const design = getPlatformDesignSpec(Platform.OS, isDark);
  const iconColor = accentColor || (selected ? colors.primary : colors.textSecondary);

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: selected ? colors.primaryContainer : colors.surfaceContainerLow,
          borderColor: selected ? colors.primary : colors.outlineVariant,
          borderRadius: design.language === 'material' ? 20 : 22,
          minHeight: design.language === 'material' ? 72 : 68,
          opacity: pressed ? 0.78 : 1,
        },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.surfaceContainerHigh, borderRadius: design.language === 'material' ? 14 : 16 }]}>
        <Icon sfSymbol={sfSymbol} mdIcon={mdIcon} size={18} color={iconColor} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {meta ? <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>{meta}</Text> : right}
    </Pressable>
  );
}

export function FiipEmptyState({ title, message, sfSymbol, mdIcon, actionLabel, onAction }: FiipEmptyStateProps) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceContainerHigh }]}>
        <Icon sfSymbol={sfSymbol} mdIcon={mdIcon} size={24} color={colors.textSecondary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>{message}</Text>
      {actionLabel && onAction ? (
        <FiipAction label={actionLabel} sfSymbol="plus" mdIcon="plus" onPress={onAction} style={styles.emptyAction} />
      ) : null}
    </View>
  );
}

export function textStyles(colors: { text: string; textSecondary: string }): Record<string, TextStyle> {
  return {
    kicker: { color: colors.textSecondary, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7 },
    title: { color: colors.text, fontSize: 34, lineHeight: 39, fontWeight: '900' },
    section: { color: colors.text, fontSize: 21, lineHeight: 26, fontWeight: '900' },
  };
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    borderRadius: Platform.OS === 'ios' ? 21 : 16,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 14,
  },
  actionCompact: {
    paddingHorizontal: 0,
    width: 42,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '800',
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 42,
  },
  emptyAction: {
    marginTop: 18,
  },
  emptyIcon: {
    alignItems: 'center',
    borderRadius: 20,
    height: 56,
    justifyContent: 'center',
    marginBottom: 16,
    width: 56,
  },
  emptyMessage: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  liquidGlassSheen: {
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.06)' : 'transparent',
  },
  row: {
    alignItems: 'center',
    borderRadius: Platform.OS === 'ios' ? 22 : 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    minHeight: 68,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowIcon: {
    alignItems: 'center',
    borderRadius: Platform.OS === 'ios' ? 16 : 14,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  rowMeta: {
    fontSize: 12,
    fontWeight: '800',
  },
  rowSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    marginTop: 3,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  screen: {
    flex: 1,
  },
  screenContent: {
    flex: 1,
  },
  toolbar: {
    alignItems: 'center',
    borderRadius: Platform.OS === 'ios' ? fiipRadius.xl : 28,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
    overflow: 'hidden',
    padding: 8,
  },
});
