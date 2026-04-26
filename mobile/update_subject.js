const fs = require('fs');
const filePath = 'c:/Users/cris7/OneDrive/Desktop/Threshold/mobile/app/subjects/[subjectId].tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add imports
content = content.replace(
  "import { useCameraPermissions, CameraView } from 'expo-camera';",
  "import { DocumentScannerModal } from '../../src/components/DocumentScannerModal';\nimport { PhotoCaptureModal } from '../../src/components/PhotoCaptureModal';\nimport { useCameraPermissions, CameraView } from 'expo-camera';"
);

// 2. Change state hooks
content = content.replace(
  "const [isDetailLoading, setIsDetailLoading] = useState(false);\n  const [isCameraOpen, setIsCameraOpen] = useState(false);\n  const [isCapturing, setIsCapturing] = useState(false);\n  const cameraRef = React.useRef<CameraView>(null);\n  const [cameraPermission, requestCameraPermission] = useCameraPermissions();",
  "const [isDetailLoading, setIsDetailLoading] = useState(false);\n  const [isScannerVisible, setIsScannerVisible] = useState(false);\n  const [isPhotoModalVisible, setIsPhotoModalVisible] = useState(false);"
);

// 3. Remove old handleOpenCamera and captureAndSave, add new ones
content = content.replace(
  /const handleOpenCamera = async \(\) => \{[\s\S]*?const captureAndSave = async \(\) => \{[\s\S]*?^\s*\};\n/m,
  "const handleTakePhoto = () => {\n    setIsPhotoModalVisible(true);\n  };\n\n  const handleOpenScanner = () => {\n    setIsScannerVisible(true);\n  };\n"
);

// 4. Update the Gallery Row (add Scanner button)
content = content.replace(
  /<View style=\{styles\.sectionHeaderRow\}>\s*<View>\s*<Text style=\{styles\.sectionTitle\}>\{t\('subjects\.galleryTitle'\)\}<\/Text>\s*<Text style=\{styles\.sectionHint\}>\{t\('subjects\.galleryHint'\)\}<\/Text>\s*<\/View>\s*<TouchableOpacity style=\{styles\.galleryIconBtn\} onPress=\{[^}]*\}\>\s*<Ionicons name="images-outline" size=\{18\} color=\{theme\.colors\.primary\} \/>\s*<\/TouchableOpacity>\s*<\/View>/,
  "<View style={styles.sectionHeaderRow}>\n            <View>\n              <Text style={styles.sectionTitle}>{t('subjects.galleryTitle')}</Text>\n              <Text style={styles.sectionHint}>{t('subjects.galleryHint')}</Text>\n            </View>\n            <View style={{ flexDirection: 'row', gap: 10 }}>\n              <TouchableOpacity style={styles.galleryIconBtn} onPress={handleOpenScanner}>\n                <Ionicons name=\"scan-outline\" size={18} color={theme.colors.primary} />\n              </TouchableOpacity>\n              <TouchableOpacity style={styles.galleryIconBtn} onPress={() => router.push('/gallery')}>\n                <Ionicons name=\"images-outline\" size={18} color={theme.colors.primary} />\n              </TouchableOpacity>\n            </View>\n          </View>"
);

// 5. Update footer button from handleOpenCamera to handleTakePhoto, change icon from 'add' to 'camera'
content = content.replace(
  /<TouchableOpacity style=\{styles\.galleryFooterAction\} onPress=\{handleOpenCamera\}>\s*<Ionicons name="add" size=\{22\} color=\{theme\.colors\.white\} \/>\s*<\/TouchableOpacity>/,
  "<TouchableOpacity style={styles.galleryFooterAction} onPress={handleTakePhoto}>\n                <Ionicons name=\"camera\" size={22} color={theme.colors.white} />\n              </TouchableOpacity>"
);

// 6. Remove inline camera overlay and replace with Modals
content = content.replace(
  /\{\/\* Inline camera overlay \*\/\}[\s\S]*?<\/View>\s*\)\}\s*<\/>/,
  `<DocumentScannerModal\n        isVisible={isScannerVisible}\n        onClose={() => setIsScannerVisible(false)}\n        subjects={selectedSubject ? [selectedSubject as Subject] : []}\n        onSave={async () => {\n          if (subjectId) {\n            const updated = await getPhotosBySubject(subjectId);\n            setPhotos(updated || []);\n          }\n        }}\n      />\n\n      <PhotoCaptureModal\n        isVisible={isPhotoModalVisible}\n        onClose={() => setIsPhotoModalVisible(false)}\n        subjects={selectedSubject ? [selectedSubject as Subject] : []}\n        initialSubjectId={subjectId || undefined}\n        onSave={async () => {\n          if (subjectId) {\n            const updated = await getPhotosBySubject(subjectId);\n            setPhotos(updated || []);\n          }\n        }}\n      />\n    </>`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
