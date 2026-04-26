import React, { useState } from 'react';
import { View, Text, ScrollView, Dimensions, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LineChart } from 'react-native-chart-kit';
import { globalStyles } from '../../src/styles/globalStyles';
import { theme } from '../../src/styles/theme';
import { gradesStyles as styles } from '../../src/styles/Grades.styles';

const GRADE_COLORS = (pct: number) => {
  if (pct >= 80) return '#34C759';
  if (pct >= 65) return '#FF9500';
  return '#FF2D55';
};

export default function GradesScreen() {
  const { t } = useTranslation();
  const chartWidth = Math.max(240, Dimensions.get('window').width - theme.spacing.xl * 2 - theme.spacing.lg * 2 - 2);

  const ASSESSMENTS = [
    {
      id: 'a1', icon: 'help-circle', iconColor: '#FF9500',
      name: t('grades.sample.a1Name'), subject: t('grades.sample.a1Subject'), type: t('grades.sample.a1Type'),
      date: t('grades.sample.a1Date'), weight: '10%', outOf: 30, score: 23,
    },
    {
      id: 'a2', icon: 'pencil', iconColor: '#5856D6',
      name: t('grades.sample.a2Name'), subject: t('grades.sample.a2Subject'), type: t('grades.sample.a2Type'),
      date: t('grades.sample.a2Date'), weight: '20%', outOf: 100, score: 88,
    },
    {
      id: 'a3', icon: 'flask', iconColor: '#34C759',
      name: t('grades.sample.a3Name'), subject: t('grades.sample.a3Subject'), type: t('grades.sample.a3Type'),
      date: t('grades.sample.a3Date'), weight: '15%', outOf: 50, score: 41,
    },
  ];

  const [simScore, setSimScore] = useState('');
  const [simPossible, setSimPossible] = useState('');
  const [projectedGpa, setProjectedGpa] = useState<string | null>(null);

  const handleRunSimulation = () => {
    const s = parseFloat(simScore);
    const p = parseFloat(simPossible);
    if (isNaN(s) || isNaN(p) || p === 0) {
      Alert.alert(t('common.error'), t('common.enterValidScorePossible'));
      return;
    }

    const addedPct = (s / p) * 100;
    const newGpa = ((3.78 * 3 + (addedPct / 25)) / 4).toFixed(2);
    setProjectedGpa(newGpa);
  };

  const handleResetSim = () => {
    setSimScore('');
    setSimPossible('');
    setProjectedGpa(null);
  };

  const trendSeries = [
    2.92,
    3.08,
    3.01,
    3.17,
    3.24,
    3.15,
    3.27,
    projectedGpa ? Number(projectedGpa) : 3.3,
  ];

  const comparisonSeries = [
    2.96,
    3.02,
    3.12,
    3.2,
    3.16,
    3.23,
    3.21,
    3.29,
  ];

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <View style={styles.header}>
        <View style={globalStyles.row}>
          <Ionicons name="school" size={20} color={theme.colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.logoText}>Threshold</Text>
        </View>
        <TouchableOpacity style={styles.termPill}>
          <Text style={styles.termText}>{t('grades.activeTerm')}</Text>
          <Ionicons name="chevron-down" size={14} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <View style={globalStyles.row}>
          <TouchableOpacity style={{ marginLeft: 10 }}>
            <Ionicons name="download-outline" size={22} color={theme.colors.text.secondary} />
          </TouchableOpacity>
          <TouchableOpacity style={{ marginLeft: 10 }}>
            <Ionicons name="cloud-upload-outline" size={22} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <View style={styles.filterRow}>
          <TouchableOpacity style={[styles.filterPill, { flex: 1 }]}>
            <Text style={styles.filterText} numberOfLines={1}>{t('grades.filterSubject')}</Text>
            <Ionicons name="chevron-down" size={12} color={theme.colors.text.secondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterPill, { flex: 1 }]}>
            <Text style={styles.filterText} numberOfLines={1}>{t('grades.filterAssessment')}</Text>
            <Ionicons name="chevron-down" size={12} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>
        <View style={styles.filterRow}>
          <TouchableOpacity style={[styles.filterPill, { flex: 1 }]}>
            <Text style={styles.filterText}>{t('grades.dateRange')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.applyBtn}>
            <Text style={styles.applyBtnText}>{t('grades.apply')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <View style={styles.gpaRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.gpaLabel}>{t('grades.termGpa')}</Text>
              <Text style={styles.gpaValue}>3.78</Text>
            </View>
            <View style={styles.divider} />
            <View style={{ flex: 1, paddingLeft: 16 }}>
              <Text style={styles.gpaLabel}>{t('grades.cumulative')}</Text>
              <Text style={styles.gpaValue}>3.65</Text>
            </View>
            <View style={styles.miniSparkline}>
              {[40, 60, 45, 75, 65, 85].map((h, i) => (
                <View
                  key={i}
                  style={[
                    styles.miniBar,
                    { height: h * 0.35, backgroundColor: theme.colors.primary + (i === 5 ? 'ff' : '66') },
                  ]}
                />
              ))}
            </View>
          </View>
          <Text style={styles.scaleText}>{t('grades.gradingScale')}</Text>
          <View style={styles.projectedRow}>
            <Text style={styles.projectedText}>{t('grades.projected')} </Text>
            <Text style={[styles.projectedText, { fontWeight: '800', color: '#34C759' }]}>3.84</Text>
          </View>
          <TouchableOpacity>
            <Text style={styles.editScaleText}>⚙ {t('grades.editScale')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('grades.assessments')}</Text>
            <View style={globalStyles.row}>
              <TouchableOpacity style={styles.addBtn}>
                <Text style={styles.addBtnText}>{t('grades.add')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.addBtn, styles.bulkBtn]}>
                <Text style={[styles.addBtnText, { color: theme.colors.text.primary }]}>{t('grades.bulk')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {ASSESSMENTS.map((a) => {
            const pct = Math.round((a.score / a.outOf) * 100);
            return (
              <View key={a.id} style={styles.assessCard}>
                <View style={styles.assessTop}>
                  <View style={[styles.assessIconBox, { backgroundColor: a.iconColor + '20' }]}>
                    <MaterialCommunityIcons name={a.icon as any} size={22} color={a.iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.assessName}>{a.name}</Text>
                    <View style={styles.tagsRow}>
                      <View style={[styles.tag, { backgroundColor: a.iconColor + '20' }]}>
                        <Text style={[styles.tagText, { color: a.iconColor }]}>{a.subject}</Text>
                      </View>
                      <View style={[styles.tag, { backgroundColor: theme.colors.inputBackground }]}>
                        <Text style={styles.tagText}>{a.type}</Text>
                      </View>
                      <Text style={styles.dateText}>{a.date}</Text>
                    </View>
                    <Text style={styles.weightText}>
                      {t('grades.weight')} {a.weight} · {t('grades.outOf')} {a.outOf} {t('grades.pts')}
                    </Text>
                  </View>
                  <View style={styles.scoreBadge}>
                    <Text style={[styles.scoreText, { color: GRADE_COLORS(pct) }]}>
                      {a.score} / {a.outOf}
                    </Text>
                    <Text style={[styles.scorePct, { color: GRADE_COLORS(pct) }]}>{pct}%</Text>
                  </View>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: GRADE_COLORS(pct) }]} />
                </View>
                <View style={styles.assessActions}>
                  <TouchableOpacity style={styles.actionPill}>
                    <Text style={styles.actionPillText}>{t('grades.edit')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionPill}>
                    <Text style={styles.actionPillText}>{t('grades.duplicate')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionPill, styles.deleteBtn]}>
                    <Text style={[styles.actionPillText, { color: '#FF2D55' }]}>{t('grades.delete')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.fabAdd}>
                    <Ionicons name="add" size={20} color={theme.colors.white} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.card}>
          <View style={styles.projectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('grades.projectionsSim')}</Text>
          </View>
          <Text style={styles.descText}>{t('grades.projectionsDesc')}</Text>

          <View style={styles.simInputRow}>
            <View style={styles.simInputWrapper}>
              <Text style={styles.simInputLabel}>{t('grades.scoreLabel')}</Text>
              <TextInput
                style={styles.simInput}
                placeholder="0"
                placeholderTextColor={theme.colors.text.placeholder}
                keyboardType="numeric"
                value={simScore}
                onChangeText={setSimScore}
              />
            </View>
            <View style={styles.simInputWrapper}>
              <Text style={styles.simInputLabel}>{t('grades.possibleLabel')}</Text>
              <TextInput
                style={styles.simInput}
                placeholder="0"
                placeholderTextColor={theme.colors.text.placeholder}
                keyboardType="numeric"
                value={simPossible}
                onChangeText={setSimPossible}
              />
            </View>
            <TouchableOpacity style={styles.simAddBtn} onPress={handleRunSimulation}>
              <Ionicons name="add" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.simChartCard}>
            <LineChart
              data={{
                labels: trendSeries.map(() => ''),
                datasets: [
                  {
                    data: comparisonSeries,
                    color: () => '#9A9A9A',
                    strokeWidth: 1.8,
                  },
                  {
                    data: trendSeries,
                    color: () => theme.colors.text.primary,
                    strokeWidth: 2.8,
                  },
                ],
              }}
              width={chartWidth}
              height={140}
              withDots={false}
              withShadow={false}
              withVerticalLabels={false}
              withHorizontalLabels={false}
              withInnerLines={false}
              withOuterLines={false}
              bezier={false}
              fromZero={false}
              chartConfig={{
                backgroundColor: theme.colors.inputBackground,
                backgroundGradientFrom: theme.colors.inputBackground,
                backgroundGradientTo: theme.colors.inputBackground,
                decimalPlaces: 2,
                color: () => theme.colors.text.primary,
                labelColor: () => theme.colors.text.secondary,
                propsForBackgroundLines: {
                  strokeWidth: 0,
                },
                propsForLabels: {
                  fontSize: 0,
                },
              }}
              style={styles.simChart}
            />
          </View>

          <View style={styles.currentProjectionCentered}>
            <Text style={styles.currentProjectionLine} numberOfLines={1}>
              <Text style={styles.currentProjectionLabel}>{t('grades.currentProjection')} </Text>
              <Text style={styles.currentProjectionValue}>3.63</Text>
            </Text>
          </View>

          {projectedGpa && (
            <View style={styles.simSummary}>
              <Text style={styles.simSummaryText}>{t('grades.simSummary')}</Text>
              <Text style={styles.projGpaText}>
                {t('grades.projectedTermGpa')} <Text style={{ color: '#34C759', fontWeight: '900' }}>{projectedGpa}</Text>
              </Text>
            </View>
          )}

          <View style={styles.simActions}>
            <TouchableOpacity style={styles.simActionPrimary} onPress={handleRunSimulation}>
              <Text style={styles.simActionPrimaryText}>{t('grades.run')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.simActionSecondary} onPress={handleResetSim}>
              <Text style={styles.simActionSecondaryText}>{t('grades.reset')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.card, styles.bulkCard]}>
          <View style={styles.bulkCardInner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>{t('grades.bulkImport')}</Text>
              <Text style={styles.descText}>{t('grades.bulkImportDesc')}</Text>
              <TouchableOpacity>
                <Text style={styles.chooseFileText}>{t('grades.chooseFile')}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.importBtn}>
              <Ionicons name="cloud-upload" size={18} color="#fff" />
              <Text style={styles.importBtnText}>{t('grades.importCsv')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.card, styles.bulkCard]}>
          <View style={styles.bulkCardInner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>{t('grades.gpaReport')}</Text>
              <Text style={styles.descText}>{t('grades.gpaReportDesc')}</Text>
              <TouchableOpacity>
                <Text style={styles.chooseFileText}>{t('grades.preview')}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.importBtn, { backgroundColor: '#FF9500' }]}>
              <Ionicons name="print-outline" size={18} color="#fff" />
              <Text style={styles.importBtnText}>{t('grades.exportPrint')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


