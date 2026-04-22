import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, SafeAreaView, Switch } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { globalStyles } from '../src/styles/globalStyles';
import { loginStyles } from '../src/styles/Login.styles';
import { theme } from '../src/styles/theme';
import { CustomInput } from '../src/components/CustomInput';
import { CustomButton } from '../src/components/CustomButton';
import { FeatureCarousel } from '../src/components/FeatureCarousel';
import { trackGuestVisit, loginUser } from '../src/services/api';
import { Alert } from 'react-native';

export default function LoginScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const lastGuestToggleAtRef = useRef(0);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'es' : 'en');
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('common.error'), t('login.errors.missingCredentials'));
      return;
    }

    setIsLoading(true);
    try {
      await loginUser(email, password);
      Alert.alert(t('common.success'), t('login.success.loggedIn'));
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert(t('login.errors.loginTitle'), error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestToggle = (value: boolean) => {
    const now = Date.now();
    if (now - lastGuestToggleAtRef.current < 300) return;
    lastGuestToggleAtRef.current = now;

    setIsGuest(value);
    if (value) {
      router.replace('/(tabs)');
      void trackGuestVisit();
    }
  };

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <ScrollView 
        style={globalStyles.container} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
      >
        {/* Header Section */}
        <View style={loginStyles.headerContainer}>
          <View style={loginStyles.headerLogo}>
            <Ionicons name="school" size={24} color={theme.colors.primary} />
            <Text style={loginStyles.logoText}>Threshold</Text>
          </View>
          <TouchableOpacity onPress={toggleLanguage}>
            <Text style={globalStyles.textLink}>{i18n.language.toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        {/* Welcome Section */}
        <View style={loginStyles.welcomeSection}>
          <View style={loginStyles.avatarContainer}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1544717302-de2939b7ef71?q=80&w=200&auto=format&fit=crop' }} 
              style={loginStyles.avatarImage} 
            />
          </View>
          <View style={loginStyles.welcomeTextContainer}>
            <Text style={loginStyles.welcomeTitle}>{t('login.welcomeTitle')}</Text>
            <Text style={loginStyles.welcomeSubtitle}>
              {t('login.welcomeSubtitle')}
            </Text>
          </View>
        </View>

        {/* Carousel Section */}
        <FeatureCarousel />

        {/* Form Section */}
        <View style={loginStyles.formContainer}>
          <CustomInput 
            label={t('login.emailLabel')} 
            placeholder={t('login.emailPlaceholder')} 
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          
          <CustomInput 
            label={t('login.passwordLabel')} 
            placeholder={t('login.passwordPlaceholder')} 
            secureTextEntry
            isPassword
            value={password}
            onChangeText={setPassword}
          />

          <View style={loginStyles.optionsRow}>
            <TouchableOpacity 
              style={loginStyles.checkboxContainer}
              onPress={() => setRememberMe(!rememberMe)}
              activeOpacity={0.7}
            >
              <Feather 
                name={rememberMe ? "check-square" : "square"} 
                size={20} 
                color={rememberMe ? theme.colors.primary : theme.colors.border} 
              />
              <Text style={loginStyles.checkboxText}>{t('login.rememberMe')}</Text>
            </TouchableOpacity>

            <TouchableOpacity>
              <Text style={globalStyles.textLink}>{t('login.forgot')}</Text>
            </TouchableOpacity>
          </View>

          <CustomButton 
            title={t('login.enterDashboard')} 
            onPress={handleLogin} 
            loading={isLoading}
            style={{ marginBottom: theme.spacing.lg }}
          />

          <View style={globalStyles.separatorContainer}>
            <View style={globalStyles.separatorLine} />
            <Text style={globalStyles.separatorText}>{t('login.or')}</Text>
            <View style={globalStyles.separatorLine} />
          </View>

          <TouchableOpacity style={loginStyles.biometricsButton} activeOpacity={0.7}>
            <Text style={loginStyles.biometricsText}>{t('login.useBiometrics')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={loginStyles.biometricsSubtext}>{t('login.faceTouchId')}</Text>
              <Ionicons name="finger-print-outline" size={20} color={theme.colors.text.secondary} />
            </View>
          </TouchableOpacity>

          <View style={loginStyles.guestRow}>
            <View>
              <Text style={loginStyles.guestTitle}>{t('login.continueGuest')}</Text>
              <Text style={loginStyles.guestSubtitle}>{t('login.guestSubtitle')}</Text>
            </View>
            <Switch 
              value={isGuest} 
              onValueChange={handleGuestToggle}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.white}
            />
          </View>

          <View style={loginStyles.footerLinksRow}>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={globalStyles.textLink}>{t('login.createAccount')}</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={globalStyles.textLink}>{t('login.resetPassword')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={{ marginTop: theme.spacing.xl }}>
          <Text style={loginStyles.footerText}>
            {t('login.footerText')}
          </Text>
          <Text style={loginStyles.copyrightText}>
            {t('login.copyright')}
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
