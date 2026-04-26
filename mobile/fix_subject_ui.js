const fs = require('fs');
const filePath = 'c:/Users/cris7/OneDrive/Desktop/Threshold/mobile/app/subjects/[subjectId].tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Increase limit of recent assessments
content = content.replace(
  /\.slice\(0,\s*5\);/,
  ".slice(0, 15);"
);

// 2. Fix threshold card layout
content = content.replace(
  /<View style={styles\.thresholdHeader}>\s*<View>\s*<Text style={styles\.thresholdTitle}>/g,
  '<View style={styles.thresholdHeader}>\n            <View style={{ flex: 1 }}>\n              <Text style={styles.thresholdTitle}>'
);

// 3. Internationalize analysis labels and add weight/date
// We target the return block inside assessments.map
content = content.replace(
  /return \(\s*<View key=\{`\$\{assessment\.id \?\? assessment\.name\}-\$\{assessment\.date \?\? 'no-date'\}`\} style=\{styles\.insightRow\}>[\s\S]*?<\/View>\s*\);/g,
  (match) => {
    // Inject the labels logic
    return `const typeLabel = assessment.type === 'task' 
                  ? t('dashboard.quickAddMenu.newTask') 
                  : t('subjects.note');
                const weightText = assessment.percentage ? \` (\${assessment.percentage}%)\` : '';

                return (
                  <View key={\`\${assessment.id ?? assessment.name}-\${assessment.date ?? 'no-date'}\`} style={styles.insightRow}>
                    <View style={styles.insightTopRow}>
                      <View style={styles.insightTextBlock}>
                        <Text style={styles.insightTitle} numberOfLines={1}>{assessment.name}</Text>
                        <Text style={styles.insightMeta} numberOfLines={1}>
                          {typeLabel}{weightText}{assessment.date ? \` · \${assessment.date}\` : ''}
                        </Text>
                      </View>
                      <Text style={styles.insightScore}>{scoreText}</Text>
                    </View>
                    <ProgressBar value={progress} color={progress >= 80 ? '#34C759' : progress >= 60 ? '#FF9500' : '#FF3B30'} />
                  </View>
                );`
  }
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
