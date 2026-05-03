import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';

interface SubjectThresholdProps {
  securedPercent: number;
  finalNeededText: string;
  subjectColor?: string;
  status?: 'safe' | 'caution' | 'risk';
}

/** Returns a status color based on the academic risk status */
const getStatusColor = (status?: string): string => {
  if (status === 'safe') return '#00C47D'; // green
  if (status === 'caution') return '#FF9F0A'; // amber
  return '#FF3B30'; // red (default/risk)
};

const getStatusIcon = (status?: string): string => {
  if (status === 'safe') return 'shield-check-outline';
  if (status === 'caution') return 'shield-half-full';
  return 'shield-alert-outline';
};

const getStatusLabel = (status: string | undefined, t: any): string => {
  if (status === 'safe') return t('subjects.statusSafe') || 'En buen camino';
  if (status === 'caution') return t('subjects.statusCaution') || 'Atención requerida';
  return t('subjects.statusRisk') || 'En riesgo';
};

const darkenColor = (hex: string, percent: number): string => {
  let color = hex.replace('#', '');
  if (color.length === 3) color = color.split('').map(c => c + c).join('');
  if (color.length !== 6) return hex;
  
  const num = parseInt(color, 16);
  const amt = Math.round(2.55 * percent);
  let r = (num >> 16) - amt;
  let g = ((num >> 8) & 0x00FF) - amt;
  let b = (num & 0x0000FF) - amt;

  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));

  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
};

export const SubjectThreshold: React.FC<SubjectThresholdProps> = ({
  securedPercent,
  finalNeededText,
  subjectColor,
  status = 'safe',
}) => {
  const { t } = useTranslation();
  const clampedPct = Math.max(0, Math.min(100, Math.round(securedPercent)));
  const statusColor = getStatusColor(status);
  const accentColor = subjectColor || statusColor;
  const darkAccentColor = darkenColor(accentColor, 40); // 40% darker for high contrast text

  const renderHighlightedText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\d+(?:\.\d+)?%?)/g);
    return parts.map((part, index) => {
      if (/^\d+(?:\.\d+)?%?$/.test(part)) {
        return (
          <Text key={index} style={{ color: darkAccentColor, fontWeight: '800' }}>
            {part}
          </Text>
        );
      }
      return part;
    });
  };

  return (
    <View style={styles.card}>
      {/* Top row: label + status pill */}
      <View style={styles.topRow}>
        <View style={styles.labelGroup}>
          <Text style={styles.eyebrow}>{t('subjects.thresholdTitle')}</Text>
        </View>

        <View style={[styles.statusPill, { backgroundColor: `${statusColor}26` }]}>
          <MaterialCommunityIcons name={getStatusIcon(status) as any} size={13} color={statusColor} />
          <Text style={[styles.statusPillText, { color: statusColor }]}>
            {getStatusLabel(status, t)}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Main score area — horizontal, needed gets more space */}
      <View style={styles.scoreRow}>
        {/* Left: percentage badge */}
        <View style={styles.percentBlock}>
          <Text style={[styles.percentValue, { color: darkAccentColor }]}>
            {clampedPct}
            <Text style={styles.percentSign}>%</Text>
          </Text>
          <Text style={styles.percentLabel}>{t('subjects.secured')}</Text>
        </View>

        {/* Right: what's needed */}
        <View style={styles.neededBlock}>
          <View style={styles.neededHeaderRow}>
            <View style={[styles.neededIconWrap, { backgroundColor: `${accentColor}59` }]}>
              <MaterialCommunityIcons name="target" size={16} color={darkAccentColor} />
            </View>
            <Text style={styles.neededTitle}>{t('subjects.neededLabel')}</Text>
          </View>
          <Text style={[styles.neededValue, { color: theme.colors.text.primary }]}>
            {renderHighlightedText(finalNeededText)}
          </Text>
        </View>
      </View>

      {/* Progress track */}
      <View style={styles.trackWrap}>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              {
                width: `${clampedPct}%`,
                backgroundColor: accentColor,
              },
            ]}
          />
          <View style={styles.midMarker} />
        </View>
        <View style={styles.trackLabels}>
          <Text style={styles.trackLabel}>0%</Text>
          <Text style={styles.trackLabel}>50%</Text>
          <Text style={styles.trackLabel}>100%</Text>
        </View>
      </View>
    </View>
  );

};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  labelGroup: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 16,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  percentBlock: {
    alignItems: 'center',
    minWidth: 72,
  },
  percentValue: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1.5,
    lineHeight: 40,
  },
  percentSign: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0,
  },
  percentLabel: {
    marginTop: 2,
    fontSize: 11,
    color: theme.colors.text.secondary,
    fontWeight: '600',
    textTransform: 'lowercase',
    textAlign: 'center',
  },
  neededBlock: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    padding: 14,
    gap: 6,
  },
  neededHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  neededIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  neededTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  neededValue: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.1,
    lineHeight: 22,
    textAlign: 'justify',
  },
  trackWrap: {
    gap: 6,
  },
  track: {
    height: 10,
    borderRadius: 99,
    backgroundColor: theme.colors.inputBackground,
    overflow: 'visible',
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: 99,
  },
  midMarker: {
    position: 'absolute',
    left: '50%',
    top: -2,
    width: 2,
    height: 14,
    borderRadius: 1,
    backgroundColor: theme.colors.border,
  },
  trackLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trackLabel: {
    fontSize: 10,
    color: theme.colors.text.secondary,
    fontWeight: '600',
  },
});
