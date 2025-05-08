"use client";

import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface SystemStatusProps {
  temperature: number;
  efficiency: number;
  maintenanceStatus: number;
  fuelConsumption: number;
  emissions: {
    co2: number;
    nox: number;
    particulates: number;
  };
  running: boolean;
  time: number;
}

export default function SystemStatus({
  temperature,
  efficiency,
  maintenanceStatus,
  fuelConsumption,
  emissions,
  running,
  time,
}: SystemStatusProps) {
  // Calculate overall system health
  const calculateSystemHealth = () => {
    // Weighted factors
    const tempFactor = temperature > 95 ? 0 : temperature > 85 ? 0.5 : 1;
    const efficiencyFactor = efficiency / 100;
    const maintenanceFactor = maintenanceStatus / 100;
    const emissionsFactor = emissions.nox > 80 ? 0.3 : 0.8;

    // Overall health score (0-100)
    const healthScore =
      (tempFactor * 0.3 +
        efficiencyFactor * 0.3 +
        maintenanceFactor * 0.3 +
        emissionsFactor * 0.1) *
      100;

    return {
      score: healthScore,
      status:
        healthScore > 80 ? "Good" : healthScore > 50 ? "Warning" : "Critical",
    };
  };

  const systemHealth = calculateSystemHealth();

  // Calculate operational costs
  const calculateOperationalCosts = () => {
    const fuelCostPerLiter = 0.85; // $0.85 per liter
    const maintenanceCostFactor = ((100 - maintenanceStatus) / 100) * 2 + 1; // Higher cost with lower maintenance

    const hourlyFuelCost = fuelConsumption * 60 * fuelCostPerLiter;
    const hourlyMaintenanceCost = 50 * maintenanceCostFactor;
    const totalHourlyCost = hourlyFuelCost + hourlyMaintenanceCost;

    return {
      fuel: hourlyFuelCost,
      maintenance: hourlyMaintenanceCost,
      total: totalHourlyCost,
    };
  };

  const operationalCosts = calculateOperationalCosts();

  // Calculate revenue and profit
  const calculateRevenue = () => {
    const electricityPrice = 0.12; // $0.12 per kWh
    const hourlyRevenue = (powerOutput) =>
      powerOutput * 1000 * electricityPrice;

    return {
      hourly: hourlyRevenue(((efficiency / 100) * fuelConsumption) / 10),
      profit:
        hourlyRevenue(((efficiency / 100) * fuelConsumption) / 10) -
        operationalCosts.total,
    };
  };

  const revenue = calculateRevenue();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="bg-zinc-700 rounded-lg p-4">
          <h4 className="font-bold mb-3">System Health & Information</h4>
          <div className="flex items-center gap-3 mb-2">
            {systemHealth.status === "Good" ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : systemHealth.status === "Warning" ? (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <span
              className={`font-bold ${
                systemHealth.status === "Good"
                  ? "text-green-500"
                  : systemHealth.status === "Warning"
                  ? "text-amber-500"
                  : "text-red-500"
              }`}
            >
              {systemHealth.status}
            </span>
            <span className="text-sm">({Math.round(systemHealth.score)}%)</span>
          </div>

          <div className="w-full bg-zinc-600 rounded-full h-2.5 mb-4">
            <div
              className={`h-2.5 rounded-full ${
                systemHealth.status === "Good"
                  ? "bg-green-500"
                  : systemHealth.status === "Warning"
                  ? "bg-amber-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${systemHealth.score}%` }}
            ></div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-zinc-400">Temperature</div>
              <div
                className={`font-medium ${
                  temperature > 90
                    ? "text-red-500"
                    : temperature > 80
                    ? "text-amber-500"
                    : "text-green-500"
                }`}
              >
                {temperature.toFixed(1)}°C
              </div>
            </div>
            <div>
              <div className="text-zinc-400">Efficiency</div>
              <div
                className={`font-medium ${
                  efficiency < 30
                    ? "text-red-500"
                    : efficiency < 50
                    ? "text-amber-500"
                    : "text-green-500"
                }`}
              >
                {efficiency.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-zinc-400">Maintenance</div>
              <div
                className={`font-medium ${
                  maintenanceStatus < 30
                    ? "text-red-500"
                    : maintenanceStatus < 60
                    ? "text-amber-500"
                    : "text-green-500"
                }`}
              >
                {maintenanceStatus.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-zinc-400">Emissions</div>
              <div
                className={`font-medium ${
                  emissions.nox > 80
                    ? "text-red-500"
                    : emissions.nox > 60
                    ? "text-amber-500"
                    : "text-green-500"
                }`}
              >
                {emissions.nox.toFixed(1)} NOₓ
              </div>
            </div>

            <div>
              <div className="text-zinc-400">Status</div>
              <div
                className={`font-medium ${
                  running ? "text-green-500" : "text-red-500"
                }`}
              >
                {running ? "Running" : "Stopped"}
              </div>
            </div>
            <div>
              <div className="text-zinc-400">Runtime</div>
              <div className="font-medium">
                {Math.floor(time / 60)}m {Math.floor(time % 60)}s
              </div>
            </div>
            <div>
              <div className="text-zinc-400">Model</div>
              <div className="font-medium">DE-4000 Series</div>
            </div>
            <div>
              <div className="text-zinc-400">Capacity</div>
              <div className="font-medium">10 MW</div>
            </div>
          </div>
        </div>
      </div>

    
    </div>
  );
}
