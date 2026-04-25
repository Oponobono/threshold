import { StyleSheet } from 'react-native';

export const mapuviaFooterStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    paddingBottom: 16,
    gap: 6, // Spacing between isotipo and logotipo
    opacity: 0.6, // Hace que se vea como una marca de agua/firma corporativa
  },
  isotipo: {
    width: 18, 
    height: 18,
  },
  logotipo: {
    width: 90, 
    height: 18,
  },
});
