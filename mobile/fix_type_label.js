const fs = require('fs');
const filePath = 'c:/Users/cris7/OneDrive/Desktop/Threshold/mobile/app/subjects/[subjectId].tsx';
let content = fs.readFileSync(filePath, 'utf8');

// I'll just re-add the typeLabel definition right before where I use it in the replacement block.
content = content.replace(
  /const weightValue = parseWeight\(assessment\);/,
  `const typeLabel = assessment.type === 'task' 
                  ? t('dashboard.quickAddMenu.newTask') 
                  : t('subjects.note');
                const weightValue = parseWeight(assessment);`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
