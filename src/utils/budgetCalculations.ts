import { Campaign, PauseWindow } from '../types';
import { differenceInDays, isWithinInterval, eachDayOfInterval, isBefore, startOfDay, addDays } from 'date-fns';

/**
 * Check if a specific date falls within any pause window
 */
export function isDatePaused(date: Date, pauseWindows: PauseWindow[]): boolean {
  const checkDate = startOfDay(date);
  
  return pauseWindows.some(pw => {
    const start = startOfDay(new Date(pw.pause_start_date));
    const end = startOfDay(new Date(pw.pause_end_date));
    return isWithinInterval(checkDate, { start, end });
  });
}

/**
 * Calculate the number of active (non-paused) days in a date range
 */
export function calculateActiveDays(
  startDate: Date,
  endDate: Date,
  pauseWindows: PauseWindow[]
): number {
  const start = startOfDay(new Date(startDate));
  const end = startOfDay(new Date(endDate));
  
  if (isBefore(end, start)) return 0;
  
  const allDays = eachDayOfInterval({ start, end });
  const activeDays = allDays.filter(day => !isDatePaused(day, pauseWindows));
  
  return activeDays.length;
}

/**
 * Calculate the number of paused days in a date range
 */
export function calculatePausedDays(
  startDate: Date,
  endDate: Date,
  pauseWindows: PauseWindow[]
): number {
  const totalDays = differenceInDays(new Date(endDate), new Date(startDate)) + 1;
  const activeDays = calculateActiveDays(startDate, endDate, pauseWindows);
  return totalDays - activeDays;
}

/**
 * Calculate the remaining active days from today until campaign end
 */
export function calculateRemainingActiveDays(
  endDate: Date,
  pauseWindows: PauseWindow[]
): number {
  const today = startOfDay(new Date());
  const end = startOfDay(new Date(endDate));
  
  if (isBefore(end, today)) return 0;
  
  return calculateActiveDays(today, end, pauseWindows);
}

/**
 * Calculate daily budget taking into account pause windows
 * 
 * Logic: Redistributes the total budget over active (non-paused) days
 * Example: 1000 SEK budget, 10 total days, 1 paused day = 1000 / 9 = 111.11 SEK/day
 */
export function calculateDailyBudget(
  totalBudget: number,
  startDate: Date,
  endDate: Date,
  pauseWindows: PauseWindow[]
): number {
  const activeDays = calculateActiveDays(startDate, endDate, pauseWindows);
  
  if (activeDays <= 0) return 0;
  
  return totalBudget / activeDays;
}

/**
 * Calculate the adjusted daily budget based on remaining budget and remaining active days
 * 
 * This is used when a campaign is already running and we want to redistribute
 * the remaining budget over the remaining active days
 */
export function calculateAdjustedDailyBudget(
  totalBudget: number,
  actualSpend: number,
  endDate: Date,
  pauseWindows: PauseWindow[]
): number {
  const remainingBudget = totalBudget - actualSpend;
  const remainingActiveDays = calculateRemainingActiveDays(endDate, pauseWindows);
  
  if (remainingActiveDays <= 0) return 0;
  if (remainingBudget <= 0) return 0;
  
  return remainingBudget / remainingActiveDays;
}

/**
 * Calculate elapsed active days (days the campaign has been running, excluding pauses)
 */
export function calculateElapsedActiveDays(
  startDate: Date,
  pauseWindows: PauseWindow[]
): number {
  const start = startOfDay(new Date(startDate));
  const today = startOfDay(new Date());
  
  if (isBefore(today, start)) return 0;
  
  return calculateActiveDays(start, today, pauseWindows);
}

/**
 * Forecast total spend at campaign end based on current spending rate
 * 
 * Logic: Calculate average daily spend and project to end date
 * Returns forecast data including projected spend and variance
 */
export interface ForecastResult {
  // Projected total spend at campaign end
  projectedSpend: number;
  // Average daily spend based on historical data
  averageDailySpend: number;
  // Variance from budget (positive = overspend, negative = underspend)
  budgetVariance: number;
  // Variance as percentage
  budgetVariancePercent: number;
  // Is forecast exceeding budget?
  isOverrun: boolean;
  // Days until budget is depleted at current rate
  daysUntilDepletion: number | null;
  // Projected end date if budget depletes early
  projectedDepletionDate: Date | null;
  // Remaining active days
  remainingActiveDays: number;
  // Elapsed active days
  elapsedActiveDays: number;
  // Recommended daily budget to stay within total budget
  recommendedDailyBudget: number;
}

