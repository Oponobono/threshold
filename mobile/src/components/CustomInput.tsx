import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, TouchableOpacity, Animated, Easing } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../styles/theme';

interface CustomInputProps extends TextInputProps {
  label: string;
  error?: string;
  success?: string;
  isPassword?: boolean;
}

export const CustomInput: React.FC<CustomInputProps> = ({ 
  label, 
  error, 
  success, 
  isPassword,
  secureTextEntry,
  value,
  onFocus,
  onBlur,
  ...props 
}) => {
  const [isSecure, setIsSecure] = useState(isPassword || secureTextEntry);
  const [isFocused, setIsFocused] = useState(false);
  
  // Animación para el Floating Label
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isFocused || value ? 1 : 0,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // Color y FontSize no soportan native driver
    }).start();
  }, [isFocused, value]);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  // Interpolaciones
  const labelTop = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [15, -10], // Sube y se asienta sobre el borde
  });

  const labelFontSize = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [15, 11],
  });

  const labelColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['#8A8A8E', isFocused ? '#C5A059' : '#8A8A8E'],
  });

  const borderColor = isFocused ? '#C5A059' : '#E0E0E0';
  const finalBorderColor = error ? theme.colors.text.error : success ? '#34C759' : borderColor;

  return (
    <View style={styles.container}>
      <View style={[styles.inputContainer, { borderColor: finalBorderColor }]}>
        
        {/* Etiqueta Flotante Animada */}
        <Animated.View style={[styles.labelContainer, { top: labelTop }]}>
          <Animated.Text style={[styles.label, { fontSize: labelFontSize, color: labelColor }]}>
            {label}
          </Animated.Text>
        </Animated.View>

        <TextInput
          style={[
            styles.input, 
            isPassword && { paddingRight: 50 } // Espacio para el ícono
          ]}
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={isPassword ? isSecure : secureTextEntry}
          {...props}
        />
        
        {isPassword && (
          <TouchableOpacity 
            style={styles.eyeIcon} 
            onPress={() => setIsSecure(!isSecure)}
            activeOpacity={0.7}
          >
            <Feather 
              name={isSecure ? "eye-off" : "eye"} 
              size={20} 
              color={theme.colors.text.secondary} 
            />
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {success && !error ? <Text style={styles.successText}>{success}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24, // Mayor espacio entre campos
  },
  inputContainer: {
    position: 'relative',
    backgroundColor: '#F9F9F7', // Fondo sutil que se mezcla con el layout
    borderWidth: 0.8, // Borde fino y elegante
    borderRadius: 12, // Estilo Bento
    height: 54,
    justifyContent: 'center',
  },
  labelContainer: {
    position: 'absolute',
    left: 14,
    backgroundColor: '#F9F9F7', // Mismo fondo para "cortar" la línea del borde
    paddingHorizontal: 4,
    zIndex: 1,
  },
  label: {
    fontWeight: '300', // Fuente sans-serif delgada
    letterSpacing: 0.5,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '400',
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    height: '100%',
    justifyContent: 'center',
  },
  errorText: {
    color: theme.colors.text.error,
    fontSize: 12,
    marginTop: 6,
    marginLeft: 16,
  },
  successText: {
    color: '#34C759',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 16,
  },
});
