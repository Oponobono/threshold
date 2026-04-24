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
import { MapuviaFooter } from '../src/components/MapuviaFooter';
import { trackGuestVisit, loginUser, enrollBiometric, biometricLogin, getUserId } from '../src/services/api';
import { enrollBiometricToken, authenticateWithBiometrics, hasBiometricTokenStored, isBiometricAvailable } from '../src/services/biometricService';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export default function LoginScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const [biometricReady, setBiometricReady] = useState(false); // true si el dispositivo tiene huella enrollada Y token guardado
  const lastGuestToggleAtRef = useRef(0);

  // Animaciones para la transición inmersiva
  const sloganOpacity = useRef(new Animated.Value(1)).current;
  const sloganTranslateY = useRef(new Animated.Value(0)).current;

  // Cargar correo guardado y verificar disponibilidad biométrica al iniciar
  React.useEffect(() => {
    const initialize = async () => {
      try {
        // Cargar correo recordado
        const savedEmail = await SecureStore.getItemAsync('remembered_email');
        if (savedEmail) {
          setEmail(savedEmail);
          setRememberMe(true);
        }
        // Verificar si el botón Touch ID debe mostrarse activo
        const available = await isBiometricAvailable();
        const hasToken = await hasBiometricTokenStored();
        setBiometricReady(available && hasToken);
      } catch (error) {
        console.log('Error en initialize:', error);
      }
    };
    initialize();
  }, []);

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
      const loginData = await loginUser(email, password);
      
      // Guardar o borrar correo según la preferencia
      if (rememberMe) {
        await SecureStore.setItemAsync('remembered_email', email);
      } else {
        await SecureStore.deleteItemAsync('remembered_email');
      }

      // Ofrecer enrollment biométrico si el dispositivo lo soporta y aún no está registrado
      const available = await isBiometricAvailable();
      const hasToken = await hasBiometricTokenStored();
      const userId = loginData?.user?.id?.toString();

      if (available && !hasToken && userId) {
        Alert.alert(
          'Activar Touch ID',
          '¿Deseas iniciar sesión con tu huella dactilar la próxima vez?',
          [
            { text: 'Ahora no', style: 'cancel', onPress: () => router.replace('/(tabs)') },
            {
              text: 'Activar',
              onPress: async () => {
                const token = await enrollBiometricToken(email);
                if (token) {
                  try {
                    await enrollBiometric(userId, token);
                    setBiometricReady(true);
                  } catch (e: any) {
                    console.warn('Error al registrar token en backend:', e);
                    // Si falla el backend, revocamos el token local para evitar desincronización
                    const { revokeBiometricToken } = require('../src/services/biometricService');
                    await revokeBiometricToken();
                    Alert.alert('Touch ID', 'Hubo un error al guardar la configuración en el servidor.');
                  }
                }
                router.replace('/(tabs)');
              },
            },
          ]
        );
      } else {
        router.replace('/(tabs)');
      }
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

  const handleTouchId = async () => {
    if (!biometricReady) {
      Alert.alert(
        'Touch ID no configurado',
        'Inicia sesión con tu correo y contraseña primero para activar esta función.'
      );
      return;
    }

    setIsBiometricLoading(true);
    try {
      const result = await authenticateWithBiometrics();

      if (!result.success) {
        if (result.reason !== 'cancelled') {
          Alert.alert('Touch ID', 'No se pudo verificar tu huella. Intenta de nuevo o usa tu contraseña.');
        }
        setIsBiometricLoading(false);
        return;
      }

      // El OS confirmó la huella. Autenticar con el backend.
      await biometricLogin(result.token);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo iniciar sesión con Touch ID.');
      setIsBiometricLoading(false);
      
      // Si el backend rechaza el token (ej: base de datos desincronizada), revocamos localmente
      if (error.message && error.message.includes('fallida')) {
        const { revokeBiometricToken } = require('../src/services/biometricService');
        await revokeBiometricToken();
        setBiometricReady(false);
      }
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
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          
          <CustomInput 
            label={t('login.passwordLabel')} 
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
              <View style={[
                {
                  width: 20, 
                  height: 20, 
                  borderRadius: 6, 
                  borderWidth: 1, 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginRight: 8
                },
                rememberMe 
                  ? { backgroundColor: '#C5A059', borderColor: '#C5A059' } 
                  : { backgroundColor: 'transparent', borderColor: '#E0E0E0' }
              ]}>
                {rememberMe && <Feather name="check" size={14} color="#FFF" />}
              </View>
              <Text style={[loginStyles.checkboxText, { color: '#1A1A1A', fontWeight: '300', marginLeft: 0 }]}>{t('login.rememberMe')}</Text>
            </TouchableOpacity>

            <TouchableOpacity>
              <Text style={[globalStyles.textLink, { color: '#8A8A8E', fontWeight: '400' }]}>{t('login.forgot')}</Text>
            </TouchableOpacity>
          </View>

          {/* Fila principal de autenticación: Ingresar + Touch ID */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: theme.spacing.md }}>
            {/* Botón de login: ocupa ~75% */}
            <View style={{ flex: 3 }}>
              <CustomButton 
                title={t('login.enterDashboard')} 
                onPress={handleLogin} 
                loading={isLoading}
              />
            </View>

            {/* Botón Touch ID: icono solo, misma altura */}
            <TouchableOpacity
              style={[
                loginStyles.touchIdIconButton,
                biometricReady ? { borderColor: '#C5A059' } : { opacity: 0.45 },
              ]}
              activeOpacity={0.7}
              onPress={handleTouchId}
              disabled={isBiometricLoading || isLoading}
            >
              {isBiometricLoading ? (
                <Feather name="loader" size={24} color={biometricReady ? '#C5A059' : theme.colors.text.secondary} />
              ) : (
                <Ionicons
                  name="finger-print-outline"
                  size={30}
                  color={biometricReady ? '#C5A059' : theme.colors.text.secondary}
                />
              )}
            </TouchableOpacity>
          </View>

          <CustomButton 
            title={t('login.createAccount')} 
            onPress={() => router.push('/register')} 
            variant="outline"
            style={{ marginBottom: 0 }}
          />

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

        </View>

        {/* Footer */}
        <View style={{ marginTop: 0 }}>
          <Text style={loginStyles.footerText}>
            {t('login.footerText')}
          </Text>
          <MapuviaFooter />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
