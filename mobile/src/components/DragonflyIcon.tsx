import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface DragonflyIconProps {
  size?: number;
  color?: string;
  style?: any;
}

export const DragonflyIcon: React.FC<DragonflyIconProps> = ({ size = 42, color = '#F5F5F0', style }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round" style={style}>
      {/* Cabeza */}
      <Path d="M 11 3.8 C 11 3.2 11.4 2.8 12 2.8 C 12.6 2.8 13 3.2 13 3.8 C 13 4.4 12.6 4.8 12 4.8 C 11.4 4.8 11 4.4 11 3.8 Z" />
      
      {/* Tórax (Diamante/Cometa) */}
      <Path d="M 12 4.8 L 9.8 7.8 L 12 11.2 L 14.2 7.8 Z" />
      
      {/* Cola (Triángulo alargado) */}
      <Path d="M 11.2 11 L 12 21.5 L 12.8 11 Z" />
      
      {/* Ala Superior Izquierda */}
      <Path d="M 11 5.5 L 1.5 3.5 L 3.5 5.5 L 9.8 8.2 Z" />
      {/* Vena interna superior izquierda */}
      <Path d="M 10.4 6.8 L 2.5 4.5" />
      
      {/* Ala Superior Derecha */}
      <Path d="M 13 5.5 L 22.5 3.5 L 20.5 5.5 L 14.2 8.2 Z" />
      {/* Vena interna superior derecha */}
      <Path d="M 13.6 6.8 L 21.5 4.5" />
      
      {/* Ala Inferior Izquierda */}
      <Path d="M 9.8 8.4 L 1.5 8.8 L 3.5 10.2 L 11.2 11 Z" />
      {/* Vena interna inferior izquierda */}
      <Path d="M 10.5 9.7 L 2.5 9.5" />
      
      {/* Ala Inferior Derecha */}
      <Path d="M 14.2 8.4 L 22.5 8.8 L 20.5 10.2 L 12.8 11 Z" />
      {/* Vena interna inferior derecha */}
      <Path d="M 13.5 9.7 L 21.5 9.5" />
    </Svg>
  );
};
