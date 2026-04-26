const fs = require('fs');
const filePath = 'c:/Users/cris7/OneDrive/Desktop/Threshold/mobile/app/subjects/[subjectId].tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add import
if (!content.includes('ImageViewerModal')) {
  content = content.replace(
    "import { PhotoCaptureModal } from '../../src/components/PhotoCaptureModal';",
    "import { PhotoCaptureModal } from '../../src/components/PhotoCaptureModal';\nimport { ImageViewerModal } from '../../src/components/ImageViewerModal';"
  );
}

// 2. Add state
if (!content.includes('isViewerVisible')) {
  content = content.replace(
    "const [isPhotoModalVisible, setIsPhotoModalVisible] = useState(false);",
    "const [isPhotoModalVisible, setIsPhotoModalVisible] = useState(false);\n  const [isViewerVisible, setIsViewerVisible] = useState(false);\n  const [initialViewerIndex, setInitialViewerIndex] = useState(0);"
  );
}

// 3. Update Gallery Images to be Touchable
// Single
content = content.replace(
  /<View style=\{styles\.galleryGridSingle\}>\s*<Image source=\{\{ uri: photos\[0\]\.local_uri \}\} style=\{styles\.galleryImageFull\} resizeMode="cover" \/>\s*<\/View>/g,
  `<View style={styles.galleryGridSingle}>\n                <TouchableOpacity style={{ flex: 1 }} onPress={() => { setInitialViewerIndex(0); setIsViewerVisible(true); }}>\n                  <Image source={{ uri: photos[0].local_uri }} style={styles.galleryImageFull} resizeMode="cover" />\n                </TouchableOpacity>\n              </View>`
);

// Two
content = content.replace(
  /\{photos\.slice\(0, 2\)\.map\(\(p, i\) => \(\s*<Image key=\{i\} source=\{\{ uri: p\.local_uri \}\} style=\{styles\.galleryImageHalf\} resizeMode="cover" \/>\s*\)\)\}/g,
  `{photos.slice(0, 2).map((p, i) => (
                  <TouchableOpacity key={i} style={styles.galleryImageHalf} onPress={() => { setInitialViewerIndex(i); setIsViewerVisible(true); }}>
                    <Image source={{ uri: p.local_uri }} style={styles.galleryImageFull} resizeMode="cover" />
                  </TouchableOpacity>
                ))}`
);

// Three
content = content.replace(
  /<Image source=\{\{ uri: photos\[0\]\.local_uri \}\} style=\{styles\.galleryImageLeft\} resizeMode="cover" \/>\s*<View style=\{styles\.galleryGridThreeRight\}>\s*<Image source=\{\{ uri: photos\[1\]\.local_uri \}\} style=\{styles\.galleryImageQuarter\} resizeMode="cover" \/>\s*<Image source=\{\{ uri: photos\[2\]\.local_uri \}\} style=\{styles\.galleryImageQuarter\} resizeMode="cover" \/>\s*<\/View>/g,
  `<TouchableOpacity style={styles.galleryImageLeft} onPress={() => { setInitialViewerIndex(0); setIsViewerVisible(true); }}>
                  <Image source={{ uri: photos[0].local_uri }} style={styles.galleryImageFull} resizeMode="cover" />
                </TouchableOpacity>
                <View style={styles.galleryGridThreeRight}>
                  <TouchableOpacity style={styles.galleryImageQuarter} onPress={() => { setInitialViewerIndex(1); setIsViewerVisible(true); }}>
                    <Image source={{ uri: photos[1].local_uri }} style={styles.galleryImageFull} resizeMode="cover" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.galleryImageQuarter} onPress={() => { setInitialViewerIndex(2); setIsViewerVisible(true); }}>
                    <Image source={{ uri: photos[2].local_uri }} style={styles.galleryImageFull} resizeMode="cover" />
                  </TouchableOpacity>
                </View>`
);

// Four
content = content.replace(
  /<View style=\{styles\.galleryGridFourRow\}>\s*<Image source=\{\{ uri: photos\[0\]\.local_uri \}\} style=\{styles\.galleryImageQuad\} resizeMode="cover" \/>\s*<Image source=\{\{ uri: photos\[1\]\.local_uri \}\} style=\{styles\.galleryImageQuad\} resizeMode="cover" \/>\s*<\/View>\s*<View style=\{styles\.galleryGridFourRow\}>\s*<Image source=\{\{ uri: photos\[2\]\.local_uri \}\} style=\{styles\.galleryImageQuad\} resizeMode="cover" \/>\s*<Image source=\{\{ uri: photos\[3\]\.local_uri \}\} style=\{styles\.galleryImageQuad\} resizeMode="cover" \/>\s*<\/View>/g,
  `<View style={styles.galleryGridFourRow}>
                  <TouchableOpacity style={styles.galleryImageQuad} onPress={() => { setInitialViewerIndex(0); setIsViewerVisible(true); }}>
                    <Image source={{ uri: photos[0].local_uri }} style={styles.galleryImageFull} resizeMode="cover" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.galleryImageQuad} onPress={() => { setInitialViewerIndex(1); setIsViewerVisible(true); }}>
                    <Image source={{ uri: photos[1].local_uri }} style={styles.galleryImageFull} resizeMode="cover" />
                  </TouchableOpacity>
                </View>
                <View style={styles.galleryGridFourRow}>
                  <TouchableOpacity style={styles.galleryImageQuad} onPress={() => { setInitialViewerIndex(2); setIsViewerVisible(true); }}>
                    <Image source={{ uri: photos[2].local_uri }} style={styles.galleryImageFull} resizeMode="cover" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.galleryImageQuad} onPress={() => { setInitialViewerIndex(3); setIsViewerVisible(true); }}>
                    <Image source={{ uri: photos[3].local_uri }} style={styles.galleryImageFull} resizeMode="cover" />
                  </TouchableOpacity>
                </View>`
);

// 4. Add ImageViewerModal at the end
if (!content.includes('<ImageViewerModal')) {
  content = content.replace(
    "</>\n  );\n}",
    `      <ImageViewerModal
        isVisible={isViewerVisible}
        photos={photos}
        initialIndex={initialViewerIndex}
        onClose={() => setIsViewerVisible(false)}
        onPhotoDeleted={(deletedId) => {
          setPhotos(prev => prev.filter(p => p.id !== deletedId));
        }}
      />
    </>
  );
}`
  );
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