export function forecastTotalSpend(
  campaign: Campaign,
  pauseWindows: PauseWindow[]
): ForecastResult {
  const startDate = new Date(campaign.start_date);
  const endDate = new Date(campaign.end_date);
  const today = startOfDay(new Date());
  
  // Calculate elapsed and remaining active days
  const elapsedActiveDays = calculateElapsedActiveDays(startDate, pauseWindows);
  const remainingActiveDays = calculateRemainingActiveDays(endDate, pauseWindows);
  
  // Calculate average daily spend
  const averageDailySpend = elapsedActiveDays > 0 
    ? campaign.actual_spend / elapsedActiveDays 
    : campaign.daily_budget;
  
  // Project total spend at campaign end
  const projectedSpend = campaign.actual_spend + (averageDailySpend * remainingActiveDays);
  
  // Calculate variance
  const budgetVariance = projectedSpend - campaign.total_budget;
  const budgetVariancePercent = campaign.total_budget > 0 
    ? (budgetVariance / campaign.total_budget) * 100 
    : 0;
  
  // Check for overrun
  const isOverrun = projectedSpend > campaign.total_budget;
  
  // Calculate days until budget depletion
  const remainingBudget = campaign.total_budget - campaign.actual_spend;
  let daysUntilDepletion: number | null = null;
  let projectedDepletionDate: Date | null = null;
  
  if (averageDailySpend > 0 && remainingBudget > 0) {
    daysUntilDepletion = Math.ceil(remainingBudget / averageDailySpend);
    
    // Calculate actual depletion date accounting for pause windows
    let daysCount = 0;
    let checkDate = today;
    while (daysCount < daysUntilDepletion && isBefore(checkDate, addDays(endDate, 365))) {
      if (!isDatePaused(checkDate, pauseWindows)) {
        daysCount++;
      }
      checkDate = addDays(checkDate, 1);
    }
    
    if (isBefore(checkDate, endDate)) {
      projectedDepletionDate = checkDate;
    }
  }
  
  // Calculate recommended daily budget to stay within total budget
  const recommendedDailyBudget = remainingActiveDays > 0 
    ? remainingBudget / remainingActiveDays 
    : 0;
  
  return {
    projectedSpend,
    averageDailySpend,
    budgetVariance,
    budgetVariancePercent,
    isOverrun,
    daysUntilDepletion,
    projectedDepletionDate,
    remainingActiveDays,
    elapsedActiveDays,
    recommendedDailyBudget,
  };
}

/**
 * Simulate budget changes and return projected outcomes
 */
export interface SimulationInput {
  campaign: Campaign;
  pauseWindows: PauseWindow[];
  // Simulation parameters
  newTotalBudget?: number;
  newDailyBudget?: number;
  additionalPauseWindows?: Omit<PauseWindow, 'window_id' | 'created_at' | 'updated_at'>[];
  removePauseWindowIds?: string[];
}

export interface SimulationOutput {
  // Original values
  original: {
    dailyBudget: number;
    projectedSpend: number;
    budgetVariance: number;
    activeDays: number;
  };
  // Simulated values
  simulated: {
    dailyBudget: number;
    projectedSpend: number;
    budgetVariance: number;
    activeDays: number;
  };
  // Comparison
  comparison: {
    dailyBudgetChange: number;
    dailyBudgetChangePercent: number;
    projectedSpendChange: number;
    projectedSpendChangePercent: number;
    activeDaysChange: number;
  };
  // Recommendations
  recommendation: string;
  warnings: string[];
}

