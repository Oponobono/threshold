import { StyleSheet } from 'react-native';
import { theme } from './theme';

export const registerStyles = StyleSheet.create({
  reqCard: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  reqTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  reqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  reqText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.sm,
  },
  reqTextFulfilled: {
    color: '#34C759',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    marginVertical: theme.spacing.md,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  segmentButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  segmentText: {
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: theme.spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    borderStyle: 'dashed',
  },
  emptyStateText: {
    marginTop: theme.spacing.sm,
    color: theme.colors.text.placeholder,
    fontSize: theme.typography.sizes.sm,
    textAlign: 'center',
  }
});
