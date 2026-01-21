// Currency types supported by the system
export type Currency = 'SEK' | 'EUR' | 'USD';

// Channel/Platform types
export type ChannelName = 'Google Ads' | 'LinkedIn' | 'Meta Ads';

// Campaign status - lowercase for consistency
export type CampaignStatus = 'active' | 'paused' | 'stopped';

// Alert severity levels
export type AlertSeverity = 'warning' | 'critical' | 'info';

// Customer entity
export interface Customer {
  customer_id: string;
  name: string;
  currency: Currency;
  created_at: Date;
  updated_at: Date;
}

// Channel entity
export interface Channel {
  channel_id: string;
  name: ChannelName;
  customer_id: string;
  created_at: Date;
  updated_at: Date;
}

// Campaign Group entity
export interface CampaignGroup {
  group_id: string;
  name: string;
  channel_id: string;
  created_at: Date;
  updated_at: Date;
}

// Campaign entity
export interface Campaign {
  campaign_id: string;
  group_id: string;
  name: string;
  start_date: Date;
  end_date: Date;
  total_budget: number;
  daily_budget: number;
  actual_spend: number;
  status: CampaignStatus;
  created_at: Date;
  updated_at: Date;
}

// Pause Window entity
export interface PauseWindow {
  window_id: string;
  campaign_id: string;
  pause_start_date: Date;
  pause_end_date: Date;
  created_at: Date;
  updated_at: Date;
}

// Alert entity
export interface Alert {
  alert_id: string;
  campaign_id: string;
  type: AlertSeverity;
  message: string;
  threshold: number;
  current_value: number;
  is_read: boolean;
  created_at: Date;
}

// User entity for authentication
export interface User {
  user_id: string;
  email: string;
  name: string;
  role: 'admin' | 'viewer';
  created_at: Date;
}

// Auth state
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

// Dashboard filter state
export interface DashboardFilters {
  customer_id: string | null;
  channel_id: string | null;
  status: CampaignStatus | null;
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
}

// Budget utilization metrics
export interface BudgetMetrics {
  totalBudget: number;
  totalSpend: number;
  utilization: number;
  remainingBudget: number;
  projectedSpend: number;
  daysRemaining: number;
  dailyBurnRate: number;
}

// Simulation parameters
export interface SimulationParams {
  adjustedDailyBudget: number;
  pauseDays: number;
  additionalBudget: number;
}

// Simulation result
export interface SimulationResult {
  originalEndSpend: number;
  simulatedEndSpend: number;
  originalEndDate: Date;
  simulatedEndDate: Date;
  savingsOrOverspend: number;
  recommendation: string;
}

// Expanded campaign with related data
export interface ExpandedCampaign extends Campaign {
  customer: Customer;
  channel: Channel;
  campaignGroup: CampaignGroup;
  pauseWindows: PauseWindow[];
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Pagination params
export interface PaginationParams {
  page: number;
  limit: number;
}

// Paginated response
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}
