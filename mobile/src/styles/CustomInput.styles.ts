import { StyleSheet } from 'react-native';
import { theme } from './theme';

export const customInputStyles = StyleSheet.create({
  container: {
    marginBottom: 24, // Mayor espacio entre campos
  },
  inputContainer: {
    position: 'relative',
    backgroundColor: '#F9F9F7', // Fondo sutil que se mezcla con el layout
    borderWidth: 0.8, // Borde fino y elegante
    borderRadius: 12, // Estilo Bento
    height: 54,
    justifyContent: 'center',
  },
  labelContainer: {
    position: 'absolute',
    left: 14,
    backgroundColor: '#F9F9F7', // Mismo fondo para "cortar" la línea del borde
    paddingHorizontal: 4,
    zIndex: 1,
  },
  label: {
    fontWeight: '300', // Fuente sans-serif delgada
    letterSpacing: 0.5,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '400',
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    height: '100%',
    justifyContent: 'center',
  },
  errorText: {
    color: theme.colors.text.error,
    fontSize: 12,
    marginTop: 6,
    marginLeft: 16,
  },
  successText: {
    color: '#34C759',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 16,
  },
});
