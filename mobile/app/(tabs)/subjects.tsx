import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { alertRef } from '../../src/components/CustomAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { globalStyles } from '../../src/styles/globalStyles';
import { theme } from '../../src/styles/theme';
import { subjectsStyles as styles } from '../../src/styles/Subjects.styles';

// ─── Helpers ───────────────────────────────────────────────────
const getAvgColor = (avg: number) => {
  if (avg >= 80) return '#34C759';
  if (avg >= 65) return '#FF9500';
  return '#FF2D55';
};

const getStatusColor = (minNeeded: number) => {
  if (minNeeded > 90) return '#FF2D55';
  if (minNeeded > 75) return '#FF9500';
  return '#34C759';
};

const getStatus = (minNeeded: number, t: any) => {
  if (minNeeded > 90) return t('subjects.statusAtRisk');
  if (minNeeded > 75) return t('subjects.statusBorderline');
  return t('subjects.statusSafe');
};

// ─── Main Screen ───────────────────────────────────────────────
export default function SubjectsScreen() {
  const { t } = useTranslation();

  const SUBJECTS = [
    {
      id: '1', code: 'CS', name: t('subjects.sample.csName'), credits: 3,
      professor: t('subjects.sample.csProf'), avg: 78, color: '#5856D6',
      nextLabel: t('subjects.sample.csNext'),
    },
    {
      id: '2', code: 'MA', name: t('subjects.sample.maName'), credits: 4,
      professor: t('subjects.sample.maProf'), avg: 85, color: '#34C759',
      nextLabel: t('subjects.sample.maNext'),
    },
    {
      id: '3', code: 'EN', name: t('subjects.sample.enName'), credits: 2,
      professor: t('subjects.sample.enProf'), avg: 62, color: '#FF9500',
      nextLabel: t('subjects.sample.enNext'),
    },
  ];

  const ASSESSMENTS = [
    { id: 'a1', icon: 'clipboard-text', color: '#5856D6', name: t('subjects.sample.assess1Name'), due: t('subjects.sample.assess1Due'), weight: '10%', score: '82%' },
    { id: 'a2', icon: 'help-circle', color: '#FF9500', name: t('subjects.sample.assess2Name'), due: t('subjects.sample.assess2Due'), weight: '5%', score: '70%' },
    { id: 'a3', icon: 'school', color: '#34C759', name: t('subjects.sample.assess3Name'), due: t('subjects.sample.assess3Due'), weight: '25%', score: '—' },
  ];

  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState(SUBJECTS[0]);

  // Calculator state
  const [currentGrade, setCurrentGrade] = useState('78');
  const [requiredPass, setRequiredPass] = useState('60');
  const [remainingWeight, setRemainingWeight] = useState('40');
  const [minNeeded, setMinNeeded] = useState<number | null>(44);

  const handleSimulate = () => {
    const cg = parseFloat(currentGrade);
    const rp = parseFloat(requiredPass);
    const rw = parseFloat(remainingWeight);
    if (isNaN(cg) || isNaN(rp) || isNaN(rw) || rw === 0) {
      alertRef.show({ title: t('common.error'), message: t('common.enterValidNumbers'), type: 'error' });
      return;
    }
    // Formula: minNeeded = (requiredPass - currentGrade * (1 - remainingWeight/100)) / (remainingWeight/100)
    const doneWeight = 100 - rw;
    const result = (rp - (cg * doneWeight) / 100) / (rw / 100);
    setMinNeeded(Math.round(result * 100) / 100);
  };

  const handleReset = () => {
    setCurrentGrade('');
    setRequiredPass('');
    setRemainingWeight('');
    setMinNeeded(null);
  };

  const filtered = SUBJECTS.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase()) ||
    s.professor.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View style={globalStyles.row}>
          <Ionicons name="school" size={22} color={theme.colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.headerTitle}>Threshold</Text>
        </View>
        <TouchableOpacity style={styles.addBtn}>
          <Ionicons name="add" size={24} color={theme.colors.white} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Feather name="search" size={16} color={theme.colors.text.placeholder} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('subjects.searchPlaceholder')}
            placeholderTextColor={theme.colors.text.placeholder}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={styles.filterBtn}>
          <Feather name="filter" size={18} color={theme.colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── ENROLLED SUBJECTS ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('subjects.enrolledSubjects')}</Text>
            <Text style={styles.sectionHint}>{t('subjects.tapToView')}</Text>
          </View>

          {filtered.map(subject => (
            <TouchableOpacity
              key={subject.id}
              activeOpacity={0.85}
              onPress={() => setSelectedSubject(subject)}
              style={[styles.subjectCard, selectedSubject.id === subject.id && styles.subjectCardSelected]}
            >
              <View style={styles.subjectTop}>
                {/* Colored abbreviation circle */}
                <View style={[styles.codeCircle, { backgroundColor: subject.color }]}>
                  <Text style={styles.codeText}>{subject.code}</Text>
                </View>

                {/* Name & professor */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.subjectName}>{subject.name}</Text>
                  <Text style={styles.subjectProf}>{subject.professor}</Text>
                </View>

                {/* Credits & average */}
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.creditsText}>{subject.credits} {t('subjects.credits')}</Text>
                  <Text style={[styles.avgText, { color: getAvgColor(subject.avg) }]}>
                    {t('subjects.avg')} {subject.avg}%
                  </Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${subject.avg}%`, backgroundColor: getAvgColor(subject.avg) }]} />
              </View>

              {/* Bottom row */}
              <View style={styles.subjectBottom}>
                <TouchableOpacity style={styles.assessmentBtn}>
                  <Ionicons name="add" size={14} color={theme.colors.white} />
                  <Text style={styles.assessmentBtnText}>{t('subjects.assessment')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconAction}>
                  <Ionicons name="notifications-outline" size={18} color={theme.colors.text.secondary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconAction}>
                  <Ionicons name="camera-outline" size={18} color={theme.colors.text.secondary} />
                </TouchableOpacity>
                <Text style={styles.nextLabel}>{subject.nextLabel}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── CALCULATOR: MINIMUM GRADE TO PASS ── */}
        <View style={styles.calcCard}>
          <View style={styles.calcHeaderRow}>
            <Text style={styles.calcTitle}>{t('subjects.minGradeTitle')}</Text>
            <Text style={styles.calcSubject}>{selectedSubject.name}</Text>
          </View>

          {/* Three number inputs */}
          <View style={styles.calcInputsRow}>
            {[
              { label: t('subjects.currentGrade'), value: currentGrade, setter: setCurrentGrade },
              { label: t('subjects.requiredPass'), value: requiredPass, setter: setRequiredPass },
              { label: t('subjects.remainingWeight'), value: remainingWeight, setter: setRemainingWeight },
            ].map((field, i) => (
              <View key={i} style={styles.calcInputBox}>
                <Text style={styles.calcInputLabel}>{field.label}</Text>
                <TextInput
                  style={styles.calcInput}
                  keyboardType="numeric"
                  value={field.value}
                  onChangeText={field.setter}
                  maxLength={5}
                />
              </View>
            ))}
          </View>

          <Text style={styles.calcHint}>{t('subjects.minAvgNeeded')}</Text>

          {/* Result */}
          {minNeeded !== null && (
            <>
              <Text style={[styles.calcResult, { color: getStatusColor(minNeeded) }]}>
                {minNeeded}%
              </Text>
              <Text style={[styles.calcStatus, { color: getStatusColor(minNeeded) }]}>
                {getStatus(minNeeded, t)}
              </Text>

              {/* Status bar */}
              <View style={styles.statusBar}>
                <View style={[styles.statusSegment, { backgroundColor: '#FF2D55', borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }]} />
                <View style={[styles.statusSegment, { backgroundColor: '#FF9500' }]} />
                <View style={[styles.statusSegment, { backgroundColor: '#34C759', borderTopRightRadius: 4, borderBottomRightRadius: 4 }]} />
              </View>
              <View style={styles.statusLegend}>
                <Text style={[styles.legendText, { color: '#FF2D55' }]}>● {t('subjects.failRisk')}</Text>
                <Text style={[styles.legendText, { color: '#FF9500' }]}>● {t('subjects.borderline')}</Text>
                <Text style={[styles.legendText, { color: '#34C759' }]}>● {t('subjects.safe')}</Text>
              </View>
            </>
          )}

          {/* Action buttons */}
          <View style={styles.calcActions}>
            <TouchableOpacity style={styles.calcBtn} onPress={handleSimulate}>
              <Text style={styles.calcBtnText}>{t('subjects.simulate')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.calcBtn, styles.calcBtnSecondary]} onPress={handleSimulate}>
              <Text style={styles.calcBtnSecText}>{t('subjects.saveThreshold')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.calcBtnReset} onPress={handleReset}>
              <Text style={styles.calcBtnSecText}>{t('subjects.reset')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── ASSESSMENTS ── */}
        <View style={styles.assessCard}>
          <View style={styles.assessHeader}>
            <Text style={styles.assessTitle}>{selectedSubject.name} – {t('subjects.assessments')}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={styles.addAssessBtn}>
                <Ionicons name="add" size={14} color={theme.colors.white} />
                <Text style={styles.addAssessBtnText}>{t('subjects.add')}</Text>
              </TouchableOpacity>
              <TouchableOpacity>
                <Feather name="edit-2" size={18} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>
          </View>

          {ASSESSMENTS.map(a => (
            <View key={a.id} style={styles.assessRow}>
              <View style={[styles.assessIconBox, { backgroundColor: a.color + '20' }]}>
                <MaterialCommunityIcons name={a.icon as any} size={22} color={a.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.assessName}>{a.name}</Text>
                <Text style={styles.assessMeta}>
                  {t('subjects.dueDate')} {a.due} · {t('subjects.weight')} {a.weight}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.assessScore}>{t('subjects.score')} {a.score}</Text>
                <TouchableOpacity>
                  <Text style={[styles.editText]}>{t('subjects.edit')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Performance sparkline (visual placeholder) */}
          <View style={styles.sparklineContainer}>
            <Text style={styles.sparklineLabel}>{t('subjects.performanceTrend')}</Text>
            <View style={styles.sparkline}>
              {[30, 55, 40, 70, 60, 82].map((h, i) => (
                <View key={i} style={[styles.sparkBar, { height: h * 0.6, backgroundColor: theme.colors.primary + (i === 5 ? 'ff' : '55') }]} />
              ))}
            </View>
          </View>

          {/* Photo link row */}
          <View style={styles.photoRow}>
            <Ionicons name="camera-outline" size={18} color={theme.colors.text.secondary} />
            <Text style={styles.photoText}>{t('subjects.linkPhoto')}</Text>
            <TouchableOpacity style={styles.photoBtn}>
              <Ionicons name="camera" size={14} color={theme.colors.white} />
              <Text style={styles.photoBtnText}>{t('subjects.photo')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.photoBtn, { backgroundColor: theme.colors.inputBackground }]}>
              <Text style={[styles.photoBtnText, { color: theme.colors.text.primary }]}>{t('subjects.remind')}</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}