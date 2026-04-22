import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { globalStyles } from '../src/styles/globalStyles';
import { loginStyles } from '../src/styles/Login.styles';
import { registerStyles as localStyles } from '../src/styles/Register.styles';
import { theme } from '../src/styles/theme';
import { CustomInput } from '../src/components/CustomInput';
import { CustomButton } from '../src/components/CustomButton';
import { registerUser } from '../src/services/api';
import { Alert } from 'react-native';

const TOTAL_STEPS = 4;

export default function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Form Data
  const [name, setName] = useState('');
  const [lastname, setLastname] = useState('');
  const [username, setUsername] = useState('');
  
  const [gradingScale, setGradingScale] = useState('0-5.0');
  const [approvalThreshold, setApprovalThreshold] = useState('3.0');

  const [major, setMajor] = useState('');
  const [university, setUniversity] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(1 / TOTAL_STEPS)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: step / TOTAL_STEPS,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [step]);

  const changeStep = (newStep: number) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setStep(newStep);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  // Validations per step
  const isStep1Valid = name.trim().length > 0 && lastname.trim().length > 0 && username.trim().length > 0;
  
  const isStep2Valid = gradingScale && !isNaN(parseFloat(approvalThreshold));

  const isStep3Valid = true; // Optional

  const isEmailValid = (mail: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail);
  const reqs = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[@$!%*?&]/.test(password),
  };
  const isPasswordValid = Object.values(reqs).every(Boolean);
  const isStep4Valid = isEmailValid(email) && isPasswordValid && password === confirmPassword;

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      changeStep(step + 1);
    } else {
      handleRegister();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      changeStep(step - 1);
    } else {
      router.back();
    }
  };

  const handleRegister = async () => {
    setIsLoading(true);
    try {
      const response = await registerUser({
        email,
        password,
        name,
        lastname,
        username,
        grading_scale: gradingScale,
        approval_threshold: parseFloat(approvalThreshold),
        major,
        university
      });
      Alert.alert(t('common.success'), 'Cuenta creada correctamente.');
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderProgressBar = () => (
    <View style={localStyles.progressBarContainer}>
      <Animated.View style={[
        localStyles.progressBarFill, 
        { 
          width: progressAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', '100%']
          })
        }
      ]} />
    </View>
  );

  const RequirementItem = ({ fulfilled, text }: { fulfilled: boolean; text: string }) => (
    <View style={localStyles.reqItem}>
      <Feather 
        name={fulfilled ? 'check-circle' : 'circle'} 
        size={16} 
        color={fulfilled ? '#34C759' : theme.colors.text.placeholder} 
      />
      <Text style={[localStyles.reqText, fulfilled && localStyles.reqTextFulfilled]}>
        {text}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          style={globalStyles.container} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
        >
          {/* Header Section */}
          <View style={loginStyles.headerContainer}>
            <TouchableOpacity onPress={handleBack} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
            <View style={[loginStyles.headerLogo, { position: 'absolute', left: 0, right: 0, justifyContent: 'center', zIndex: -1 }]}>
              <Ionicons name="school-outline" size={24} color={theme.colors.primary} />
            </View>
          </View>

          {renderProgressBar()}

          <Animated.View style={{ opacity: fadeAnim, marginTop: theme.spacing.md }}>
            
            {step === 1 && (
              <View>
                <View style={loginStyles.welcomeTextContainer}>
                  <Text style={loginStyles.welcomeTitle}>Configuración de Espacio de Trabajo</Text>
                  <Text style={loginStyles.welcomeSubtitle}>
                    Comencemos por tu nombre. Así es como te saludaremos cada día.
                  </Text>
                </View>

                <View style={[loginStyles.formContainer, { marginTop: theme.spacing.lg }]}>
                  <CustomInput
                    label="Nombre(s)"
                    placeholder="Ej. María"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                  <CustomInput
                    label="Apellido(s)"
                    placeholder="Ej. Sánchez"
                    value={lastname}
                    onChangeText={setLastname}
                    autoCapitalize="words"
                  />
                  <CustomInput
                    label="Username o apodo"
                    placeholder="Ej. marias99"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                  />
                  
                  <CustomButton 
                    title="Continuar" 
                    onPress={handleNext} 
                    disabled={!isStep1Valid}
                    style={{ marginTop: theme.spacing.md }}
                  />
                </View>
              </View>
            )}

            {step === 2 && (
              <View>
                <View style={loginStyles.welcomeTextContainer}>
                  <Text style={loginStyles.welcomeTitle}>Parámetros de Cálculo</Text>
                  <Text style={loginStyles.welcomeSubtitle}>
                    Define el motor de cálculo según la escala de tu universidad.
                  </Text>
                </View>

                <View style={[loginStyles.formContainer, { marginTop: theme.spacing.lg }]}>
                  <Text style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.secondary, marginBottom: theme.spacing.xs }}>Escala de Calificación</Text>
                  <View style={localStyles.segmentedControl}>
                    {['0-5.0', '0-10', '0-100'].map((scale) => (
                      <TouchableOpacity 
                        key={scale}
                        style={[localStyles.segmentButton, gradingScale === scale && localStyles.segmentButtonActive]}
                        onPress={() => setGradingScale(scale)}
                      >
                        <Text style={[localStyles.segmentText, gradingScale === scale && localStyles.segmentTextActive]}>
                          {scale}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <CustomInput
                    label="¿Cuál es el umbral de aprobación?"
                    placeholder={`Ej. ${gradingScale === '0-5.0' ? '3.0' : gradingScale === '0-10' ? '6.0' : '60'}`}
                    value={approvalThreshold}
                    onChangeText={setApprovalThreshold}
                    keyboardType="numeric"
                  />
                  
                  <CustomButton 
                    title="Continuar" 
                    onPress={handleNext} 
                    disabled={!isStep2Valid}
                    style={{ marginTop: theme.spacing.md }}
                  />
                </View>
              </View>
            )}

            {step === 3 && (
              <View>
                <View style={loginStyles.welcomeTextContainer}>
                  <Text style={loginStyles.welcomeTitle}>Contexto Académico</Text>
                  <Text style={loginStyles.welcomeSubtitle}>
                    Para adaptar recomendaciones. Puedes omitir esto por ahora.
                  </Text>
                </View>

                <View style={[loginStyles.formContainer, { marginTop: theme.spacing.lg }]}>
                  <CustomInput
                    label="Carrera / Especialidad (Opcional)"
                    placeholder="Ej. Ingeniería de Software"
                    value={major}
                    onChangeText={setMajor}
                  />
                  <CustomInput
                    label="Universidad / Institución (Opcional)"
                    placeholder="Ej. Universidad Nacional"
                    value={university}
                    onChangeText={setUniversity}
                  />
                  
                  {!major && !university && (
                    <View style={localStyles.emptyState}>
                      <Feather name="book-open" size={32} color={theme.colors.border} />
                      <Text style={localStyles.emptyStateText}>
                        Agrega tu institución para futuras analíticas colaborativas.
                      </Text>
                    </View>
                  )}

                  <CustomButton 
                    title={major || university ? "Continuar" : "Omitir y Continuar"} 
                    onPress={handleNext} 
                    disabled={!isStep3Valid}
                    style={{ marginTop: theme.spacing.xl }}
                  />
                </View>
              </View>
            )}

            {step === 4 && (
              <View>
                <View style={loginStyles.welcomeTextContainer}>
                  <Text style={loginStyles.welcomeTitle}>Protege tu Espacio</Text>
                  <Text style={loginStyles.welcomeSubtitle}>
                    Último paso. Asegura tu información.
                  </Text>
                </View>

                <View style={[loginStyles.formContainer, { marginTop: theme.spacing.md }]}>
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

                  <CustomInput 
                    label={t('register.confirmPasswordLabel')} 
                    placeholder={t('register.confirmPasswordPlaceholder')} 
                    secureTextEntry
                    isPassword
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />

                  {/* Requirements Card */}
                  <View style={localStyles.reqCard}>
                    <Text style={localStyles.reqTitle}>{t('register.reqTitle')}</Text>
                    <RequirementItem fulfilled={reqs.length} text={t('register.reqLength')} />
                    <RequirementItem fulfilled={reqs.upper} text={t('register.reqUpper')} />
                    <RequirementItem fulfilled={reqs.number} text={t('register.reqNumber')} />
                    <RequirementItem fulfilled={reqs.special} text={t('register.reqSpecial')} />
                  </View>

                  <CustomButton 
                    title="Crear Espacio de Trabajo" 
                    onPress={handleNext} 
                    loading={isLoading}
                    style={{ marginTop: theme.spacing.sm, marginBottom: theme.spacing.lg }}
                    disabled={!isStep4Valid || isLoading}
                  />

                </View>
              </View>
            )}

          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}



