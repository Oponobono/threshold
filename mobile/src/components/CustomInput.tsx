import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';
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
  ...props 
}) => {
  const [isSecure, setIsSecure] = useState(isPassword || secureTextEntry);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input, 
            error && styles.inputError,
            success && styles.inputSuccess,
            isPassword && { paddingRight: 50 } // make space for the icon
          ]}
          placeholderTextColor={theme.colors.text.placeholder}
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
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
    fontWeight: '500',
  },
  inputContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 14,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.primary,
  },
  inputError: {
    borderColor: theme.colors.text.error,
  },
  inputSuccess: {
    borderColor: '#34C759', // Green for success
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    height: '100%',
    justifyContent: 'center',
  },
  errorText: {
    color: theme.colors.text.error,
    fontSize: theme.typography.sizes.xs,
    marginTop: 4,
    marginLeft: theme.spacing.sm,
  },
  successText: {
    color: '#34C759',
    fontSize: theme.typography.sizes.xs,
    marginTop: 4,
    marginLeft: theme.spacing.sm,
  },
});
