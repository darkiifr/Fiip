import React from 'react';
import { Platform, ViewStyle, StyleProp } from 'react-native';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SFSymbol } from 'react-native-sfsymbols';

interface IconProps {
  sfSymbol: string;
  mdIcon: string;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  weight?: 'ultraLight' | 'thin' | 'light' | 'regular' | 'medium' | 'semibold' | 'bold' | 'heavy' | 'black';
}

export const Icon: React.FC<IconProps> = ({ 
  sfSymbol, 
  mdIcon, 
  size = 24, 
  color = '#000', 
  style,
  weight = 'regular' 
}) => {
  if (Platform.OS === 'ios') {
    return (
      <SFSymbol
        name={sfSymbol}
        weight={weight === 'ultraLight' ? 'ultralight' : weight === 'black' ? 'heavy' : weight as any}
        scale="medium"
        color={color}
        size={size}
        style={[{ width: size, height: size }, style]}
        multicolor={false}
      />
    );
  }

  return (
    <MaterialCommunityIcon 
      name={mdIcon} 
      size={size} 
      color={color} 
      style={style as any} 
    />
  );
};
