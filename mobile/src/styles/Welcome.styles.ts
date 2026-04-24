import { StyleSheet } from 'react-native';

export const welcomeStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#141416', // Gris Carbono profundo
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end', // Align baseline
    justifyContent: 'center',
    marginBottom: 4,
  },
  logoIcon: {
    marginRight: 2, 
    marginBottom: 4, // Para que el tallo baje como una T mayúscula
  },
  appName: {
    fontSize: 42, // Ajustado para hacer match con el tamaño de la libélula
    fontWeight: '400', 
    color: '#F5F5F0', 
    letterSpacing: 2, 
    textTransform: 'none', 
  },
  phraseText: {
    fontWeight: '300', 
    fontSize: 12, // Aumentado para que no se pierda frente al título
    letterSpacing: 7, // Tracking reajustado para el nuevo tamaño
    color: '#A8A8AC', // Gris ligeramente más claro para mayor presencia
    textTransform: 'uppercase',
    marginTop: 10, // Aire equilibrado
  }
});
