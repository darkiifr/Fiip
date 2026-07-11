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
import { fiipRadius } from '../../theme/fiipDesign';
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
  const { colors } = useAppTheme();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }, style]} edges={edges}>
      <View style={[styles.screenContent, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}

export function FiipToolbar({ children, style }: FiipToolbarProps) {
  const { colors, isDark } = useAppTheme();
  const isIOS = Platform.OS === 'ios';

  return (
    <View
      style={[
        styles.toolbar,
        {
          backgroundColor: isIOS
            ? isDark ? 'rgba(18,18,20,0.64)' : 'rgba(255,255,255,0.7)'
            : colors.surfaceContainer,
          borderColor: colors.outlineVariant,
        },
        style,
      ]}
    >
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
  const { colors } = useAppTheme();
  const fg = destructive ? colors.danger : selected ? colors.onPrimaryContainer : colors.text;
  const bg = selected ? colors.primaryContainer : colors.surfaceContainerLow;

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
  const { colors } = useAppTheme();
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
          opacity: pressed ? 0.78 : 1,
        },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.surfaceContainerHigh }]}>
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
  screen: {
    flex: 1,
  },
  screenContent: {
    flex: 1,
  },
  toolbar: {
    borderRadius: Platform.OS === 'ios' ? fiipRadius.xl : 28,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  action: {
    minHeight: 42,
    borderRadius: Platform.OS === 'ios' ? 21 : 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  actionCompact: {
    width: 42,
    paddingHorizontal: 0,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '800',
  },
  row: {
    minHeight: 68,
    borderRadius: Platform.OS === 'ios' ? 22 : 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: Platform.OS === 'ios' ? 16 : 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  rowSubtitle: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  rowMeta: {
    fontSize: 12,
    fontWeight: '800',
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 42,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyMessage: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  emptyAction: {
    marginTop: 18,
  },
});
