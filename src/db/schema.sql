-- Brightvision Ads Insights Tool - PostgreSQL Database Schema
-- Version: 1.0.0
-- Description: Financial tool for monitoring, planning and forecasting ad budgets

-- Enable UUID extension for generating unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

CREATE TYPE currency_type AS ENUM ('SEK', 'EUR', 'USD');
CREATE TYPE channel_name AS ENUM ('Google', 'LinkedIn', 'Meta');
CREATE TYPE campaign_status AS ENUM ('Active', 'Paused', 'Stopped');
CREATE TYPE user_role AS ENUM ('admin', 'viewer');
CREATE TYPE alert_severity AS ENUM ('warning', 'critical', 'info');

-- =============================================================================
-- TABLES
-- =============================================================================

-- Users table for authentication
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'viewer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE customers (
    customer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    currency currency_type NOT NULL DEFAULT 'SEK',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Channels table (Google, LinkedIn, Meta per customer)
CREATE TABLE channels (
    channel_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name channel_name NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, customer_id)
);

-- Campaign Groups table
CREATE TABLE campaign_groups (
    group_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    channel_id UUID NOT NULL REFERENCES channels(channel_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Campaigns table
CREATE TABLE campaigns (
    campaign_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES campaign_groups(group_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_budget DECIMAL(15, 2) NOT NULL CHECK (total_budget >= 0),
    daily_budget DECIMAL(15, 2) NOT NULL CHECK (daily_budget >= 0),
    actual_spend DECIMAL(15, 2) DEFAULT 0 CHECK (actual_spend >= 0),
    status campaign_status DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Pause Windows table (for tracking campaign pause periods)
CREATE TABLE pause_windows (
    window_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
    pause_start_date DATE NOT NULL,
    pause_end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_pause_range CHECK (pause_end_date >= pause_start_date)
);

-- Alerts table (for budget warnings)
CREATE TABLE alerts (
    alert_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
    severity alert_severity NOT NULL,
    message TEXT NOT NULL,
    threshold DECIMAL(5, 2) NOT NULL,
    current_value DECIMAL(5, 2) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Customer indexes
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_currency ON customers(currency);

-- Channel indexes
CREATE INDEX idx_channels_customer ON channels(customer_id);
CREATE INDEX idx_channels_name ON channels(name);

-- Campaign Group indexes
CREATE INDEX idx_campaign_groups_channel ON campaign_groups(channel_id);

-- Campaign indexes
CREATE INDEX idx_campaigns_group ON campaigns(group_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);
CREATE INDEX idx_campaigns_budget ON campaigns(total_budget, actual_spend);

-- Pause Windows indexes
CREATE INDEX idx_pause_windows_campaign ON pause_windows(campaign_id);
CREATE INDEX idx_pause_windows_dates ON pause_windows(pause_start_date, pause_end_date);

-- Alert indexes
CREATE INDEX idx_alerts_campaign ON alerts(campaign_id);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_unread ON alerts(is_read) WHERE is_read = FALSE;

-- =============================================================================
-- VIEWS
-- =============================================================================

-- View for budget utilization by campaign
CREATE VIEW v_campaign_budget_utilization AS
SELECT 
    c.campaign_id,
    c.name AS campaign_name,
    c.total_budget,
    c.actual_spend,
    ROUND((c.actual_spend / NULLIF(c.total_budget, 0)) * 100, 2) AS utilization_percentage,
    c.total_budget - c.actual_spend AS remaining_budget,
    c.status,
    cg.name AS group_name,
    ch.name AS channel_name,
    cu.name AS customer_name,
    cu.currency
FROM campaigns c
JOIN campaign_groups cg ON c.group_id = cg.group_id
JOIN channels ch ON cg.channel_id = ch.channel_id
JOIN customers cu ON ch.customer_id = cu.customer_id;

-- View for aggregated spend by customer
CREATE VIEW v_customer_spend_summary AS
SELECT 
    cu.customer_id,
    cu.name AS customer_name,
    cu.currency,
    SUM(c.total_budget) AS total_budget,
    SUM(c.actual_spend) AS total_spend,
    ROUND((SUM(c.actual_spend) / NULLIF(SUM(c.total_budget), 0)) * 100, 2) AS utilization_percentage,
    COUNT(DISTINCT c.campaign_id) AS campaign_count,
    COUNT(DISTINCT c.campaign_id) FILTER (WHERE c.status = 'Active') AS active_campaigns
FROM customers cu
LEFT JOIN channels ch ON cu.customer_id = ch.customer_id
LEFT JOIN campaign_groups cg ON ch.channel_id = cg.channel_id
LEFT JOIN campaigns c ON cg.group_id = c.group_id
GROUP BY cu.customer_id, cu.name, cu.currency;

-- View for aggregated spend by channel
CREATE VIEW v_channel_spend_summary AS
SELECT 
    ch.channel_id,
    ch.name AS channel_name,
    cu.customer_id,
    cu.name AS customer_name,
    cu.currency,
    SUM(c.total_budget) AS total_budget,
    SUM(c.actual_spend) AS total_spend,
    ROUND((SUM(c.actual_spend) / NULLIF(SUM(c.total_budget), 0)) * 100, 2) AS utilization_percentage,
    COUNT(DISTINCT c.campaign_id) AS campaign_count
FROM channels ch
JOIN customers cu ON ch.customer_id = cu.customer_id
LEFT JOIN campaign_groups cg ON ch.channel_id = cg.channel_id
LEFT JOIN campaigns c ON cg.group_id = c.group_id
GROUP BY ch.channel_id, ch.name, cu.customer_id, cu.name, cu.currency;

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to calculate budget utilization and trigger alerts
CREATE OR REPLACE FUNCTION check_budget_utilization()
RETURNS TRIGGER AS $$
DECLARE
    utilization DECIMAL(5, 2);
BEGIN
    utilization := (NEW.actual_spend / NULLIF(NEW.total_budget, 0)) * 100;
    
    -- Trigger critical alert at 95%
    IF utilization >= 95 AND utilization < 100 THEN
        INSERT INTO alerts (campaign_id, severity, message, threshold, current_value)
        VALUES (
            NEW.campaign_id,
            'critical',
            'Budget utilization has reached ' || utilization || '%. Immediate action required.',
            95,
            utilization
        );
    -- Trigger warning alert at 90%
    ELSIF utilization >= 90 AND utilization < 95 THEN
        INSERT INTO alerts (campaign_id, severity, message, threshold, current_value)
        VALUES (
            NEW.campaign_id,
            'warning',
            'Budget utilization has reached ' || utilization || '%. Consider reviewing budget allocation.',
            90,
            utilization
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Trigger for budget utilization alerts
CREATE TRIGGER trigger_budget_alert
AFTER UPDATE OF actual_spend ON campaigns
FOR EACH ROW
WHEN (OLD.actual_spend IS DISTINCT FROM NEW.actual_spend)
EXECUTE FUNCTION check_budget_utilization();

-- Updated_at triggers for all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON channels
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_groups_updated_at BEFORE UPDATE ON campaign_groups
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pause_windows_updated_at BEFORE UPDATE ON pause_windows
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

