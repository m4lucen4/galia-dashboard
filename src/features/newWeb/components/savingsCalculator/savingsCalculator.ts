export interface SavingsInputs {
  postsPerMonth: number;
  minutesPerPost: number;
  hourlyRateEuros: number;
}

export const REVIEW_MINUTES_PER_POST = 15;
export const DEFAULT_SAVINGS_INPUTS: Readonly<SavingsInputs> = {
  postsPerMonth: 15,
  minutesPerPost: 45,
  hourlyRateEuros: 45,
};

export const SAVINGS_RANGES = {
  postsPerMonth: { min: 1, max: 60, step: 1 },
  minutesPerPost: { min: 0, max: 120, step: 1 },
  hourlyRateEuros: { min: 5, max: 50, step: 1 },
} as const;

export function calculateSavings({ postsPerMonth, minutesPerPost, hourlyRateEuros }: SavingsInputs) {
  const savedMinutes = postsPerMonth * Math.max(minutesPerPost - REVIEW_MINUTES_PER_POST, 0);
  return {
    baselineHours: postsPerMonth * minutesPerPost / 60,
    savedMinutes,
    savedHours: savedMinutes / 60,
    monetaryCents: Math.round(savedMinutes * hourlyRateEuros * 100 / 60),
  };
}
