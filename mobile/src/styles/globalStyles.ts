import { Platform, StatusBar, StyleSheet } from 'react-native';
import { theme } from './theme';

export const globalStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shadow: {
    shadowColor: theme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  textLink: {
    color: theme.colors.text.link,
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.md,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  separatorText: {
    marginHorizontal: theme.spacing.md,
    color: theme.colors.text.secondary,
    fontSize: theme.typography.sizes.sm,
  },
});
