import { SimulationPanel } from '../components/simulation/SimulationPanel';

export function SimulationPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Simulate budget changes and manage pause windows
        </p>
      </div>

      {/* Simulation Panel */}
      <div className="max-w-2xl">
        <SimulationPanel />
      </div>
    </div>
  );
}
