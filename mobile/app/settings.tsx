import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Image, TextInput, Alert, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { globalStyles } from '../src/styles/globalStyles';
import { theme } from '../src/styles/theme';
import { settingsStyles as styles } from '../src/styles/Settings.styles';
import { getCurrentUserProfile, signOut, type UserProfile, updateUserProfile, updateUserPassword, disableAccount, removeBiometricToken, enrollBiometric, requestAccountDeletion, getDeletionDataCount } from '../src/services/api';
import { enrollBiometricToken, revokeBiometricToken, hasBiometricTokenStored } from '../src/services/biometricService';
import { alertRef } from '../src/components/CustomAlert';

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
      alertRef.show({
        title: t('settings.signOut'),
        message: t('settings.signOutDesc'),
        type: 'confirm',
        buttons: [
          { text: t('settings.cancel'), style: 'cancel' },
          { text: t('settings.signOutBtn'), style: 'destructive', onPress: onConfirm },
        ]
      });
    }
  };

  const handleToggleBiometric = async (newValue: boolean) => {
    if (newValue) {
      if (!profile?.email) return;
      const token = await enrollBiometricToken(profile.email);
      if (token) {
        try {
          await enrollBiometric(profile.id?.toString() || '', token);
          setBiometric(true);
          alertRef.show({ title: t('common.success'), message: t('settings.biometricEnabled', 'Inicio biométrico activado'), type: 'success' });
        } catch (error: any) {
          await revokeBiometricToken();
          setBiometric(false);
          alertRef.show({ title: t('common.error'), message: error.message || t('settings.errors.biometricEnableFailed'), type: 'error' });
        }
      } else {
        setBiometric(false);
      }
    } else {
      alertRef.show({
        title: t('settings.disableBiometric', 'Desactivar biometría'),
        message: t('settings.disableBiometricDesc', '¿Estás seguro que deseas eliminar el inicio de sesión por huella?'),
        type: 'confirm',
        buttons: [
          { text: t('settings.cancel'), style: 'cancel', onPress: () => setBiometric(true) },
          { 
            text: t('settings.deleteBtn', 'Eliminar'), 
            style: 'destructive', 
            onPress: async () => {
              try {
                await removeBiometricToken();
                await revokeBiometricToken();
                setBiometric(false);
                alertRef.show({ title: t('common.success'), message: t('settings.biometricDisabled', 'Inicio biométrico desactivado'), type: 'success' });
              } catch (error: any) {
                setBiometric(true);
                alertRef.show({ title: t('common.error'), message: error.message || t('settings.errors.biometricDisableFailed'), type: 'error' });
              }
            } 
          },
        ]
      });
    }
  };

  const handleDeleteAccount = () => {
    alertRef.show({
      title: t('settings.deleteAccount'),
      message: t('settings.deleteAccountDesc'),
      type: 'confirm',
      buttons: [
        { text: t('settings.cancel'), style: 'cancel' },
        { 
          text: t('settings.deleteBtn'), 
          style: 'destructive', 
          onPress: () => setIsDeleteAccountVisible(true)
        },
      ]
    });
  };

  const [threshold, setThreshold] = useState('50');
  const [activeScale, setActiveScale] = useState<ScaleKey>('af');
  const [notifDeadline, setNotifDeadline] = useState(false);
  const [notifWeekly, setNotifWeekly] = useState(false);
  const [notifEmail, setNotifEmail] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [calendarSync, setCalendarSync] = useState(false);
  const [isDeleteAccountVisible, setIsDeleteAccountVisible] = useState(false);
  const [deleteStep, setDeleteStep] = useState<'confirm' | 'password' | 'data' | 'final'> ('confirm');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletionDataCount, setDeletionDataCount] = useState<any>(null);
  const [isLoadingDeletion, setIsLoadingDeletion] = useState(false);

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

      const hasBiometric = await hasBiometricTokenStored();
      setBiometric(hasBiometric);

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

  const [isEditProfileVisible, setIsEditProfileVisible] = useState(false);
  const [isChangePasswordVisible, setIsChangePasswordVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLastname, setEditLastname] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editUniversity, setEditUniversity] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleOpenEditProfile = () => {
    setEditName(profile?.name || '');
    setEditLastname(profile?.lastname || '');
    setEditUsername(profile?.username || '');
    setEditUniversity(profile?.university || '');
    setIsEditProfileVisible(true);
  };

  const handleSaveProfile = async () => {
    try {
      await updateUserProfile({
        name: editName,
        lastname: editLastname,
        username: editUsername,
        university: editUniversity,
      });
      setIsEditProfileVisible(false);
      alertRef.show({ title: t('common.success'), message: t('settings.profileUpdated', 'Perfil actualizado exitosamente'), type: 'success' });
      // Reload profile
      const userProfile = await getCurrentUserProfile();
      setProfile(userProfile);
    } catch (error: any) {
      alertRef.show({ title: t('common.error'), message: error.message || t('settings.errors.profileUpdateFailed'), type: 'error' });
    }
  };

  const handleSavePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alertRef.show({ title: t('common.error'), message: t('settings.fillAllFields', 'Llena todos los campos'), type: 'warning' });
      return;
    }
    if (newPassword !== confirmPassword) {
      alertRef.show({ title: t('common.error'), message: t('settings.passwordsDontMatch', 'Las contraseñas no coinciden'), type: 'warning' });
      return;
    }
    try {
      await updateUserPassword(currentPassword, newPassword);
      setIsChangePasswordVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      alertRef.show({ title: t('common.success'), message: t('settings.passwordUpdated', 'Contraseña actualizada exitosamente'), type: 'success' });
    } catch (error: any) {
      alertRef.show({ title: t('common.error'), message: error.message || t('settings.errors.passwordUpdateFailed'), type: 'error' });
    }
  };

  const handleDeletePasswordVerify = async () => {
    if (!deletePassword) {
      alertRef.show({ title: t('common.error'), message: t('common.errors.enterPassword'), type: 'warning' });
      return;
    }
    setIsLoadingDeletion(true);
    try {
      // Cargar datos que se perderán
      if (profile?.id) {
        const counts = await getDeletionDataCount(profile.id.toString());
        setDeletionDataCount(counts);
      }
      setDeleteStep('data');
    } catch (error: any) {
      alertRef.show({ title: t('common.error'), message: error.message, type: 'error' });
    } finally {
      setIsLoadingDeletion(false);
    }
  };

  const handleConfirmDeletion = async () => {
    const confirmText = profile?.username || 'ELIMINAR';
    if (deleteConfirmText !== confirmText && deleteConfirmText !== 'ELIMINAR') {
      alertRef.show({ 
        title: t('common.error'), 
        message: `Debes escribir exactamente "${confirmText}" o "ELIMINAR"`, 
        type: 'warning' 
      });
      return;
    }

    setIsLoadingDeletion(true);
    try {
      await requestAccountDeletion(deletePassword);
      
      setIsDeleteAccountVisible(false);
      setDeleteStep('confirm');
      setDeletePassword('');
      setDeleteConfirmText('');
      
      const deletionDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      alertRef.show({
        title: t('common.success'),
        message: `Tu solicitud de eliminación ha sido registrada. Tu cuenta será completamente eliminada el ${deletionDate.toLocaleDateString()} si no la recuperas.`,
        type: 'success'
      });
      
      // Cerrar sesión después de solicitar eliminación
      setTimeout(async () => {
        await signOut();
        router.replace('/login');
      }, 2000);
    } catch (error: any) {
      alertRef.show({ title: t('common.error'), message: error.message, type: 'error' });
    } finally {
      setIsLoadingDeletion(false);
    }
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteAccountVisible(false);
    setDeleteStep('confirm');
    setDeletePassword('');
    setDeleteConfirmText('');
    setDeletionDataCount(null);
  };

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
          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.replace('/(tabs)')}>
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
            <TouchableOpacity style={styles.editBtn} onPress={handleOpenEditProfile}>
              <Text style={styles.editBtnText}>{t('settings.edit')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsChangePasswordVisible(true)}>
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
            right={<Switch value={biometric} onValueChange={handleToggleBiometric} trackColor={{ false: theme.colors.border, true: theme.colors.primary }} thumbColor={theme.colors.white} />}
          />
          <SettingRow
            title={t('settings.twoFactor')} desc={t('settings.twoFactorDesc')}
            right={<TouchableOpacity style={[styles.actionButton, styles.outlinePill]}><Text style={styles.outlinePillText}>{t('settings.manage')}</Text></TouchableOpacity>}
          />
          <SettingRow
            title={t('settings.signOut')} desc={t('settings.signOutDesc')}
            right={
              <TouchableOpacity style={[styles.actionButton, styles.outlinePill]} onPress={handleSignOut}>
                <Text style={styles.outlinePillText}>{t('settings.signOutBtn')}</Text>
              </TouchableOpacity>
            }
          />
          <SettingRow
            title={t('settings.deleteAccount')} desc=""
            right={
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#FF2D55' }]}
                onPress={handleDeleteAccount}
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
              onPress={() => alertRef.show({ title: t('settings.resetAll'), message: t('settings.resetDesc'), type: 'confirm' })}
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

      {/* ── MODALS ── */}
      <Modal visible={isEditProfileVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('settings.editProfile', 'Editar Perfil')}</Text>
              <TouchableOpacity onPress={() => setIsEditProfileVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>{t('register.firstName', 'Nombre')}</Text>
              <TextInput style={styles.modalInput} value={editName} onChangeText={setEditName} />
              
              <Text style={styles.modalLabel}>{t('register.lastName', 'Apellido')}</Text>
              <TextInput style={styles.modalInput} value={editLastname} onChangeText={setEditLastname} />
              
              <Text style={styles.modalLabel}>{t('register.username', 'Nombre de Usuario')}</Text>
              <TextInput style={styles.modalInput} value={editUsername} onChangeText={setEditUsername} />
              
              <Text style={styles.modalLabel}>{t('register.university', 'Universidad')}</Text>
              <TextInput style={styles.modalInput} value={editUniversity} onChangeText={setEditUniversity} />
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => setIsEditProfileVisible(false)}>
                <Text style={styles.modalBtnSecondaryText}>{t('settings.cancel', 'Cancelar')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnPrimary} onPress={handleSaveProfile}>
                <Text style={styles.modalBtnPrimaryText}>{t('settings.save', 'Guardar')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isChangePasswordVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('settings.changePass', 'Cambiar Contraseña')}</Text>
              <TouchableOpacity onPress={() => setIsChangePasswordVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>{t('settings.currentPassword', 'Contraseña Actual')}</Text>
              <TextInput style={styles.modalInput} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
              
              <Text style={styles.modalLabel}>{t('settings.newPassword', 'Nueva Contraseña')}</Text>
              <TextInput style={styles.modalInput} value={newPassword} onChangeText={setNewPassword} secureTextEntry />
              
              <Text style={styles.modalLabel}>{t('settings.confirmPassword', 'Confirmar Contraseña')}</Text>
              <TextInput style={styles.modalInput} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => setIsChangePasswordVisible(false)}>
                <Text style={styles.modalBtnSecondaryText}>{t('settings.cancel', 'Cancelar')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnPrimary} onPress={handleSavePassword}>
                <Text style={styles.modalBtnPrimaryText}>{t('settings.save', 'Guardar')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── DELETE ACCOUNT MODAL (4 STEPS) ─── */}
      <Modal visible={isDeleteAccountVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* STEP 1: CONFIRMATION */}
            {deleteStep === 'confirm' && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{t('settings.deleteAccountConfirm', 'Eliminar Cuenta')}</Text>
                  <TouchableOpacity onPress={handleCloseDeleteModal}>
                    <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.modalBody}>
                  <Text style={styles.modalLabel}>{t('settings.deleteWarning', 'Advertencia importante')}</Text>
                  <Text style={styles.modalDesc}>
                    {t('settings.deleteWarningMsg', 'Esta acción deshabilitará tu cuenta permanentemente. Tienes 14 días para recuperarla antes de que se borre todo definitivamente.')}
                  </Text>
                  <View style={{ marginTop: 12, padding: 12, backgroundColor: '#FFE5E5', borderRadius: 8 }}>
                    <Text style={{ fontSize: 12, color: '#8B0000' }}>
                      {t('settings.deleteIrreversible', '⚠️ Después de 14 días, no podremos recuperar tus datos.')}
                    </Text>
                  </View>
                </View>
                <View style={styles.modalFooter}>
                  <TouchableOpacity style={styles.modalBtnSecondary} onPress={handleCloseDeleteModal}>
                    <Text style={styles.modalBtnSecondaryText}>{t('settings.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalBtnPrimary, { backgroundColor: '#FF2D55' }]}
                    onPress={() => setDeleteStep('password')}
                  >
                    <Text style={styles.modalBtnPrimaryText}>{t('settings.continueBtn', 'Continuar')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* STEP 2: PASSWORD VERIFICATION */}
            {deleteStep === 'password' && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{t('settings.verifyPassword', 'Verificar Contraseña')}</Text>
                  <TouchableOpacity onPress={handleCloseDeleteModal}>
                    <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.modalBody}>
                  <Text style={styles.modalLabel}>{t('settings.passwordVerifyMsg', 'Para confirmar, ingresa tu contraseña')}</Text>
                  <TextInput 
                    style={styles.modalInput} 
                    value={deletePassword} 
                    onChangeText={setDeletePassword} 
                    secureTextEntry 
                    placeholder="••••••••"
                  />
                </View>
                <View style={styles.modalFooter}>
                  <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => setDeleteStep('confirm')}>
                    <Text style={styles.modalBtnSecondaryText}>{t('settings.backBtn', 'Atrás')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalBtnPrimary, { backgroundColor: '#FF2D55' }]}
                    onPress={handleDeletePasswordVerify}
                    disabled={isLoadingDeletion}
                  >
                    <Text style={styles.modalBtnPrimaryText}>
                      {isLoadingDeletion ? t('common.loading', 'Cargando...') : t('settings.continueBtn')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* STEP 3: DATA PREVIEW */}
            {deleteStep === 'data' && deletionDataCount && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{t('settings.whatWillBeLost', 'Datos que se perderán')}</Text>
                  <TouchableOpacity onPress={handleCloseDeleteModal}>
                    <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.modalBody}>
                  <Text style={styles.modalDesc}>
                    {t('settings.deletionDataWarning', 'Estos datos serán eliminados permanentemente después de 14 días:')}
                  </Text>
                  <View style={{ marginTop: 12, gap: 8 }}>
                    {deletionDataCount.subjects > 0 && (
                      <Text style={styles.modalLabel}>📚 {deletionDataCount.subjects} {t('settings.subject', 'materias')}</Text>
                    )}
                    {deletionDataCount.recordings > 0 && (
                      <Text style={styles.modalLabel}>🎙️ {deletionDataCount.recordings} {t('settings.recording', 'grabaciones')}</Text>
                    )}
                    {deletionDataCount.videos > 0 && (
                      <Text style={styles.modalLabel}>🎬 {deletionDataCount.videos} {t('settings.video', 'videos')}</Text>
                    )}
                    {deletionDataCount.photos > 0 && (
                      <Text style={styles.modalLabel}>📷 {deletionDataCount.photos} {t('settings.photo', 'fotos')}</Text>
                    )}
                    {deletionDataCount.decks > 0 && (
                      <Text style={styles.modalLabel}>🃏 {deletionDataCount.decks} {t('settings.deck', 'mazos')}</Text>
                    )}
                  </View>
                  <View style={{ marginTop: 16, padding: 12, backgroundColor: '#E3F2FD', borderRadius: 8 }}>
                    <Text style={{ fontSize: 12, color: '#1976D2' }}>
                      {t('settings.recoveryInfo', 'ℹ️ Puedes recuperar tu cuenta iniciando sesión con tus credenciales en cualquier momento dentro de 14 días.')}
                    </Text>
                  </View>
                </View>
                <View style={styles.modalFooter}>
                  <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => setDeleteStep('password')}>
                    <Text style={styles.modalBtnSecondaryText}>{t('settings.backBtn')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalBtnPrimary, { backgroundColor: '#FF2D55' }]}
                    onPress={() => setDeleteStep('final')}
                  >
                    <Text style={styles.modalBtnPrimaryText}>{t('settings.continueBtn')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* STEP 4: FINAL CONFIRMATION */}
            {deleteStep === 'final' && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{t('settings.confirmDeletion', 'Confirmación Final')}</Text>
                  <TouchableOpacity onPress={handleCloseDeleteModal}>
                    <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.modalBody}>
                  <Text style={styles.modalLabel}>
                    {t('settings.typeToConfirm', `Escribe "${profile?.username || 'ELIMINAR'}" para confirmar`)}
                  </Text>
                  <TextInput 
                    style={[styles.modalInput, deleteConfirmText === (profile?.username || 'ELIMINAR') ? { borderColor: '#34C759' } : {}]}
                    value={deleteConfirmText} 
                    onChangeText={setDeleteConfirmText} 
                    placeholder={profile?.username || 'ELIMINAR'}
                  />
                  <Text style={{ fontSize: 11, color: theme.colors.text.secondary, marginTop: 8 }}>
                    {t('settings.oneWayRoad', '⚠️ Esta es la última oportunidad para cambiar de idea.')}
                  </Text>
                </View>
                <View style={styles.modalFooter}>
                  <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => setDeleteStep('data')}>
                    <Text style={styles.modalBtnSecondaryText}>{t('settings.backBtn')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.modalBtnPrimary, 
                      { 
                        backgroundColor: deleteConfirmText === (profile?.username || 'ELIMINAR') || deleteConfirmText === 'ELIMINAR' ? '#FF2D55' : '#ccc'
                      }
                    ]}
                    onPress={handleConfirmDeletion}
                    disabled={isLoadingDeletion || (deleteConfirmText !== (profile?.username || 'ELIMINAR') && deleteConfirmText !== 'ELIMINAR')}
                  >
                    <Text style={styles.modalBtnPrimaryText}>
                      {isLoadingDeletion ? t('common.loading') : t('settings.deleteBtn')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}


