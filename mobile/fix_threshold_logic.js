const fs = require('fs');
const filePath = 'c:/Users/cris7/OneDrive/Desktop/Threshold/mobile/app/subjects/[subjectId].tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix getAssessmentProgress
content = content.replace(
  /const getAssessmentProgress = \(assessment: Assessment\) => \{[\s\S]*?return 0;\n\};/,
  `const getAssessmentProgress = (assessment: Assessment) => {
  if (typeof assessment.score === 'number' && typeof assessment.out_of === 'number' && assessment.out_of > 0) {
    return (assessment.score / assessment.out_of) * 100;
  }
  if (typeof assessment.grade_value === 'number') return (assessment.grade_value / SCALE_MAX) * 100;
  if (assessment.type === 'task' && assessment.is_completed) return 100;
  return 0;
};`
);

// 2. Fix securedPercent to be relative to SCALE_MAX
content = content.replace(
  /const securedPercent = useMemo\(\(\) => \{\n\s*return Math\.max\(0, Math\.min\(100, evaluatedPercentage\)\);\n\s*\}, \[evaluatedPercentage\]\);/,
  `const securedPercent = useMemo(() => {
    return Math.max(0, Math.min(100, (accumulatedPoints / SCALE_MAX) * 100));
  }, [accumulatedPoints]);`
);

// 3. Fix the insight item rendering logic for scoreText and weightText
// We will replace everything from `const scoreText = ` to `</Text>`
content = content.replace(
  /const scoreText = typeof assessment\.grade_value === 'number'[\s\S]*?\{typeLabel\}\{weightText\}\{assessment\.date \? ` · \$\{assessment\.date\}` : ''\}\n\s*<\/Text>/m,
  `const weightValue = parseWeight(assessment);
                const weightText = weightValue > 0 ? \` (\${weightValue}%)\` : '';

                let scoreText = t('subjects.pending');
                if (grade !== null) {
                  scoreText = \`\${formatGrade(grade)} / \${SCALE_MAX}\`;
                } else if (assessment.type === 'task') {
                  scoreText = assessment.is_completed ? (t('common.done') || 'Completado') : t('subjects.pending');
                }

                return (
                  <View key={\`\${assessment.id ?? assessment.name}-\${assessment.date ?? 'no-date'}\`} style={styles.insightRow}>
                    <View style={styles.insightTopRow}>
                      <View style={styles.insightTextBlock}>
                        <Text style={styles.insightTitle} numberOfLines={1}>{assessment.name}</Text>
                        <Text style={styles.insightMeta} numberOfLines={1}>
                          {typeLabel}{weightText}{assessment.date ? \` · \${assessment.date}\` : ''}
                        </Text>`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
