import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Text } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import { Icon } from './ui/Icon';
import { triggerHaptic } from '../utils/hapticEngine';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function FloatingTabBar({ state, descriptors, navigation }: any) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === 'ios';

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: isIOS
          ? (isDark ? 'rgba(12, 12, 14, 0.58)' : 'rgba(255, 255, 255, 0.58)')
          : colors.surfaceContainer,
        borderTopColor: isIOS
          ? (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(60, 60, 67, 0.12)')
          : colors.outlineVariant,
        paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
      }
    ]}>
      {isIOS && (
        <View style={styles.blurWrapper}>
          {/* iOS Native glass blur view */}
          {(() => {
            try {
              const { LiquidGlassView } = require('@callstack/liquid-glass');
              return <LiquidGlassView style={StyleSheet.absoluteFill} intensity={40} />;
            } catch (e) {
              return null;
            }
          })()}
        </View>
      )}

      <View style={styles.tabBarContent}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              triggerHaptic('selection');
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const isNewAction = route.name === 'New';

          const handlePress = () => {
            if (isNewAction) {
              triggerHaptic('impactLight');
              navigation.navigate('NoteEditor');
              return;
            }
            onPress();
          };

          // Get exact cross-platform icons matching mockups
          const getIconProps = () => {
            switch (route.name) {
              case 'Home':
                return { sfSymbol: isFocused ? 'house.fill' : 'house', mdIcon: isFocused ? 'home' : 'home-outline' };
              case 'Search':
                return { sfSymbol: 'magnifyingglass', mdIcon: 'magnify' };
              case 'New':
                return { sfSymbol: 'plus', mdIcon: 'plus' };
              case 'Assistant':
                return { sfSymbol: 'sparkles', mdIcon: 'sparkles' };
              case 'Settings':
                return { sfSymbol: 'gearshape', mdIcon: 'cog' };
              default:
                return { sfSymbol: 'doc', mdIcon: 'file' };
            }
          };

          const iconProps = getIconProps();

          return (
            <TouchableOpacity
              key={index}
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={handlePress}
              onLongPress={onLongPress}
              style={styles.tabButton}
              activeOpacity={0.7}
            >
              {isNewAction ? (
                <View style={styles.newButtonContainer}>
                  <View style={[
                    styles.newIconCircle, 
                    { 
                      backgroundColor: isIOS
                        ? (isDark ? 'rgba(255, 255, 255, 0.13)' : 'rgba(255, 255, 255, 0.72)')
                        : colors.primaryContainer,
                      borderColor: isIOS
                        ? (isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(60, 60, 67, 0.18)')
                        : colors.primaryContainer,
                    }
                  ]}>
                    {isIOS && (
                      <View style={styles.newLiquidOverlay} pointerEvents="none" />
                    )}
                    <Icon 
                      sfSymbol={iconProps.sfSymbol} 
                      mdIcon={iconProps.mdIcon} 
                      size={20} 
                      color={isIOS ? (isDark ? '#FFF' : '#000') : colors.onPrimaryContainer} 
                      weight="medium"
                    />
                  </View>
                  <Text style={[styles.tabLabel, { color: colors.textSecondary }]}>Nouveau</Text>
                </View>
              ) : (
                <View style={styles.regularTabContainer}>
                  <View style={[
                    styles.iconCapsule,
                    isFocused && { 
                      backgroundColor: isIOS
                        ? (isDark ? 'rgba(255, 255, 255, 0.11)' : 'rgba(255, 255, 255, 0.64)')
                        : colors.primaryContainer,
                      borderColor: isIOS
                        ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(60,60,67,0.12)')
                        : colors.primaryContainer,
                    }
                  ]}>
                    <Icon 
                      sfSymbol={iconProps.sfSymbol} 
                      mdIcon={iconProps.mdIcon} 
                      size={22} 
                      color={isFocused ? (isIOS ? colors.primary : colors.onPrimaryContainer) : colors.textSecondary} 
                      weight={isFocused ? 'bold' : 'regular'}
                    />
                  </View>
                  <Text style={[
                    styles.tabLabel, 
                    { color: isFocused ? (isIOS ? colors.primary : colors.onPrimaryContainer) : colors.textSecondary, fontWeight: isFocused ? '600' : '500' }
                  ]}>
                    {options.title || route.name}
                  </Text>
                  
                  <View style={[
                    styles.activeDot, 
                    { backgroundColor: isFocused ? (isIOS ? colors.primary : colors.primary) : 'transparent' }
                  ]} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: Platform.OS === 'ios' ? 96 : 92,
    borderTopWidth: 1,
    elevation: Platform.OS === 'android' ? 3 : 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: Platform.OS === 'ios' ? 0.08 : 0.1,
    shadowRadius: Platform.OS === 'ios' ? 22 : 8,
  },
  blurWrapper: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  tabBarContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  regularTabContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  iconCapsule: {
    minWidth: Platform.OS === 'android' ? 64 : undefined,
    height: Platform.OS === 'android' ? 32 : undefined,
    paddingHorizontal: Platform.OS === 'android' ? 18 : 16,
    paddingVertical: Platform.OS === 'android' ? 0 : 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: -0.1,
  },
  activeDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 1.75,
    marginTop: 4,
  },
  newButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  newIconCircle: {
    width: Platform.OS === 'android' ? 56 : 42,
    height: Platform.OS === 'android' ? 56 : 42,
    borderRadius: Platform.OS === 'android' ? 16 : 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    overflow: 'hidden',
    elevation: Platform.OS === 'android' ? 6 : 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
  },
  newLiquidOverlay: {
    position: 'absolute',
    top: 1,
    left: 3,
    right: 3,
    height: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.36)',
  }
});
