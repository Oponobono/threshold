import { StyleSheet } from 'react-native';
import { theme } from './theme';

export const featureCarouselStyles = StyleSheet.create({
  carouselContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    overflow: 'hidden',
  },
  pageContainer: {
    paddingHorizontal: theme.spacing.md,
  },
  featureCard: {
    backgroundColor: theme.colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14, // Cambio a horizontal para respetar el height
    height: 74, // Alto fijo para asegurar coherencia visual
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text.secondary,
    lineHeight: 16,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg, // Ajustado para alinear con el pageContainer
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D9D9D9',
  },
  activeDot: {
    backgroundColor: theme.colors.primary,
  },
  swipeText: {
    fontSize: 10,
    color: theme.colors.text.secondary,
  },
});
