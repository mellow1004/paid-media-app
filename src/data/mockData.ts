import type { Customer, Channel, CampaignGroup, Campaign, PauseWindow, User, Alert } from '../types';

// =============================================================================
// MOCK USERS
// =============================================================================

export const mockUsers: User[] = [
  {
    user_id: 'user-001',
    email: 'admin@brightvision.se',
    name: 'Anna Lindqvist',
    role: 'admin',
    created_at: new Date('2024-01-15'),
  },
  {
    user_id: 'user-002',
    email: 'viewer@brightvision.se',
    name: 'Erik Johansson',
    role: 'viewer',
    created_at: new Date('2024-02-20'),
  },
];

// User passwords (in a real app, these would be hashed)
export const mockUserPasswords: Record<string, string> = {
  'admin@brightvision.se': 'admin123',
  'viewer@brightvision.se': 'viewer123',
};

// =============================================================================
// MOCK CUSTOMERS
// =============================================================================

export const mockCustomers: Customer[] = [
  {
    customer_id: 'cust-001',
    name: 'TechNova AB',
    currency: 'SEK',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
  {
    customer_id: 'cust-002',
    name: 'EuroTrade GmbH',
    currency: 'EUR',
    created_at: new Date('2024-02-15'),
    updated_at: new Date('2024-02-15'),
  },
  {
    customer_id: 'cust-003',
    name: 'GlobalConnect Inc',
    currency: 'USD',
    created_at: new Date('2024-03-01'),
    updated_at: new Date('2024-03-01'),
  },
  {
    customer_id: 'cust-004',
    name: 'Nordic Solutions AB',
    currency: 'SEK',
    created_at: new Date('2024-03-20'),
    updated_at: new Date('2024-03-20'),
  },
];

// =============================================================================
// MOCK CHANNELS
// =============================================================================

export const mockChannels: Channel[] = [
  // TechNova AB channels
  {
    channel_id: 'chan-001',
    name: 'Google Ads',
    customer_id: 'cust-001',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
  {
    channel_id: 'chan-002',
    name: 'LinkedIn',
    customer_id: 'cust-001',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
  {
    channel_id: 'chan-003',
    name: 'Meta Ads',
    customer_id: 'cust-001',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
  // EuroTrade GmbH channels
  {
    channel_id: 'chan-004',
    name: 'Google Ads',
    customer_id: 'cust-002',
    created_at: new Date('2024-02-15'),
    updated_at: new Date('2024-02-15'),
  },
  {
    channel_id: 'chan-005',
    name: 'LinkedIn',
    customer_id: 'cust-002',
    created_at: new Date('2024-02-15'),
    updated_at: new Date('2024-02-15'),
  },
  // GlobalConnect Inc channels
  {
    channel_id: 'chan-006',
    name: 'Google Ads',
    customer_id: 'cust-003',
    created_at: new Date('2024-03-01'),
    updated_at: new Date('2024-03-01'),
  },
  {
    channel_id: 'chan-007',
    name: 'Meta Ads',
    customer_id: 'cust-003',
    created_at: new Date('2024-03-01'),
    updated_at: new Date('2024-03-01'),
  },
  // Nordic Solutions AB channels
  {
    channel_id: 'chan-008',
    name: 'Google Ads',
    customer_id: 'cust-004',
    created_at: new Date('2024-03-20'),
    updated_at: new Date('2024-03-20'),
  },
  {
    channel_id: 'chan-009',
    name: 'LinkedIn',
    customer_id: 'cust-004',
    created_at: new Date('2024-03-20'),
    updated_at: new Date('2024-03-20'),
  },
  {
    channel_id: 'chan-010',
    name: 'Meta Ads',
    customer_id: 'cust-004',
    created_at: new Date('2024-03-20'),
    updated_at: new Date('2024-03-20'),
  },
];

// =============================================================================
// MOCK CAMPAIGN GROUPS
// =============================================================================

export const mockCampaignGroups: CampaignGroup[] = [
  // TechNova AB - Google
  {
    group_id: 'grp-001',
    name: 'Brand Awareness Q4',
    channel_id: 'chan-001',
    created_at: new Date('2024-10-01'),
    updated_at: new Date('2024-10-01'),
  },
  {
    group_id: 'grp-002',
    name: 'Lead Generation',
    channel_id: 'chan-001',
    created_at: new Date('2024-09-01'),
    updated_at: new Date('2024-09-01'),
  },
  // TechNova AB - LinkedIn
  {
    group_id: 'grp-003',
    name: 'B2B Outreach',
    channel_id: 'chan-002',
    created_at: new Date('2024-10-15'),
    updated_at: new Date('2024-10-15'),
  },
  // TechNova AB - Meta
  {
    group_id: 'grp-004',
    name: 'Retargeting',
    channel_id: 'chan-003',
    created_at: new Date('2024-11-01'),
    updated_at: new Date('2024-11-01'),
  },
  // EuroTrade GmbH - Google
  {
    group_id: 'grp-005',
    name: 'DACH Market Expansion',
    channel_id: 'chan-004',
    created_at: new Date('2024-09-01'),
    updated_at: new Date('2024-09-01'),
  },
  // EuroTrade GmbH - LinkedIn
  {
    group_id: 'grp-006',
    name: 'Enterprise Sales',
    channel_id: 'chan-005',
    created_at: new Date('2024-10-01'),
    updated_at: new Date('2024-10-01'),
  },
  // GlobalConnect Inc - Google
  {
    group_id: 'grp-007',
    name: 'US Market Launch',
    channel_id: 'chan-006',
    created_at: new Date('2024-08-01'),
    updated_at: new Date('2024-08-01'),
  },
  // GlobalConnect Inc - Meta
  {
    group_id: 'grp-008',
    name: 'Social Engagement',
    channel_id: 'chan-007',
    created_at: new Date('2024-09-15'),
    updated_at: new Date('2024-09-15'),
  },
  // Nordic Solutions AB - Google
  {
    group_id: 'grp-009',
    name: 'Product Launch 2024',
    channel_id: 'chan-008',
    created_at: new Date('2024-11-01'),
    updated_at: new Date('2024-11-01'),
  },
  // Nordic Solutions AB - LinkedIn
  {
    group_id: 'grp-010',
    name: 'Thought Leadership',
    channel_id: 'chan-009',
    created_at: new Date('2024-10-01'),
    updated_at: new Date('2024-10-01'),
  },
];

// =============================================================================
// MOCK CAMPAIGNS
// =============================================================================

export const mockCampaigns: Campaign[] = [
  // TechNova AB campaigns
  {
    campaign_id: 'camp-001',
    group_id: 'grp-001',
    name: 'Brand Search - Sweden',
    start_date: new Date('2024-10-01'),
    end_date: new Date('2024-12-31'),
    total_budget: 150000,
    daily_budget: 1630,
    actual_spend: 142500, // 95% - should trigger critical alert
    status: 'active',
    created_at: new Date('2024-10-01'),
    updated_at: new Date('2024-12-15'),
  },
  {
    campaign_id: 'camp-002',
    group_id: 'grp-001',
    name: 'Display - Nordic',
    start_date: new Date('2024-10-15'),
    end_date: new Date('2024-12-31'),
    total_budget: 80000,
    daily_budget: 1026,
    actual_spend: 62400, // 78%
    status: 'active',
    created_at: new Date('2024-10-15'),
    updated_at: new Date('2024-12-15'),
  },
  {
    campaign_id: 'camp-003',
    group_id: 'grp-002',
    name: 'Search - Lead Gen',
    start_date: new Date('2024-09-01'),
    end_date: new Date('2024-12-31'),
    total_budget: 200000,
    daily_budget: 1639,
    actual_spend: 184000, // 92% - should trigger warning alert
    status: 'active',
    created_at: new Date('2024-09-01'),
    updated_at: new Date('2024-12-15'),
  },
  {
    campaign_id: 'camp-004',
    group_id: 'grp-003',
    name: 'Sponsored Content - Tech',
    start_date: new Date('2024-10-15'),
    end_date: new Date('2025-01-31'),
    total_budget: 120000,
    daily_budget: 1132,
    actual_spend: 69600, // 58%
    status: 'active',
    created_at: new Date('2024-10-15'),
    updated_at: new Date('2024-12-15'),
  },
  {
    campaign_id: 'camp-005',
    group_id: 'grp-004',
    name: 'Retargeting - Website Visitors',
    start_date: new Date('2024-11-01'),
    end_date: new Date('2024-12-31'),
    total_budget: 50000,
    daily_budget: 820,
    actual_spend: 36500, // 73%
    status: 'paused',
    created_at: new Date('2024-11-01'),
    updated_at: new Date('2024-12-10'),
  },
  // EuroTrade GmbH campaigns
  {
    campaign_id: 'camp-006',
    group_id: 'grp-005',
    name: 'Search - Germany',
    start_date: new Date('2024-09-01'),
    end_date: new Date('2024-12-31'),
    total_budget: 75000,
    daily_budget: 614,
    actual_spend: 67500, // 90% - edge case
    status: 'active',
    created_at: new Date('2024-09-01'),
    updated_at: new Date('2024-12-15'),
  },
  {
    campaign_id: 'camp-007',
    group_id: 'grp-005',
    name: 'Search - Austria',
    start_date: new Date('2024-10-01'),
    end_date: new Date('2024-12-31'),
    total_budget: 45000,
    daily_budget: 489,
    actual_spend: 38250, // 85%
    status: 'active',
    created_at: new Date('2024-10-01'),
    updated_at: new Date('2024-12-15'),
  },
  {
    campaign_id: 'camp-008',
    group_id: 'grp-006',
    name: 'InMail - Enterprise',
    start_date: new Date('2024-10-01'),
    end_date: new Date('2025-03-31'),
    total_budget: 100000,
    daily_budget: 549,
    actual_spend: 42000, // 42%
    status: 'active',
    created_at: new Date('2024-10-01'),
    updated_at: new Date('2024-12-15'),
  },
  // GlobalConnect Inc campaigns
  {
    campaign_id: 'camp-009',
    group_id: 'grp-007',
    name: 'US Search - Brand',
    start_date: new Date('2024-08-01'),
    end_date: new Date('2025-01-31'),
    total_budget: 250000,
    daily_budget: 1366,
    actual_spend: 186250, // 74.5%
    status: 'active',
    created_at: new Date('2024-08-01'),
    updated_at: new Date('2024-12-15'),
  },
  {
    campaign_id: 'camp-010',
    group_id: 'grp-007',
    name: 'US Search - Product',
    start_date: new Date('2024-09-01'),
    end_date: new Date('2025-02-28'),
    total_budget: 180000,
    daily_budget: 1000,
    actual_spend: 106200, // 59%
    status: 'active',
    created_at: new Date('2024-09-01'),
    updated_at: new Date('2024-12-15'),
  },
  {
    campaign_id: 'camp-011',
    group_id: 'grp-008',
    name: 'Instagram - Awareness',
    start_date: new Date('2024-09-15'),
    end_date: new Date('2024-12-31'),
    total_budget: 60000,
    daily_budget: 561,
    actual_spend: 54600, // 91% - warning
    status: 'active',
    created_at: new Date('2024-09-15'),
    updated_at: new Date('2024-12-15'),
  },
  {
    campaign_id: 'camp-012',
    group_id: 'grp-008',
    name: 'Facebook - Retargeting',
    start_date: new Date('2024-10-01'),
    end_date: new Date('2024-12-31'),
    total_budget: 40000,
    daily_budget: 435,
    actual_spend: 28800, // 72%
    status: 'stopped',
    created_at: new Date('2024-10-01'),
    updated_at: new Date('2024-11-30'),
  },
  // Nordic Solutions AB campaigns
  {
    campaign_id: 'camp-013',
    group_id: 'grp-009',
    name: 'Product Launch - Search',
    start_date: new Date('2024-11-01'),
    end_date: new Date('2025-02-28'),
    total_budget: 300000,
    daily_budget: 2500,
    actual_spend: 112500, // 37.5%
    status: 'active',
    created_at: new Date('2024-11-01'),
    updated_at: new Date('2024-12-15'),
  },
  {
    campaign_id: 'camp-014',
    group_id: 'grp-009',
    name: 'Product Launch - Display',
    start_date: new Date('2024-11-15'),
    end_date: new Date('2025-01-31'),
    total_budget: 100000,
    daily_budget: 1299,
    actual_spend: 40300, // 40.3%
    status: 'active',
    created_at: new Date('2024-11-15'),
    updated_at: new Date('2024-12-15'),
  },
  {
    campaign_id: 'camp-015',
    group_id: 'grp-010',
    name: 'Sponsored Articles',
    start_date: new Date('2024-10-01'),
    end_date: new Date('2025-03-31'),
    total_budget: 80000,
    daily_budget: 440,
    actual_spend: 33600, // 42%
    status: 'active',
    created_at: new Date('2024-10-01'),
    updated_at: new Date('2024-12-15'),
  },
];

// =============================================================================
// MOCK PAUSE WINDOWS
// =============================================================================

export const mockPauseWindows: PauseWindow[] = [
  {
    window_id: 'pw-001',
    campaign_id: 'camp-005',
    pause_start_date: new Date('2024-12-10'),
    pause_end_date: new Date('2025-01-02'),
    created_at: new Date('2024-12-10'),
    updated_at: new Date('2024-12-10'),
  },
  {
    window_id: 'pw-002',
    campaign_id: 'camp-012',
    pause_start_date: new Date('2024-11-30'),
    pause_end_date: new Date('2024-12-31'),
    created_at: new Date('2024-11-30'),
    updated_at: new Date('2024-11-30'),
  },
  {
    window_id: 'pw-003',
    campaign_id: 'camp-003',
    pause_start_date: new Date('2024-12-24'),
    pause_end_date: new Date('2024-12-26'),
    created_at: new Date('2024-12-01'),
    updated_at: new Date('2024-12-01'),
  },
];

// =============================================================================
// MOCK ALERTS (Pre-generated based on budget utilization)
// =============================================================================

export const mockAlerts: Alert[] = [
  {
    alert_id: 'alert-001',
    campaign_id: 'camp-001',
    type: 'critical',
    message: 'Budget utilization has reached 95%. Immediate action required.',
    threshold: 95,
    current_value: 95,
    is_read: false,
    created_at: new Date('2024-12-15T10:30:00'),
  },
  {
    alert_id: 'alert-002',
    campaign_id: 'camp-003',
    type: 'warning',
    message: 'Budget utilization has reached 92%. Consider reviewing budget allocation.',
    threshold: 90,
    current_value: 92,
    is_read: false,
    created_at: new Date('2024-12-14T14:15:00'),
  },
  {
    alert_id: 'alert-003',
    campaign_id: 'camp-006',
    type: 'warning',
    message: 'Budget utilization has reached 90%. Consider reviewing budget allocation.',
    threshold: 90,
    current_value: 90,
    is_read: true,
    created_at: new Date('2024-12-13T09:45:00'),
  },
  {
    alert_id: 'alert-004',
    campaign_id: 'camp-011',
    type: 'warning',
    message: 'Budget utilization has reached 91%. Consider reviewing budget allocation.',
    threshold: 90,
    current_value: 91,
    is_read: false,
    created_at: new Date('2024-12-15T08:00:00'),
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getCustomerById(customerId: string): Customer | undefined {
  return mockCustomers.find(c => c.customer_id === customerId);
}

export function getChannelById(channelId: string): Channel | undefined {
  return mockChannels.find(c => c.channel_id === channelId);
}

export function getChannelsByCustomer(customerId: string): Channel[] {
  return mockChannels.filter(c => c.customer_id === customerId);
}

export function getCampaignGroupsByChannel(channelId: string): CampaignGroup[] {
  return mockCampaignGroups.filter(g => g.channel_id === channelId);
}

export function getCampaignsByGroup(groupId: string): Campaign[] {
  return mockCampaigns.filter(c => c.group_id === groupId);
}

export function getCampaignById(campaignId: string): Campaign | undefined {
  return mockCampaigns.find(c => c.campaign_id === campaignId);
}

export function getPauseWindowsByCampaign(campaignId: string): PauseWindow[] {
  return mockPauseWindows.filter(pw => pw.campaign_id === campaignId);
}

export function getAlertsByCampaign(campaignId: string): Alert[] {
  return mockAlerts.filter(a => a.campaign_id === campaignId);
}

export function getUnreadAlerts(): Alert[] {
  return mockAlerts.filter(a => !a.is_read);
}
