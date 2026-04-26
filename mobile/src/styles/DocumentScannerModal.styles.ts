import { StyleSheet } from 'react-native';
import { theme } from './theme';

export const globalStyles = {
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  }
};

export const documentScannerStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  guideScreen: {
    flex: 1,
    paddingTop: 60,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  closeBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  headerSpacer: {
    width: 28,
  },
  guideContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  levelIndicator: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    backgroundColor: theme.colors.inputBackground,
  },
  levelIndicatorActive: {
    borderColor: '#4ade80',
    backgroundColor: '#4ade8020',
  },
  levelBubble: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.border,
  },
  levelBubbleActive: {
    backgroundColor: '#4ade80',
    transform: [{ scale: 1.2 }],
  },
  guideTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  guideSubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  guideFooter: {
    padding: 24,
    paddingBottom: 40,
  },
  launchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 30,
    gap: 12,
  },
  launchBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  launchBtnInactive: {
    backgroundColor: theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  launchBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  launchBtnTextInactive: {
    color: theme.colors.text.secondary,
  },
  savingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 24,
    paddingTop: 60,
  },
  previewCard: {
    flex: 0.5,
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 20,
    ...globalStyles.shadow,
  },
  previewImage: {
    flex: 1,
  },
  scanEffect: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  stepTitle: {
    color: theme.colors.text.primary,
    fontSize: 24,
    fontWeight: '700',
    marginTop: 24,
  },
  modeSelector: {
    marginTop: 16,
  },
  modeLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginBottom: 8,
  },
  modeBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  modeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modeBadgeActive: {
    backgroundColor: theme.colors.primary + '20',
    borderColor: theme.colors.primary,
  },
  modeBadgeText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontWeight: '600',
  },
  modeBadgeTextActive: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  subjectBadgeOverride: {
    marginBottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  subjectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 20,
  },
  subjectItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  subjectName: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.primary,
    flex: 1,
  },
  saveActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
    marginBottom: 20,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: theme.colors.inputBackground,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondaryBtnText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 20,
    fontSize: 16,
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
});
