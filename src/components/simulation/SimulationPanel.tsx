import { useState, useEffect, useMemo } from 'react';
import { useCampaignStore } from '../../store/campaignStore';
import { useAuthStore } from '../../store/authStore';
import { calculateActiveDays, calculatePausedDays, forecastTotalSpend } from '../../utils/budgetCalculations';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { 
  Calculator, 
  Calendar, 
  DollarSign, 
  Play, 
  Plus, 
  Trash2, 
  AlertTriangle,
  CheckCircle,
  Lock
} from 'lucide-react';

interface SimulationOutput {
  originalDailyBudget: number;
  newDailyBudget: number;
  forecastedSpend: number;
  budgetDifference: number;
  activeDays: number;
  pausedDays: number;
}

interface TempPauseWindow {
  id: string;
  pause_start_date: string;
  pause_end_date: string;
}

export function SimulationPanel() {
  const { campaigns, pauseWindows, updateCampaign, addPauseWindow, deletePauseWindow } = useCampaignStore();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [newBudget, setNewBudget] = useState<string>('');
  const [tempPauseWindows, setTempPauseWindows] = useState<TempPauseWindow[]>([]);
  const [simulationResult, setSimulationResult] = useState<SimulationOutput | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const selectedCampaign = campaigns.find(c => c.campaign_id === selectedCampaignId);
  const existingPauseWindows = pauseWindows.filter(pw => pw.campaign_id === selectedCampaignId);

  useEffect(() => {
    if (selectedCampaign) {
      setNewBudget(selectedCampaign.total_budget.toString());
      setTempPauseWindows([]);
      setSimulationResult(null);
    }
  }, [selectedCampaign]);

  const runSimulation = () => {
    if (!selectedCampaign) return;

    const budget = parseFloat(newBudget) || selectedCampaign.total_budget;
    
    // Combine existing and temp pause windows
    const allPauseWindows = [
      ...existingPauseWindows,
      ...tempPauseWindows.map(pw => ({
        window_id: pw.id,
        campaign_id: selectedCampaignId,
        pause_start_date: new Date(pw.pause_start_date),
        pause_end_date: new Date(pw.pause_end_date),
        created_at: new Date(),
        updated_at: new Date(),
      }))
    ];

    const simulatedCampaign = {
      ...selectedCampaign,
      total_budget: budget,
    };

    const activeDays = calculateActiveDays(simulatedCampaign.start_date, simulatedCampaign.end_date, allPauseWindows);
    const pausedDays = calculatePausedDays(simulatedCampaign.start_date, simulatedCampaign.end_date, allPauseWindows);
    const dailyBudget = budget / (activeDays || 1);
    const forecast = forecastTotalSpend(simulatedCampaign, allPauseWindows);
    
    const originalActiveDays = calculateActiveDays(selectedCampaign.start_date, selectedCampaign.end_date, existingPauseWindows);
    const originalDailyBudget = selectedCampaign.total_budget / (originalActiveDays || 1);

    setSimulationResult({
      originalDailyBudget,
      newDailyBudget: dailyBudget,
      forecastedSpend: forecast.projectedSpend,
      budgetDifference: budget - selectedCampaign.total_budget,
      activeDays,
      pausedDays,
    });
  };

  const addTempPauseWindow = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    setTempPauseWindows([
      ...tempPauseWindows,
      {
        id: `temp-${Date.now()}`,
        pause_start_date: today.toISOString().split('T')[0],
        pause_end_date: tomorrow.toISOString().split('T')[0],
      }
    ]);
  };

  const removeTempPauseWindow = (id: string) => {
    setTempPauseWindows(tempPauseWindows.filter(pw => pw.id !== id));
  };

  const updateTempPauseWindow = (id: string, field: 'pause_start_date' | 'pause_end_date', value: string) => {
    setTempPauseWindows(tempPauseWindows.map(pw => 
      pw.id === id ? { ...pw, [field]: value } : pw
    ));
  };

  const applyChanges = async () => {
    if (!selectedCampaign || !isAdmin) return;

    setIsApplying(true);

    try {
      // Update budget if changed
      const budget = parseFloat(newBudget);
      if (!isNaN(budget) && budget !== selectedCampaign.total_budget) {
        updateCampaign(selectedCampaignId, { total_budget: budget });
      }

      // Add new pause windows
      for (const pw of tempPauseWindows) {
        addPauseWindow({
          campaign_id: selectedCampaignId,
          pause_start_date: new Date(pw.pause_start_date),
          pause_end_date: new Date(pw.pause_end_date),
        });
      }

      setTempPauseWindows([]);
      setSimulationResult(null);
    } finally {
      setIsApplying(false);
    }
  };

  const isOverBudget = useMemo(() => {
    if (!simulationResult || !selectedCampaign) return false;
    return simulationResult.forecastedSpend > parseFloat(newBudget || selectedCampaign.total_budget.toString());
  }, [simulationResult, selectedCampaign, newBudget]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <CardTitle>Budget Simulator</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              Test budget changes and pause windows before applying
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Campaign Selection */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Select Campaign
          </label>
          <select
            value={selectedCampaignId}
            onChange={(e) => setSelectedCampaignId(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Choose a campaign...</option>
            {campaigns.filter(c => c.status === 'active').map((campaign) => (
              <option key={campaign.campaign_id} value={campaign.campaign_id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </div>

        {selectedCampaign && (
          <>
            {/* Current Stats */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Current Budget</p>
                <p className="text-lg font-semibold text-foreground">
                  {formatCurrency(selectedCampaign.total_budget, 'SEK')}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Current Spend</p>
                <p className="text-lg font-semibold text-foreground">
                  {formatCurrency(selectedCampaign.actual_spend, 'SEK')}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Start Date</p>
                <p className="text-sm text-foreground">{formatDate(selectedCampaign.start_date)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">End Date</p>
                <p className="text-sm text-foreground">{formatDate(selectedCampaign.end_date)}</p>
              </div>
            </div>

            {/* Budget Input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <DollarSign className="inline w-4 h-4 mr-1" />
                New Total Budget (SEK)
              </label>
              <input
                type="number"
                value={newBudget}
                onChange={(e) => setNewBudget(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                min="0"
                step="100"
              />
            </div>

            {/* Pause Windows */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-foreground">
                  <Calendar className="inline w-4 h-4 mr-1" />
                  Pause Windows
                </label>
                <button
                  onClick={addTempPauseWindow}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Pause
                </button>
              </div>

              <div className="space-y-2">
                {/* Existing pause windows */}
                {existingPauseWindows.map((pw) => (
                  <div
                    key={pw.window_id}
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex-1 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">From:</span>{' '}
                        <span className="text-foreground">{formatDate(pw.pause_start_date)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">To:</span>{' '}
                        <span className="text-foreground">{formatDate(pw.pause_end_date)}</span>
                      </div>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => deletePauseWindow(pw.window_id)}
                        className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                {/* Temp pause windows */}
                {tempPauseWindows.map((pw) => (
                  <div
                    key={pw.id}
                    className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg"
                  >
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <input
                        type="date"
                        value={pw.pause_start_date}
                        onChange={(e) => updateTempPauseWindow(pw.id, 'pause_start_date', e.target.value)}
                        className="h-9 px-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <input
                        type="date"
                        value={pw.pause_end_date}
                        onChange={(e) => updateTempPauseWindow(pw.id, 'pause_end_date', e.target.value)}
                        className="h-9 px-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <button
                      onClick={() => removeTempPauseWindow(pw.id)}
                      className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Run Simulation Button */}
            <button
              onClick={runSimulation}
              className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-lg bg-secondary text-foreground font-medium hover:bg-secondary/80 transition-colors"
            >
              <Play className="w-4 h-4" />
              Run Simulation
            </button>

            {/* Simulation Results */}
            {simulationResult && (
              <div className={`p-4 rounded-lg border ${isOverBudget ? 'bg-destructive/5 border-destructive/20' : 'bg-success/5 border-success/20'}`}>
                <div className="flex items-center gap-2 mb-3">
                  {isOverBudget ? (
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-success" />
                  )}
                  <span className={`font-medium ${isOverBudget ? 'text-destructive' : 'text-success'}`}>
                    {isOverBudget ? 'Budget Overrun Detected' : 'Within Budget'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Original Daily Budget</p>
                    <p className="font-medium text-foreground">
                      {formatCurrency(simulationResult.originalDailyBudget, 'SEK')}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">New Daily Budget</p>
                    <p className="font-medium text-foreground">
                      {formatCurrency(simulationResult.newDailyBudget, 'SEK')}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Active Days</p>
                    <p className="font-medium text-foreground">{simulationResult.activeDays}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Paused Days</p>
                    <p className="font-medium text-foreground">{simulationResult.pausedDays}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Forecasted Total Spend</p>
                    <p className={`font-medium ${isOverBudget ? 'text-destructive' : 'text-success'}`}>
                      {formatCurrency(simulationResult.forecastedSpend, 'SEK')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Apply Changes Button */}
            <button
              onClick={applyChanges}
              disabled={!isAdmin || isApplying || !simulationResult}
              className={`w-full h-11 inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors ${
                isAdmin 
                  ? 'bg-primary text-primary-foreground hover:bg-primary-700 disabled:opacity-50' 
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              {!isAdmin ? (
                <>
                  <Lock className="w-4 h-4" />
                  Admin access required
                </>
              ) : isApplying ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Applying...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Apply Changes
                </>
              )}
            </button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
