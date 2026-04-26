const fs = require('fs');
const path = require('path');

const extractAndReplace = (componentName) => {
  const componentPath = path.join('c:/Users/cris7/OneDrive/Desktop/Threshold/mobile/src/components', `${componentName}.tsx`);
  const stylesPath = path.join('c:/Users/cris7/OneDrive/Desktop/Threshold/mobile/src/styles', `${componentName}.styles.ts`);
  
  if (!fs.existsSync(componentPath)) {
    console.log(`Skipping ${componentName}, not found`);
    return;
  }
  
  let content = fs.readFileSync(componentPath, 'utf8');
  
  // Encontrar el bloque StyleSheet.create
  const styleRegex = /const styles = StyleSheet\.create\(\{([\s\S]*)\}\);/;
  const match = content.match(styleRegex);
  
  if (!match) {
    console.log(`No styles found in ${componentName}`);
    return;
  }
  
  // Crear el archivo de estilos
  const styleContent = `import { StyleSheet, Dimensions } from 'react-native';\nimport { theme } from './theme';\n\nconst { width, height } = Dimensions.get('window');\n\nexport const styles = StyleSheet.create({${match[1]}});\n`;
  fs.writeFileSync(stylesPath, styleContent, 'utf8');
  
  // Actualizar el componente original
  content = content.replace(styleRegex, '');
  
  // Quitar importación de StyleSheet si ya no se usa (simplificado)
  // Añadir la importación del nuevo archivo de estilos al principio
  content = `import { styles } from '../styles/${componentName}.styles';\n` + content;
  
  fs.writeFileSync(componentPath, content, 'utf8');
  console.log(`Processed ${componentName}`);
};

extractAndReplace('PhotoCaptureModal');
extractAndReplace('ImageViewerModal');
extractAndReplace('PremiumLoader');

console.log('Done extracting styles');
