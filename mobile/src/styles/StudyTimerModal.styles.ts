import { StyleSheet } from 'react-native';
import { theme } from './theme';

export const studyTimerModalStyles = StyleSheet.create({
  modeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  modeBtn: {
    flex: 1,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modeBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  modeBtnText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  modeBtnTextActive: {
    color: theme.colors.white,
  },
  durationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  durationChip: {
    width: '22%',
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  durationChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.inputBackground,
  },
  durationText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  durationTextActive: {
    color: theme.colors.primary,
  },
  subjectsScroll: {
    paddingRight: 20,
    gap: 12,
  },
  subjectCard: {
    width: 100,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  subjectName: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  finishIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D4AF3715',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
    justifyContent: 'center',
  },
  optionBtn: {
    width: '45%',
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
});
