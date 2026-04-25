import React from 'react';
import { View, Image } from 'react-native';
import { mapuviaFooterStyles as styles } from '../styles/MapuviaFooter.styles';

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
