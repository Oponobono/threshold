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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.full,
    marginBottom: theme.spacing.md,
  },
  biometricsText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  biometricsSubtext: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text.secondary,
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
    marginBottom: theme.spacing.md,
  },
  copyrightText: {
    textAlign: 'center',
    fontSize: 10,
    color: theme.colors.text.placeholder,
    marginBottom: theme.spacing.md,
  },
});
