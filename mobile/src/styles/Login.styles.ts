import { StyleSheet } from 'react-native';
import { theme } from './theme';

export const loginStyles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  brandHeaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end', // Align baseline
    justifyContent: 'center',
    marginBottom: 4,
  },
  brandLogo: {
    marginRight: 2, 
    marginBottom: 4, // Para que el tallo baje como una T mayúscula
  },
  brandAppName: {
    fontSize: 34,
    fontWeight: '400',
    color: '#1A1A1A',
    letterSpacing: 2,
  },
  brandSlogan: {
    fontWeight: '300', 
    fontSize: 9,
    letterSpacing: 8,
    color: '#8A8A8E',
    textTransform: 'uppercase',
  },
  formContainer: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.md,
  },
  formHeaderContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  formHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  formHeaderSubtitle: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxText: {
    marginLeft: theme.spacing.sm,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.primary,
  },
  biometricsButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderWidth: 0.8,
    borderColor: '#E0E0E0',
    borderRadius: 16,
    minWidth: 100,
  },
  touchIdIconButton: {
    alignSelf: 'stretch',      // Iguala la altura del botón de login
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,     // Ceñido: solo el espacio justo alrededor del icono
    borderWidth: 0.8,
    borderColor: '#E0E0E0',
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'transparent',
  },
  biometricsText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.text.secondary,
    letterSpacing: 0.5,
  },
  guestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: theme.spacing.md,
  },
  guestTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  guestSubtitle: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text.secondary,
  },
  footerLinksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.xl,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xxl,
  },
  footerText: {
    textAlign: 'center',
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  copyrightText: {
    textAlign: 'center',
    fontSize: 10,
    color: theme.colors.text.placeholder,
    marginBottom: theme.spacing.md,
  },
});
