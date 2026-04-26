const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('app', (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('SafeAreaView') && content.includes('react-native')) {
      const regex = /import\s+{([^}]*SafeAreaView[^}]*)}\s+from\s+['"]react-native['"];?/g;
      
      let wasChanged = false;
      content = content.replace(regex, (match, p1) => {
        wasChanged = true;
        const parts = p1.split(',').map(p => p.trim()).filter(p => p !== '' && p !== 'SafeAreaView');
        let newImports = '';
        if (parts.length > 0) {
          newImports += `import { ${parts.join(', ')} } from 'react-native';\n`;
        }
        newImports += `import { SafeAreaView } from 'react-native-safe-area-context';`;
        return newImports;
      });
      
      if (wasChanged) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Fixed:', filePath);
      }
    }
  }
});
