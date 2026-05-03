import { StyleSheet } from 'react-native';
import { theme } from './theme';

export const audioRecorderStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  closeBtn: {
    padding: 4,
    marginRight: -4,
    marginTop: -8, // Lo sube ligeramente
  },
  recorderContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timerText: {
    fontSize: 48,
    fontWeight: '700',
    color: theme.colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  statusText: {
    fontSize: 14,
    color: theme.colors.text.error,
    fontWeight: '600',
    marginTop: 4,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
  },
  recordingButtonActive: {
    borderColor: '#FF3B3040',
  },
  recordButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF3B30',
  },
  recordingButtonInnerActive: {
    borderRadius: 8,
    width: 30,
    height: 30,
  },
  secondaryRecordBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.border + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintText: {
    marginTop: 16,
    fontSize: 14,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    backgroundColor: theme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  listContent: {
    paddingBottom: 8,
    flexGrow: 0,
  },
  recordingsFlatList: {
    flexShrink: 1,
    flexGrow: 0,
  },
  recordingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  recordingInfo: {
    flex: 1,
  },
  recordingName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  recordingDate: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  recordingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  liveWaveform: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3,
    height: 36,
    width: '70%',
    alignSelf: 'center',
    marginTop: 16,
    marginBottom: 4,
  },
  liveWaveBar: {
    flex: 1,
    borderRadius: 3,
    backgroundColor: '#FF3B30',
    opacity: 0.85,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});
