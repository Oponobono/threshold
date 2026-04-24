import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

export const MapuviaFooter = () => {
  return (
    <View style={styles.container}>
      <Image 
        source={require('../images/logos_mapuvia/isotipo_mapuvia.png')} 
        style={styles.isotipo} 
        resizeMode="contain" 
      />
      <Image 
        source={require('../images/logos_mapuvia/logotipo_mapuvia_labs.png')} 
        style={styles.logotipo} 
        resizeMode="contain" 
      />
    </View>
  );
};

const styles = StyleSheet.create({
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
