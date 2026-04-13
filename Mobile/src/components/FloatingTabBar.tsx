import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Animated, Dimensions } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// @ts-ignore
import { SFSymbol } from 'react-native-sfsymbols';
// @ts-ignore
import { LiquidGlassView } from '@callstack/liquid-glass';
import { triggerHaptic } from '../utils/hapticEngine';

const { width } = Dimensions.get('window');

export function FloatingTabBar({ state, descriptors, navigation }: any) {
  const { colors, isDark } = useAppTheme();

  return (
    <View style={styles.wrapper}>
      <View style={[
          styles.container, 
          { 
              backgroundColor: Platform.OS === 'ios' ? 'transparent' : colors.card,
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)',
              borderWidth: Platform.OS === 'ios' ? StyleSheet.hairlineWidth : 0,
          }
      ]}>
        
        {Platform.OS === 'ios' && (
          <View style={styles.liquidGlassWrapper}>
             <LiquidGlassView blurAmount={80} style={StyleSheet.absoluteFill} />
             <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.5)' }]} />
          </View>
        )}

        <View style={styles.content}>
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

            const getIcon = () => {
              const size = 26;
              const color = isFocused ? colors.text : colors.textSecondary;
              
              if (Platform.OS === 'ios') {
                let symbol = '';
                if (route.name === 'Home') symbol = isFocused ? 'house.fill' : 'house';
                else if (route.name === 'Favorites') symbol = isFocused ? 'star.fill' : 'star';
                else if (route.name === 'Settings') symbol = isFocused ? 'gearshape.fill' : 'gearshape';
                
                return (
                  <SFSymbol
                    name={symbol}
                    weight={isFocused ? "bold" : "medium"}
                    color={color}
                    size={size}
                    style={{ width: size, height: size }}
                  />
                );
              } else {
                let iconName = '';
                if (route.name === 'Home') iconName = 'home';
                else if (route.name === 'Favorites') iconName = 'star';
                else if (route.name === 'Settings') iconName = 'cog';
                
                return <Icon name={iconName} size={size} color={color} />;
              }
            };

            return (
              <TouchableOpacity
                key={index}
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID}
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.tabButton}
                activeOpacity={0.8}
              >
                <Animated.View
                  style={[
                    styles.iconContainer,
                    {
                      backgroundColor: isFocused 
                        ? (isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.06)') 
                        : 'transparent',
                    },
                  ]}
                >
                  {getIcon()}
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 32 : 24,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flexDirection: 'row',
    height: 64,
    width: width * 0.6, // Compact width like SwiftUI dock
    minWidth: 260,
    borderRadius: 32,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 28,
  },
  liquidGlassWrapper: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
  },
});
