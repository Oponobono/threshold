import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Assessment, Subject, UserProfile } from '../services/api';
import {
  parseDate,
  parseWeight,
  normalizeGrade,
  formatGrade,
  SCALE_MAX,
} from '../utils/grades';

export function useSubjectGrades(
  assessments: Assessment[],
  selectedSubject: Subject | null,
  profile: UserProfile | null
) {
  const { t } = useTranslation();

  const gradedAssessments = useMemo(
    () => assessments.filter((assessment) => assessment.is_completed || normalizeGrade(assessment) !== null),
    [assessments],
  );

  // 1. Porcentaje Evaluado (Pe)
  const evaluatedPercentage = useMemo(
    () => gradedAssessments.reduce((sum, assessment) => sum + parseWeight(assessment), 0),
    [gradedAssessments],
  );

  // 3. Puntos Acumulados (Pts)
  const accumulatedPoints = useMemo(
    () => gradedAssessments.reduce((sum, assessment) => {
      const grade = normalizeGrade(assessment) || 0;
      const weight = parseWeight(assessment) || 0;
      return sum + (grade * (weight / 100));
    }, 0),
    [gradedAssessments],
  );

  // 2. Promedio Actual (A_actual)
  const averageGrade = useMemo(() => {
    if (evaluatedPercentage === 0) return 0;
    return accumulatedPoints / (evaluatedPercentage / 100);
  }, [accumulatedPoints, evaluatedPercentage]);

  // 4. Nota Necesaria (N_necesaria)
  const targetGrade = useMemo(() => {
    const subjectTarget = selectedSubject?.target_grade;
    if (typeof subjectTarget === 'number' && subjectTarget > 0) return subjectTarget;

    const fallbackThreshold = profile?.approval_threshold;
    if (typeof fallbackThreshold === 'number' && fallbackThreshold > 0) {
      return fallbackThreshold > SCALE_MAX ? fallbackThreshold / 20 : fallbackThreshold;
    }

    return 3.0; // Fallback a 3.0
  }, [profile?.approval_threshold, selectedSubject?.target_grade]);

  const remainingPercentage = useMemo(() => Math.max(100 - evaluatedPercentage, 0), [evaluatedPercentage]);

  const requiredGrade = useMemo(() => {
    if (remainingPercentage <= 0) return null;
    const missingPoints = targetGrade - accumulatedPoints;
    return missingPoints / (remainingPercentage / 100);
  }, [targetGrade, accumulatedPoints, remainingPercentage]);

  const projectedGrade = useMemo(() => averageGrade, [averageGrade]);

  const securedPercent = useMemo(() => {
    return Math.max(0, Math.min(100, evaluatedPercentage));
  }, [evaluatedPercentage]);

  const deliveredText = `${gradedAssessments.length} / ${Math.max(assessments.length, gradedAssessments.length)}`;
  
  const finalNeededText = useMemo(() => {
    if (requiredGrade === null || remainingPercentage === 0) {
      if (accumulatedPoints >= targetGrade) return t('subjects.thresholdPassed');
      return t('subjects.thresholdNoMoreEvaluations', { grade: formatGrade(accumulatedPoints) });
    }
    
    if (requiredGrade > SCALE_MAX) {
      return t('subjects.thresholdDanger', { max: SCALE_MAX, required: formatGrade(requiredGrade), remaining: remainingPercentage });
    }
    
    if (requiredGrade <= 0) {
      return t('subjects.thresholdSecured');
    }

    return t('subjects.thresholdNeed', { required: formatGrade(requiredGrade), remaining: remainingPercentage, target: targetGrade });
  }, [requiredGrade, remainingPercentage, accumulatedPoints, targetGrade, t]);

  const recentAssessments = useMemo(() => {
    return [...assessments]
      .sort((a, b) => parseDate(b.date) - parseDate(a.date))
      .slice(0, 15);
  }, [assessments]);

  return {
    evaluatedPercentage,
    accumulatedPoints,
    averageGrade,
    targetGrade,
    remainingPercentage,
    requiredGrade,
    projectedGrade,
    securedPercent,
    deliveredText,
    finalNeededText,
    recentAssessments,
  };
}
