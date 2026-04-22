import React from 'react';
import { TouchableOpacity, Text, StyleSheet, TouchableOpacityProps, ActivityIndicator } from 'react-native';
import { theme } from '../styles/theme';

interface CustomButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'outline';
  loading?: boolean;
}

export const CustomButton: React.FC<CustomButtonProps> = ({ 
  title, 
  variant = 'primary', 
  loading = false, 
  style, 
  ...props 
}) => {
  const isPrimary = variant === 'primary';
  
  return (
    <TouchableOpacity
      style={[
        styles.button,
        isPrimary ? styles.primaryButton : styles.outlineButton,
        props.disabled && styles.disabled,
        style
      ]}
      disabled={props.disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? theme.colors.text.white : theme.colors.text.primary} />
      ) : (
        <Text style={[
          styles.text,
          isPrimary ? styles.primaryText : styles.outlineText
        ]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
  },
  primaryText: {
    color: theme.colors.text.white,
  },
  outlineText: {
    color: theme.colors.text.primary,
  },
});
