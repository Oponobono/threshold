import { StyleSheet } from 'react-native';
import { theme } from './theme';

export const customButtonStyles = StyleSheet.create({
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
