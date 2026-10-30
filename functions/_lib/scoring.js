/**
 * Scoring & Competition Logic
 */

export const COMPETITION_THRESHOLDS = [
  { max: 2, label: "Sangat Rendah", class: "comp-very-low", color: "green", scoreWeight: 100 },
  { max: 5, label: "Rendah", class: "comp-low", color: "teal", scoreWeight: 80 },
  { max: 10, label: "Sedang", class: "comp-medium", color: "yellow", scoreWeight: 50 },
  { max: 20, label: "Tinggi", class: "comp-high", color: "orange", scoreWeight: 25 },
  { max: Infinity, label: "Sangat Tinggi", class: "comp-very-high", color: "red", scoreWeight: 10 },
];

export function calculateApplicantsPerSlot(applicants = 0, quota = 1) {
  const q = Math.max(1, quota || 1);
  return Number(((applicants || 0) / q).toFixed(1));
}

export function getCompetitionCategory(ratio) {
  for (const t of COMPETITION_THRESHOLDS) {
    if (ratio <= t.max) {
      return {
        label: t.label,
        class: t.class,
        color: t.color,
        ratio,
        weight: t.scoreWeight,
      };
    }
  }
  return COMPETITION_THRESHOLDS[COMPETITION_THRESHOLDS.length - 1];
}

export function calculatePriorityScore(matchScore = 0, competitionWeight = 50, quota = 1, publishedAt = null) {
  // Priority: Match (55%) + Competition (30%) + Quota (10%) + Freshness (5%)
  const matchPart = (matchScore || 0) * 0.55;
  const compPart = competitionWeight * 0.30;
  const quotaPart = Math.min(100, (quota || 1) * 20) * 0.10;

  let freshnessPart = 50; // default 50% of 5
  if (publishedAt) {
    const ageDays = (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays <= 3) freshnessPart = 100;
    else if (ageDays <= 7) freshnessPart = 80;
    else if (ageDays <= 14) freshnessPart = 50;
    else freshnessPart = 20;
  }

  return Math.round(matchPart + compPart + quotaPart + (freshnessPart * 0.05));
}

export function isHiddenGem(isEligible, matchScore, applicantsPerSlot, quota) {
  return (
    isEligible === true &&
    (matchScore || 0) >= 70 &&
    (applicantsPerSlot || 0) <= 5.0 &&
    (quota || 0) > 0
  );
}
