import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Text, Dimensions } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import { Icon } from './ui/Icon';
import { triggerHaptic } from '../utils/hapticEngine';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export function FloatingTabBar({ state, descriptors, navigation }: any) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  const activeAccent = '#A48A7B'; // Editorial Brand rose-taupe accent from mockup

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: isDark ? 'rgba(15, 15, 15, 0.85)' : 'rgba(255, 255, 255, 0.88)',
        borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
        paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
      }
    ]}>
      {Platform.OS === 'ios' && (
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
                // "Nouveau" custom floating round glass action button
                <View style={styles.newButtonContainer}>
                  <View style={[
                    styles.newIconCircle, 
                    { 
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)'
                    }
                  ]}>
                    <Icon 
                      sfSymbol={iconProps.sfSymbol} 
                      mdIcon={iconProps.mdIcon} 
                      size={20} 
                      color={isDark ? '#FFF' : '#000'} 
                      weight="medium"
                    />
                  </View>
                  <Text style={[styles.tabLabel, { color: colors.textSecondary }]}>Nouveau</Text>
                </View>
              ) : (
                // Regular tabs with capsule highlight and active dot indicator
                <View style={styles.regularTabContainer}>
                  <View style={[
                    styles.iconCapsule,
                    isFocused && { 
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' 
                    }
                  ]}>
                    <Icon 
                      sfSymbol={iconProps.sfSymbol} 
                      mdIcon={iconProps.mdIcon} 
                      size={22} 
                      color={isFocused ? colors.text : colors.textSecondary} 
                      weight={isFocused ? 'bold' : 'regular'}
                    />
                  </View>
                  <Text style={[
                    styles.tabLabel, 
                    { color: isFocused ? colors.text : colors.textSecondary, fontWeight: isFocused ? '600' : '500' }
                  ]}>
                    {options.title || route.name}
                  </Text>
                  
                  {/* Delicate active dot indicator from mockup */}
                  <View style={[
                    styles.activeDot, 
                    { backgroundColor: isFocused ? activeAccent : 'transparent' }
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
    height: Platform.OS === 'ios' ? 92 : 82,
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
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
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 14,
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
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  }
});
