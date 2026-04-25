import { StyleSheet } from 'react-native';
import { theme } from './theme';

export const thresholdDatePickerStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: 320,
    backgroundColor: theme.colors.white,
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    height: 30,
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text.primary,
    letterSpacing: -0.3,
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  weekDayText: {
    width: 38,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayCell: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderRadius: 12,
  },
  selectedDay: {
    backgroundColor: theme.colors.primary,
  },
  dayText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  selectedDayText: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  todayText: {
    color: theme.colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  yearCell: {
    width: '30%',
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
  },
  selectedYear: {
    backgroundColor: theme.colors.primary,
  },
  yearText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  selectedYearText: {
    color: theme.colors.white,
  },
  closeBtn: {
    marginTop: 16,
    alignSelf: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  }
});
