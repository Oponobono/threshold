import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Switch, Animated, Easing } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { globalStyles } from '../src/styles/globalStyles';
import { loginStyles } from '../src/styles/Login.styles';
import { theme } from '../src/styles/theme';
import { CustomInput } from '../src/components/CustomInput';
import { CustomButton } from '../src/components/CustomButton';
import { FeatureCarousel } from '../src/components/FeatureCarousel';
import { DragonflyIcon } from '../src/components/DragonflyIcon';
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

  // Animaciones para la transición inmersiva
  const sloganOpacity = useRef(new Animated.Value(1)).current;
  const sloganTranslateY = useRef(new Animated.Value(0)).current;

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'es' : 'en');
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('common.error'), t('login.errors.missingCredentials'));
      return;
    }

    setIsLoading(true);

    // Animación de salida: El eslogan brilla/desaparece hacia arriba al intentar entrar
    Animated.parallel([
      Animated.timing(sloganOpacity, {
        toValue: 0,
        duration: 350,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(sloganTranslateY, {
        toValue: -15,
        duration: 350,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    try {
      await loginUser(email, password);
      // Alert removido para mejor experiencia fluida
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert(t('login.errors.loginTitle'), error.message);
      setIsLoading(false);
      // Revertir animación si hay error
      Animated.parallel([
        Animated.timing(sloganOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(sloganTranslateY, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start();
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
    <SafeAreaView style={[globalStyles.safeArea, { backgroundColor: '#F9F9F7' }]}>
      <ScrollView 
        style={[globalStyles.container, { backgroundColor: '#F9F9F7' }]} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
      >
        {/* Tonalidad y Cambio de Idioma */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingTop: theme.spacing.md }}>
          <TouchableOpacity onPress={toggleLanguage}>
            <Text style={[globalStyles.textLink, { color: '#8A8A8E' }]}>{i18n.language.toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        {/* Brand Header (Transición desde Splash) */}
        <View style={loginStyles.brandHeaderContainer}>
          <View style={loginStyles.titleRow}>
            <DragonflyIcon size={38} color="#1A1A1A" style={loginStyles.brandLogo} />
            <Text style={loginStyles.brandAppName}>hreshold</Text>
          </View>
          
          {/* Eslogan animado independiente */}
          <Animated.View style={{ opacity: sloganOpacity, transform: [{ translateY: sloganTranslateY }] }}>
            <Text style={loginStyles.brandSlogan}>BEYOND THE LIMIT</Text>
          </Animated.View>
        </View>

        {/* Carousel Section */}
        <FeatureCarousel />

        {/* Form Section */}
        <View style={loginStyles.formContainer}>
          <View style={loginStyles.formHeaderContainer}>
            <Text style={loginStyles.formHeaderTitle}>
              {t('login.formTitle')}
            </Text>
            <Text style={loginStyles.formHeaderSubtitle}>
              {t('login.formSubtitle')}
            </Text>
          </View>

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
