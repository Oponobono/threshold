const fs = require('fs');
const filePath = 'c:/Users/cris7/OneDrive/Desktop/Threshold/mobile/app/subjects/[subjectId].tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Add import for PremiumLoader
if (!content.includes('PremiumLoader')) {
  content = content.replace(
    "import { ImageViewerModal } from '../../src/components/ImageViewerModal';",
    "import { ImageViewerModal } from '../../src/components/ImageViewerModal';\nimport { PremiumLoader } from '../../src/components/PremiumLoader';"
  );
}

// Remove the old if (isLoading) block completely
content = content.replace(/  if \(isLoading\) \{[\s\S]*?    \);\n  \}\n/m, "");

// Wrap the return with PremiumLoader overlay
// Note: We'll put PremiumLoader just inside the return fragments
content = content.replace(
  /  return \(\n    <>/,
  "  return (\n    <>\n      <PremiumLoader visible={isLoading} text={t('subjects.loading').toUpperCase()} />"
);

// We need to remove the artificial delay from loadAllData in the useEffect,
// because PremiumLoader handles the 600ms fade-out natively, making the delay unnecessary and feeling slow.
content = content.replace(
  /          \/\/ Pequeño retardo artificial para asegurar que el renderizado de i18n y fuentes esté listo\n          setTimeout\(\(\) => \{\n            if \(mounted\) setIsLoading\(false\);\n          \}, 400\);\n/,
  "          // PremiumLoader se encargará del fade-out suave\n          if (mounted) setIsLoading(false);\n"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