export function runBudgetSimulation(input: SimulationInput): SimulationOutput {
  const { campaign, pauseWindows, newTotalBudget, newDailyBudget, additionalPauseWindows, removePauseWindowIds } = input;
  
  const startDate = new Date(campaign.start_date);
  const endDate = new Date(campaign.end_date);
  
  // Calculate original values
  const originalActiveDays = calculateActiveDays(startDate, endDate, pauseWindows);
  const originalDailyBudget = calculateDailyBudget(campaign.total_budget, startDate, endDate, pauseWindows);
  const originalForecast = forecastTotalSpend(campaign, pauseWindows);
  
  // Build simulated pause windows
  let simulatedPauseWindows = [...pauseWindows];
  
  if (removePauseWindowIds && removePauseWindowIds.length > 0) {
    simulatedPauseWindows = simulatedPauseWindows.filter(
      pw => !removePauseWindowIds.includes(pw.window_id)
    );
  }
  
  if (additionalPauseWindows && additionalPauseWindows.length > 0) {
    const newWindows: PauseWindow[] = additionalPauseWindows.map((pw, index) => ({
      ...pw,
      window_id: `sim-${index}`,
      created_at: new Date(),
      updated_at: new Date(),
    }));
    simulatedPauseWindows = [...simulatedPauseWindows, ...newWindows];
  }
  
  // Calculate simulated values
  const simulatedTotalBudget = newTotalBudget ?? campaign.total_budget;
  const simulatedActiveDays = calculateActiveDays(startDate, endDate, simulatedPauseWindows);
  
  // If a new daily budget is specified, use it; otherwise calculate based on budget and active days
  const simulatedDailyBudget = newDailyBudget ?? calculateDailyBudget(
    simulatedTotalBudget,
    startDate,
    endDate,
    simulatedPauseWindows
  );
  
  // Create a simulated campaign for forecasting
  const simulatedCampaign: Campaign = {
    ...campaign,
    total_budget: simulatedTotalBudget,
    daily_budget: simulatedDailyBudget,
  };
  
  const simulatedForecast = forecastTotalSpend(simulatedCampaign, simulatedPauseWindows);
  
  // Calculate comparison
  const dailyBudgetChange = simulatedDailyBudget - originalDailyBudget;
  const dailyBudgetChangePercent = originalDailyBudget > 0 
    ? (dailyBudgetChange / originalDailyBudget) * 100 
    : 0;
  
  const projectedSpendChange = simulatedForecast.projectedSpend - originalForecast.projectedSpend;
  const projectedSpendChangePercent = originalForecast.projectedSpend > 0 
    ? (projectedSpendChange / originalForecast.projectedSpend) * 100 
    : 0;
  
  const activeDaysChange = simulatedActiveDays - originalActiveDays;
  
  // Generate recommendations and warnings
  const warnings: string[] = [];
  let recommendation = '';
  
  if (simulatedForecast.isOverrun) {
    warnings.push(`Varning: Prognos överskrider budget med ${Math.abs(simulatedForecast.budgetVariance).toFixed(0)}`);
  }
  
  if (simulatedDailyBudget > campaign.daily_budget * 1.5) {
    warnings.push('Varning: Daglig budget ökar med mer än 50%');
  }
  
  if (simulatedActiveDays < 7) {
    warnings.push('Varning: Färre än 7 aktiva dagar kvar');
  }
  
  if (dailyBudgetChange > 0 && !simulatedForecast.isOverrun) {
    recommendation = 'Ökningen av daglig budget är hållbar inom budgetramen.';
  } else if (dailyBudgetChange < 0) {
    recommendation = `Minskning av daglig budget sparar uppskattningsvis ${Math.abs(projectedSpendChange).toFixed(0)}.`;
  } else if (simulatedForecast.isOverrun) {
    recommendation = `Rekommenderad daglig budget för att hålla budgeten: ${simulatedForecast.recommendedDailyBudget.toFixed(0)}`;
  } else {
    recommendation = 'Simuleringen visar ett hållbart scenario.';
  }
  
  return {
    original: {
      dailyBudget: originalDailyBudget,
      projectedSpend: originalForecast.projectedSpend,
      budgetVariance: originalForecast.budgetVariance,
      activeDays: originalActiveDays,
    },
    simulated: {
      dailyBudget: simulatedDailyBudget,
      projectedSpend: simulatedForecast.projectedSpend,
      budgetVariance: simulatedForecast.budgetVariance,
      activeDays: simulatedActiveDays,
    },
    comparison: {
      dailyBudgetChange,
      dailyBudgetChangePercent,
      projectedSpendChange,
      projectedSpendChangePercent,
      activeDaysChange,
    },
    recommendation,
    warnings,
  };
}

/**
 * Check if a campaign should trigger alerts based on budget utilization and forecast
 */
export interface AlertCheck {
  shouldTriggerUtilizationWarning: boolean;
  shouldTriggerUtilizationCritical: boolean;
  shouldTriggerForecastOverrun: boolean;
  utilizationPercent: number;
  forecastVariancePercent: number;
  messages: string[];
}

export function checkCampaignAlerts(
  campaign: Campaign,
  pauseWindows: PauseWindow[]
): AlertCheck {
  const utilizationPercent = campaign.total_budget > 0 
    ? (campaign.actual_spend / campaign.total_budget) * 100 
    : 0;
  
  const forecast = forecastTotalSpend(campaign, pauseWindows);
  const forecastVariancePercent = forecast.budgetVariancePercent;
  
  const shouldTriggerUtilizationWarning = utilizationPercent >= 90 && utilizationPercent < 95;
  const shouldTriggerUtilizationCritical = utilizationPercent >= 95;
  const shouldTriggerForecastOverrun = forecast.isOverrun && forecastVariancePercent > 5;
  
  const messages: string[] = [];
  
  if (shouldTriggerUtilizationCritical) {
    messages.push(`Kritisk: Budget-utnyttjande har nått ${utilizationPercent.toFixed(1)}%`);
  } else if (shouldTriggerUtilizationWarning) {
    messages.push(`Varning: Budget-utnyttjande har nått ${utilizationPercent.toFixed(1)}%`);
  }
  
  if (shouldTriggerForecastOverrun) {
    messages.push(`Prognos-varning: Förväntad överskridning med ${forecastVariancePercent.toFixed(1)}%`);
  }
  
  return {
    shouldTriggerUtilizationWarning,
    shouldTriggerUtilizationCritical,
    shouldTriggerForecastOverrun,
    utilizationPercent,
    forecastVariancePercent,
    messages,
  };
}

