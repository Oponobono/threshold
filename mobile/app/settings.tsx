import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Image, TextInput, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { globalStyles } from '../src/styles/globalStyles';
import { theme } from '../src/styles/theme';
import { settingsStyles as styles } from '../src/styles/Settings.styles';
import { getCurrentUserProfile, signOut, type UserProfile } from '../src/services/api';

// ─── Types ─────────────────────────────────────────────────────
type ScaleKey = 'af' | 'pct' | 'scale4' | 'custom';

// ─── Sub-Components ────────────────────────────────────────────
const SectionHeader = ({ title, desc, icon, onIconPress, iconColor, iconSize }: { title: string; desc: string; icon: string; onIconPress?: () => void; iconColor?: string; iconSize?: number }) => (
  <View style={styles.sectionHeader}>
    <View style={{ flex: 1 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionDesc}>{desc}</Text>
    </View>
    {onIconPress ? (
      <TouchableOpacity onPress={onIconPress} style={{ padding: 4 }}>
        <Ionicons name={icon as any} size={iconSize || 18} color={iconColor || theme.colors.text.secondary} />
      </TouchableOpacity>
    ) : (
      <Ionicons name={icon as any} size={iconSize || 18} color={iconColor || theme.colors.text.secondary} />
    )}
  </View>
);

const SettingRow = ({ title, desc, right }: { title: string; desc?: string; right: React.ReactNode }) => (
  <View style={styles.settingRow}>
    <View style={{ flex: 1, paddingRight: 12 }}>
      <Text style={styles.settingTitle}>{title}</Text>
      {desc ? <Text style={styles.settingDesc}>{desc}</Text> : null}
    </View>
    {right}
  </View>
);

// ─── Main Screen ───────────────────────────────────────────────
export default function SettingsScreen() {
  const { t } = useTranslation();

  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const handleSignOut = () => {
    const onConfirm = async () => {
      console.log('[Auth] Iniciando cierre de sesión...');
      await signOut();
      // Usamos /login de forma explícita para evitar colisiones con (tabs)/index
      router.replace('/login'); 
    };

    if (Platform.OS === 'web') {
      if (confirm(t('settings.signOutDesc'))) {
        onConfirm();
      }
    } else {
      Alert.alert(
        t('settings.signOut'),
        t('settings.signOutDesc'),
        [
          { text: t('settings.cancel'), style: 'cancel' },
          { text: t('settings.signOutBtn'), style: 'destructive', onPress: onConfirm },
        ]
      );
    }
  };

  const [threshold, setThreshold] = useState('50');
  const [activeScale, setActiveScale] = useState<ScaleKey>('af');
  const [notifDeadline, setNotifDeadline] = useState(false);
  const [notifWeekly, setNotifWeekly] = useState(false);
  const [notifEmail, setNotifEmail] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [calendarSync, setCalendarSync] = useState(false);

  const TERMS = t('settings.termOptions', { returnObjects: true }) as string[];
  const [activeTermIndex, setActiveTermIndex] = useState(0);

  const SCALES: { key: ScaleKey; label: string; desc: string }[] = [
    { key: 'af', label: t('settings.scaleAF'), desc: t('settings.scaleAFDesc') },
    { key: 'pct', label: t('settings.scalePct'), desc: t('settings.scalePctDesc') },
    { key: 'scale4', label: t('settings.scale4'), desc: t('settings.scale4Desc') },
    { key: 'custom', label: t('settings.scaleCustom'), desc: t('settings.scaleCustomDesc') },
  ];

  const LMS_ACCOUNTS = t('settings.lmsAccounts', { returnObjects: true }) as Array<{ name: string; user: string }>;

  useEffect(() => {
    const loadProfile = async () => {
      const userProfile = await getCurrentUserProfile();
      setProfile(userProfile);

      if (userProfile?.approval_threshold !== null && userProfile?.approval_threshold !== undefined) {
        setThreshold(String(userProfile.approval_threshold));
      }

      const scaleMap: Record<string, ScaleKey> = {
        '0-5.0': 'af',
        '0-10': 'scale4',
        '0-100': 'pct',
      };

      if (userProfile?.grading_scale) {
        setActiveScale(scaleMap[userProfile.grading_scale] || 'custom');
      }
    };

    loadProfile();
  }, []);

  const fullName = useMemo(() => {
    const first = profile?.name?.trim() || '';
    const last = profile?.lastname?.trim() || '';
    return `${first} ${last}`.trim();
  }, [profile]);

  const profileName = fullName || profile?.username || t('settings.profileName');
  const profileEmail = profile?.email || t('settings.profileEmail');
  const profileAvatarUri = `https://ui-avatars.com/api/?name=${encodeURIComponent(profileName)}&background=EDEEF2&color=111111&bold=true`;

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View style={globalStyles.row}>
          <Ionicons name="school" size={20} color={theme.colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.logoText}>Threshold</Text>
        </View>
        <View style={globalStyles.row}>
          <TouchableOpacity style={styles.cancelBtn}>
            <Text style={styles.cancelText}>{t('settings.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>{t('settings.save')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── PROFILE CARD ── */}
        <View style={styles.profileCard}>
          <Image
            source={{ uri: profileAvatarUri }}
            style={styles.profileAvatar}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{profileName}</Text>
            <Text style={styles.profileEmail}>{profileEmail}</Text>
            {!!profile?.university && <Text style={styles.profileEmail}>{profile.university}</Text>}
          </View>
          <View style={{ gap: 6, alignItems: 'flex-end' }}>
            <TouchableOpacity style={styles.editBtn}>
              <Text style={styles.editBtnText}>{t('settings.edit')}</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={styles.changePwText}>{t('settings.changePass')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─────────────────────────────────────────── */}
        {/* ── ACADEMIC PREFERENCES ── */}
        {/* ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader title={t('settings.academicPrefs')} desc={t('settings.academicPrefsDesc')} icon="settings-outline" />

          {/* Terms / Semesters */}
          <Text style={styles.subSectionTitle}>{t('settings.termsSemesters')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.termsRow}>
            {TERMS.map((term, index) => (
              <TouchableOpacity
                key={term}
                style={[styles.termChip, activeTermIndex === index && styles.termChipActive]}
                onPress={() => setActiveTermIndex(index)}
              >
                <Text style={[styles.termChipText, activeTermIndex === index && styles.termChipTextActive]}>{term}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.actionRow}>
            <View style={styles.actionRowTextWrap}>
              <Text style={styles.settingDesc}>{t('settings.manageTerms')}</Text>
            </View>
            <View style={styles.actionRowButtonWrap}>
              <TouchableOpacity style={styles.darkPill}>
                <Text style={styles.darkPillText}>{t('settings.addTerm')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Min Grade */}
          <Text style={styles.subSectionTitle}>{t('settings.minGrade')}</Text>
          <View style={styles.thresholdRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingDesc}>{t('settings.defaultThreshold')}</Text>
              <TextInput
                style={styles.thresholdInput}
                value={threshold}
                onChangeText={setThreshold}
                keyboardType="numeric"
                maxLength={3}
              />
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Text style={styles.settingDesc}>{t('settings.perSubject')}</Text>
              <TouchableOpacity style={styles.outlinePill}>
                <Text style={styles.outlinePillText}>{t('settings.manageOverrides')}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={[styles.actionRow, { marginTop: 8 }]}>
            <View style={styles.actionRowTextWrap}>
              <Text style={styles.settingDesc}>{t('settings.resetThreshold')}</Text>
            </View>
            <View style={styles.actionRowButtonWrap}>
              <TouchableOpacity style={styles.darkPill} onPress={() => setThreshold('50')}>
                <Text style={styles.darkPillText}>{t('settings.resetTo50')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Grading Scales */}
          <Text style={styles.subSectionTitle}>{t('settings.gradingScales')}</Text>
          {SCALES.map(scale => (
            <View key={scale.key} style={styles.scaleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingTitle}>{scale.label}</Text>
                <Text style={styles.settingDesc}>{scale.desc}</Text>
              </View>
              {activeScale === scale.key ? (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>{t('settings.active')}</Text>
                </View>
              ) : (
                <TouchableOpacity onPress={() => setActiveScale(scale.key)}>
                  <Text style={styles.selectText}>{t('settings.select')}</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity style={[styles.darkPill, { alignSelf: 'center', marginTop: 8 }]}>
            <Text style={styles.darkPillText}>{t('settings.addCustomScale')}</Text>
          </TouchableOpacity>
        </View>

        {/* ─────────────────────────────────────────── */}
        {/* ── NOTIFICATIONS ── */}
        {/* ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader title={t('settings.notifications')} desc={t('settings.notifDesc')} icon="notifications-outline" />
          <SettingRow
            title={t('settings.deadlineAlerts')} desc={t('settings.deadlineAlertsDesc')}
            right={<Switch value={notifDeadline} onValueChange={setNotifDeadline} trackColor={{ false: theme.colors.border, true: theme.colors.primary }} thumbColor={theme.colors.white} />}
          />
          <SettingRow
            title={t('settings.weeklyDigest')} desc={t('settings.weeklyDigestDesc')}
            right={<Switch value={notifWeekly} onValueChange={setNotifWeekly} trackColor={{ false: theme.colors.border, true: theme.colors.primary }} thumbColor={theme.colors.white} />}
          />
          <SettingRow
            title={t('settings.emailNotif')} desc={t('settings.emailNotifDesc')}
            right={<Switch value={notifEmail} onValueChange={setNotifEmail} trackColor={{ false: theme.colors.border, true: theme.colors.primary }} thumbColor={theme.colors.white} />}
          />
        </View>

        {/* ─────────────────────────────────────────── */}
        {/* ── BACKUP & SYNC ── */}
        {/* ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader title={t('settings.backupSync')} desc={t('settings.backupSyncDesc')} icon="cloud-outline" />
          <Text style={styles.settingTitle}>{t('settings.cloudAccount')}</Text>
          <Text style={[styles.settingDesc, { color: theme.colors.primary }]}>
            {t('settings.connectedTo')} ({t('settings.backupEmail')})
          </Text>
          <View style={[styles.actionRow, { marginTop: 8 }]}>
            <View style={styles.actionRowTextWrap}>
              <Text style={styles.settingDesc}>{t('settings.lastBackup')}  {t('settings.lastBackupSample')}</Text>
            </View>
            <View style={styles.actionRowButtonWrap}>
              <TouchableOpacity style={styles.darkPill}>
                <Ionicons name="sync-outline" size={14} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.darkPillText}>{t('settings.syncNow')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ─────────────────────────────────────────── */}
        {/* ── SECURITY & ACCOUNT ── */}
        {/* ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader title={t('settings.security')} desc={t('settings.securityDesc')} icon="shield-outline" />
          <SettingRow
            title={t('settings.biometric')} desc={t('settings.biometricDesc')}
            right={<Switch value={biometric} onValueChange={setBiometric} trackColor={{ false: theme.colors.border, true: theme.colors.primary }} thumbColor={theme.colors.white} />}
          />
          <SettingRow
            title={t('settings.twoFactor')} desc={t('settings.twoFactorDesc')}
            right={<TouchableOpacity style={styles.outlinePill}><Text style={styles.outlinePillText}>{t('settings.manage')}</Text></TouchableOpacity>}
          />
          <SettingRow
            title={t('settings.signOut')} desc={t('settings.signOutDesc')}
            right={
              <TouchableOpacity style={styles.outlinePill} onPress={handleSignOut}>
                <Text style={styles.outlinePillText}>{t('settings.signOutBtn')}</Text>
              </TouchableOpacity>
            }
          />
          <SettingRow
            title={t('settings.deleteAccount')} desc=""
            right={
              <TouchableOpacity
                style={[styles.darkPill, { backgroundColor: '#FF2D55' }]}
                onPress={() => Alert.alert(t('settings.deleteAccount'), t('settings.resetDesc'))}
              >
                <Text style={styles.darkPillText}>{t('settings.deleteBtn')}</Text>
              </TouchableOpacity>
            }
          />
        </View>

        {/* ─────────────────────────────────────────── */}
        {/* ── INTEGRATIONS ── */}
        {/* ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader title={t('settings.integrations')} desc={t('settings.integrationsDesc')} icon="extension-puzzle-outline" />
          <SettingRow
            title={t('settings.calendarSync')} desc={t('settings.calendarSyncDesc')}
            right={<Switch value={calendarSync} onValueChange={setCalendarSync} trackColor={{ false: theme.colors.border, true: theme.colors.primary }} thumbColor={theme.colors.white} />}
          />
          <Text style={styles.subSectionTitle}>{t('settings.linkedLms')}</Text>
          {LMS_ACCOUNTS.map((lms, i) => (
            <View key={i} style={styles.lmsRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingTitle}>{lms.name}</Text>
                <Text style={styles.settingDesc}>{t('settings.connectedAs', { user: lms.user })}</Text>
              </View>
              <TouchableOpacity style={styles.outlinePill}>
                <Text style={styles.outlinePillText}>{t('settings.remove')}</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={[styles.darkPill, { alignSelf: 'flex-end', marginTop: 8 }]}>
            <Text style={styles.darkPillText}>{t('settings.addLms')}</Text>
          </TouchableOpacity>
        </View>

        {/* ─────────────────────────────────────────── */}
        {/* ── DATA EXPORT & RESET ── */}
        {/* ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader title={t('settings.dataExport')} desc={t('settings.dataExportDesc')} icon="document-text-outline" />
          <View style={styles.exportRow}>
            <TouchableOpacity style={[styles.exportBtn, { flex: 1 }]}>
              <Text style={styles.exportBtnText}>{t('settings.exportCsv')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.exportBtn, styles.exportBtnOutline, { flex: 1 }]}>
              <Text style={styles.exportBtnOutlineText}>{t('settings.exportPdf')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.subSectionTitle}>{t('settings.resetOptions')}</Text>
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>{t('settings.resetAll')}</Text>
              <Text style={styles.settingDesc}>{t('settings.resetDesc')}</Text>
            </View>
            <TouchableOpacity
              style={[styles.darkPill, { backgroundColor: '#FF2D55', marginLeft: 12 }]}
              onPress={() => Alert.alert(t('settings.resetAll'), t('settings.resetDesc'))}
            >
              <Text style={styles.darkPillText}>{t('settings.reset')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─────────────────────────────────────────── */}
        {/* ── ABOUT & HELP ── */}
        {/* ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader 
            title={t('settings.aboutHelp')} 
            desc={t('settings.aboutHelpDesc')} 
            icon="information-circle-outline" 
            onIconPress={() => router.push('/about')}
            iconColor="#C5A059"
            iconSize={26}
          />
          <SettingRow
            title={t('settings.faq')} desc=""
            right={<TouchableOpacity><Text style={styles.openText}>{t('settings.open')}</Text></TouchableOpacity>}
          />
          <SettingRow
            title={t('settings.sendFeedback')} desc=""
            right={<TouchableOpacity style={styles.darkPill}><Text style={styles.darkPillText}>{t('settings.send')}</Text></TouchableOpacity>}
          />
          <View style={[styles.settingRow, { marginTop: 4 }]}>
            <Text style={styles.settingDesc}>{t('settings.appVersion')}</Text>
            <Text style={styles.versionText}>{t('settings.version')}</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}


