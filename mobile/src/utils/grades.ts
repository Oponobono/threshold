import { Assessment } from '../services/api';

export const SCALE_MAX = 5;

export const parseDate = (value?: string | null) => {
  if (!value) return 0;
  const parts = value.split(/[-/]/).map(Number);
  if (parts.length === 3 && parts.every((part) => Number.isFinite(part))) {
    const [first, second, third] = parts;
    const isDdMmYyyy = first > 12 || second > 12;
    const day = isDdMmYyyy ? first : third;
    const month = isDdMmYyyy ? second : first;
    const year = isDdMmYyyy ? third : second;
    const candidate = new Date(year, month - 1, day);
    if (!Number.isNaN(candidate.getTime())) return candidate.getTime();
  }

  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? 0 : fallback.getTime();
};

export const parseWeight = (assessment: Assessment) => {
  if (typeof assessment.percentage === 'number') return assessment.percentage;
  if (!assessment.weight) return 0;
  const cleaned = assessment.weight.replace('%', '').trim();
  const numeric = Number(cleaned);
  if (!Number.isFinite(numeric)) return 0;
  if (numeric <= 1) return numeric * 100;
  return numeric;
};

export const normalizeGrade = (assessment: Assessment) => {
  if (typeof assessment.grade_value === 'number') return assessment.grade_value;
  if (typeof assessment.score === 'number' && typeof assessment.out_of === 'number' && assessment.out_of > 0) {
    return (assessment.score / assessment.out_of) * SCALE_MAX;
  }
  return null;
};

export const getAssessmentProgress = (assessment: Assessment) => {
  if (typeof assessment.score === 'number' && typeof assessment.out_of === 'number' && assessment.out_of > 0) {
    return (assessment.score / assessment.out_of) * 100;
  }
  if (typeof assessment.grade_value === 'number') return (assessment.grade_value / SCALE_MAX) * 100;
  return 0;
};

export const formatGrade = (value: number) => value.toFixed(1);
