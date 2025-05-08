import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Slider } from "./components/ui/slider";
import { Button } from "./components/ui/button";
import { Switch } from "./components/ui/switch";
import { Label } from "./components/ui/label";
import {
  Activity,
  Gauge,
  Thermometer,
  Droplets,
  BarChart3,
  Zap,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  AlertTriangle,
  Info,
  Settings,
  Cpu,
  Layers,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import EngineVisualization from "./components/engine-visualization";
import PowerOutputGraph from "./components/power-output-graph";
import CircuitDiagram from "./components/circuit-diagram";
import SystemStatus from "./components/system-status";
import ParameterDashboard from "./components/parameter-dashboard";
import AdvancedControls from "./components/advanced-controls";
import AutomaticControls from "./components/automatic-controls";
import CascadeControlPanel from "./components/cascade-control-panel";
import { ThemeToggle } from "./components/theme-toggle";
import { useEngineSimulation } from "./hooks/use-engine-simulation";

export default function DieselPlantSimulator() {
  const engine = useEngineSimulation();

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <header className="mb-8 bg-card/80 backdrop-blur-md rounded-xl shadow-sm border border-border/30 p-4 z-10 hover:border-border/50">
        {/* Top row with title and theme toggle */}
        <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
          <div className="flex items-center gap-3">
            <Gauge className="h-7 w-7 text-neutral-800 dark:text-white transition-transform hover:rotate-12" />
            <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-neutral-800 tracking-tight dark:bg-gradient-to-r dark:from-foreground dark:to-amber-600 dark:dark:to-amber-500 dark:bg-clip-text dark:text-transparent">
              Diesel Power Plant Simulator
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium bg-muted/80 px-3 py-1.5 rounded-lg border border-border/20 hidden md:block transition-colors">
              Time:{" "}
              <span className="font-mono">{Math.floor(engine.time)}s</span>
            </span>
            <ThemeToggle />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="flex items-center flex-wrap gap-2">
            <Button
              variant={engine.running ? "destructive" : "default"}
              size="sm"
              onClick={() => engine.setRunning(!engine.running)}
              className={`flex-shrink-0 shadow-sm border transition-all duration-200 hover:shadow-md active:scale-[0.98] ${
                engine.running
                  ? "border-red-700/80 dark:border-red-700/80 text-white hover:bg-red-800/90"
                  : "border-border/50 hover:border-primary/50"
              }`}
            >
              {engine.running ? (
                <>
                  <Pause className="mr-1.5 h-4 w-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="mr-1.5 h-4 w-4" />
                  Start
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={engine.resetSimulation}
              className="flex-shrink-0 shadow-sm border border-border/60 transition-all duration-200 hover:bg-muted/60 hover:border-border active:scale-[0.98] hover:shadow"
            >
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Reset
            </Button>

            <div className="flex items-center gap-2 md:hidden">
              <span className="text-xs font-medium bg-muted/80 px-2 py-1 rounded-md border border-border/20">
                Time:{" "}
                <span className="font-mono">{Math.floor(engine.time)}s</span>
              </span>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-grow min-w-[160px]">
              <Label
                htmlFor="simulation-speed"
                className="text-sm whitespace-nowrap"
              >
                Speed:
              </Label>
              <Slider
                id="simulation-speed"
                value={[engine.simulationSpeed]}
                min={0.1}
                max={5}
                step={0.1}
                onValueChange={(value) => engine.setSimulationSpeed(value[0])}
                className="flex-grow"
              />
              <span className="text-xs font-medium bg-muted/80 px-2 py-1 rounded-md w-10 text-center border border-border/20">
                {engine.simulationSpeed.toFixed(1)}x
              </span>
            </div>

            <div className="hidden md:flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  engine.setSimulationSpeed(
                    Math.max(0.1, engine.simulationSpeed / 2)
                  )
                }
                className="h-7 w-7 border border-border/60 shadow-sm transition-all duration-200 hover:bg-muted/60 hover:border-border active:scale-[0.98]"
                title="Slower"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  engine.setSimulationSpeed(
                    Math.min(10, engine.simulationSpeed * 2)
                  )
                }
                className="h-7 w-7 border border-border/60 shadow-sm transition-all duration-200 hover:bg-muted/60 hover:border-border active:scale-[0.98]"
                title="Faster"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-end gap-2">
            <div
              onClick={engine.toggleEmergencyMode}
              className={`group flex items-center gap-3 px-4 py-2 rounded-lg border shadow-sm transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                engine.emergencyMode
                  ? "bg-red-100/90 dark:bg-red-900/60 border-red-300/80 dark:border-red-800/80 hover:shadow-md"
                  : "bg-muted/60 border-border/40 hover:border-border/70"
              }`}
            >
              <Switch
                id="emergency-mode"
                checked={engine.emergencyMode}
                onCheckedChange={engine.toggleEmergencyMode}
                className={`transition border ${
                  engine.emergencyMode
                    ? "data-[state=checked]:bg-red-700 data-[state=checked]:border-red-700 dark:data-[state=checked]:bg-red-600 dark:data-[state=checked]:border-red-600"
                    : ""
                }`}
              />

              <Label
                htmlFor="emergency-mode"
                className="relative text-sm font-semibold pointer-events-none flex items-center gap-1.5 min-w-[120px]"
              >
                <AlertTriangle
                  className={`h-4 w-4 transition-all duration-200 ${
                    engine.emergencyMode
                      ? "text-red-600 dark:text-red-300 opacity-100 animate-pulse"
                      : "text-muted-foreground opacity-0 w-0 -ml-2"
                  }`}
                />
                <span>
                  Emergency Mode
                  <span
                    className={`absolute -right-2 -top-1 h-1.5 w-1.5 rounded-full bg-red-500 transition-opacity duration-200 ${
                      engine.emergencyMode
                        ? "opacity-100 animate-ping"
                        : "opacity-0"
                    }`}
                  ></span>
                </span>
              </Label>
            </div>
          </div>
        </div>
      </header>

      {engine.alerts.length > 0 && (
        <div className="bg-red-900/30 border border-red-500 rounded-md p-3 mb-6 dark:bg-red-950/30">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h3 className="font-bold text-red-500">System Alerts</h3>
          </div>
          <ul className="space-y-1">
            {engine.alerts.map((alert, index) => (
              <li key={index} className="text-sm flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                {alert}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-card rounded-lg p-4 col-span-2 shadow-sm">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-500" />
            Real-time Monitoring
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-muted rounded-lg p-3">
              <div className="text-sm text-muted-foreground mb-1">
                Power Output
              </div>
              <div className="text-2xl font-bold">
                {engine.powerOutput.toFixed(1)} MW
              </div>
              {engine.autoControlEnabled.power && (
                <div className="text-xs text-emerald-500 dark:text-emerald-400 mt-1">
                  Auto: {engine.autoControlTargets.power} MW
                </div>
              )}
              {engine.cascadeControlEnabled &&
                engine.cascadeControlType === "power-fuel" && (
                  <div className="text-xs text-purple-500 dark:text-purple-400 mt-1">
                    Cascade:{" "}
                    {engine.cascadeControlConfig.primarySetpoint.toFixed(1)} MW
                  </div>
                )}
            </div>
            <div className="bg-muted rounded-lg p-3">
              <div className="text-sm text-muted-foreground mb-1">
                Fuel Consumption
              </div>
              <div className="text-2xl font-bold">
                {engine.fuelConsumption.toFixed(1)} L/min
              </div>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <div className="text-sm text-muted-foreground mb-1">
                Engine Temperature
              </div>
              <div className="text-2xl font-bold">
                {engine.engineTemperature.toFixed(1)} °C
              </div>
              {engine.autoControlEnabled.temperature && (
                <div className="text-xs text-emerald-500 dark:text-emerald-400 mt-1">
                  Auto: {engine.autoControlTargets.temperature} °C
                </div>
              )}
              {engine.cascadeControlEnabled &&
                engine.cascadeControlType === "temperature-cooling" && (
                  <div className="text-xs text-purple-500 dark:text-purple-400 mt-1">
                    Cascade:{" "}
                    {engine.cascadeControlConfig.primarySetpoint.toFixed(1)} °C
                  </div>
                )}
            </div>
            <div className="bg-muted rounded-lg p-3">
              <div className="text-sm text-muted-foreground mb-1">
                Efficiency
              </div>
              <div className="text-2xl font-bold">
                {engine.efficiency.toFixed(1)}%
              </div>
              {engine.autoControlEnabled.efficiency && (
                <div className="text-xs text-emerald-500 dark:text-emerald-400 mt-1">
                  Auto: {engine.autoControlTargets.efficiency}%
                </div>
              )}
              {engine.cascadeControlEnabled &&
                engine.cascadeControlType === "efficiency-excitation" && (
                  <div className="text-xs text-purple-500 dark:text-purple-400 mt-1">
                    Cascade:{" "}
                    {engine.cascadeControlConfig.primarySetpoint.toFixed(1)}%
                  </div>
                )}
            </div>
          </div>

          <PowerOutputGraph
            powerData={engine.powerHistory}
            temperatureData={engine.temperatureHistory}
            efficiencyData={engine.efficiencyHistory}
          />
        </div>

        <div className="bg-card rounded-lg p-4 shadow-sm">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Gauge className="h-5 w-5 text-amber-500" />
            Control Panel
          </h2>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="fuel-injection">Fuel Injection Rate</Label>
                <span className="text-sm">{engine.fuelInjectionRate}%</span>
              </div>
              <Slider
                id="fuel-injection"
                value={[engine.fuelInjectionRate]}
                min={0}
                max={100}
                step={1}
                onValueChange={(value) => engine.setFuelInjectionRate(value[0])}
                disabled={
                  engine.emergencyMode ||
                  engine.autoControlEnabled.power ||
                  (engine.cascadeControlEnabled &&
                    engine.cascadeControlType === "power-fuel")
                }
              />
              {engine.autoControlEnabled.power && (
                <div className="text-xs text-emerald-500 dark:text-emerald-400 flex justify-end">
                  Auto-controlled
                </div>
              )}
              {engine.cascadeControlEnabled &&
                engine.cascadeControlType === "power-fuel" && (
                  <div className="text-xs text-purple-500 dark:text-purple-400 flex justify-end">
                    Cascade-controlled
                  </div>
                )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="load">Load Demand</Label>
                <span className="text-sm">{engine.load}%</span>
              </div>
              <Slider
                id="load"
                value={[engine.load]}
                min={0}
                max={100}
                step={1}
                onValueChange={(value) => engine.setLoad(value[0])}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="cooling">Cooling System Power</Label>
                <span className="text-sm">{engine.coolingSystemPower}%</span>
              </div>
              <Slider
                id="cooling"
                value={[engine.coolingSystemPower]}
                min={0}
                max={100}
                step={1}
                onValueChange={(value) =>
                  engine.setCoolingSystemPower(value[0])
                }
                disabled={
                  engine.emergencyMode ||
                  engine.autoControlEnabled.temperature ||
                  (engine.cascadeControlEnabled &&
                    engine.cascadeControlType === "temperature-cooling")
                }
              />
              {engine.autoControlEnabled.temperature && (
                <div className="text-xs text-emerald-500 dark:text-emerald-400 flex justify-end">
                  Auto-controlled
                </div>
              )}
              {engine.cascadeControlEnabled &&
                engine.cascadeControlType === "temperature-cooling" && (
                  <div className="text-xs text-purple-500 dark:text-purple-400 flex justify-end">
                    Cascade-controlled
                  </div>
                )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="excitation">Generator Excitation</Label>
                <span className="text-sm">{engine.generatorExcitation}%</span>
              </div>
              <Slider
                id="excitation"
                value={[engine.generatorExcitation]}
                min={0}
                max={100}
                step={1}
                onValueChange={(value) =>
                  engine.setGeneratorExcitation(value[0])
                }
                disabled={
                  engine.emergencyMode ||
                  engine.autoControlEnabled.efficiency ||
                  (engine.cascadeControlEnabled &&
                    engine.cascadeControlType === "efficiency-excitation")
                }
              />
              {engine.autoControlEnabled.efficiency && (
                <div className="text-xs text-emerald-500 dark:text-emerald-400 flex justify-end">
                  Auto-controlled
                </div>
              )}
              {engine.cascadeControlEnabled &&
                engine.cascadeControlType === "efficiency-excitation" && (
                  <div className="text-xs text-purple-500 dark:text-purple-400 flex justify-end">
                    Cascade-controlled
                  </div>
                )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="maintenance">Maintenance Status</Label>
                <span
                  className={`text-sm ${
                    engine.maintenanceStatus < 30 ? "text-red-500" : ""
                  }`}
                >
                  {engine.maintenanceStatus}%
                </span>
              </div>
              <Slider
                id="maintenance"
                value={[engine.maintenanceStatus]}
                min={0}
                max={100}
                step={1}
                onValueChange={(value) => engine.setMaintenanceStatus(value[0])}
              />
              {engine.maintenanceStatus < 30 && (
                <p className="text-xs text-red-500">Maintenance required!</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="engine" className="w-full">
        <TabsList className="flex flex-wrap gap-1 mb-4 sm:gap-2">
          <TabsTrigger
            value="engine"
            className="flex-1 min-w-[80px] text-xs sm:text-sm"
          >
            <span className="hidden sm:inline">
              <span className="flex items-center gap-1">
                <Thermometer className="h-3 w-3" />
                Engine
              </span>
            </span>
            <span className="sm:hidden">
              <Thermometer className="h-3.5 w-3.5 mx-auto" />
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="circuit"
            className="flex-1 min-w-[80px] text-xs sm:text-sm"
          >
            <span className="hidden sm:inline">
              <span className="flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 mx-auto" />
                Circuit
              </span>
            </span>
            <span className="sm:hidden">
              <Zap className="h-3.5 w-3.5 mx-auto" />
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="parameters"
            className="flex-1 min-w-[80px] text-xs sm:text-sm"
          >
            <span className="hidden sm:inline">
              <span className="flex items-center gap-1">
                <Activity className="h-3.5 w-3.5 mx-auto" />
                Parameters
              </span>
            </span>
            <span className="sm:hidden">
              <Activity className="h-3.5 w-3.5 mx-auto" />
            </span>
          </TabsTrigger>
          {/* 
          <TabsTrigger
            value="system"
            className="flex-1 min-w-[80px] text-xs sm:text-sm"
          >
            <span className="hidden sm:inline">System Information</span>
            <span className="sm:hidden">
              <BarChart3 className="h-3.5 w-3.5 mx-auto" />
            </span>
          </TabsTrigger> */}

          <TabsTrigger
            value="auto"
            className="flex-1 min-w-[80px] text-xs sm:text-sm"
          >
            <span className="hidden sm:inline">
              <span className="flex items-center gap-1">
                <Cpu className="h-3 w-3" />
                Auto Control
              </span>
            </span>
            <span className="sm:hidden">
              <Cpu className="h-3.5 w-3.5 mx-auto" />
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="advanced"
            className="flex-1 min-w-[80px] text-xs sm:text-sm"
          >
            <span className="hidden sm:inline">
              <span className="flex items-center gap-1">
                <Settings className="h-3 w-3" />
                Advanced
              </span>
            </span>
            <span className="sm:hidden">
              <Settings className="h-3.5 w-3.5 mx-auto" />
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="engine"
          className="bg-card rounded-lg p-4 shadow-sm"
        >
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-red-500" />
            Engine Visualization
          </h3>
          <EngineVisualization
            temperature={engine.engineTemperature}
            load={engine.load}
            running={engine.running}
            rpm={1500 * (engine.load / 100) * (engine.fuelInjectionRate / 50)}
            voltage={engine.voltage}
            frequency={engine.frequency}
            excitation={engine.generatorExcitation}
          />
        </TabsContent>

        <TabsContent
          value="circuit"
          className="bg-card rounded-lg p-4 shadow-sm"
        >
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Circuit Diagram
          </h3>
          <CircuitDiagram
            powerOutput={engine.powerOutput}
            generatorExcitation={engine.generatorExcitation}
            load={engine.load}
            running={engine.running}
          />
        </TabsContent>

        {/* <TabsContent
          value="system"
          className="bg-card rounded-lg p-4 shadow-sm"
        >
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-500" />
            System Status
          </h3>
          <SystemStatus
            temperature={engine.engineTemperature}
            efficiency={engine.efficiency}
            maintenanceStatus={engine.maintenanceStatus}
            fuelConsumption={engine.fuelConsumption}
            emissions={engine.emissions}
            running={engine.running}
            time={engine.time}
          />
        </TabsContent> */}

        <TabsContent
          value="parameters"
          className="bg-card rounded-lg p-4 shadow-sm"
        >
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-500" />
            Parameter Dashboard
          </h3>
          <ParameterDashboard
            parameters={{
              powerOutput: engine.powerOutput,
              fuelConsumption: engine.fuelConsumption,
              engineTemperature: engine.engineTemperature,
              efficiency: engine.efficiency,
              emissions: engine.emissions,
              fuelInjectionRate: engine.fuelInjectionRate,
              load: engine.load,
              coolingSystemPower: engine.coolingSystemPower,
              generatorExcitation: engine.generatorExcitation,
              maintenanceStatus: engine.maintenanceStatus,
            }}
            time={engine.time}
          />
        </TabsContent>

        <TabsContent
          value="advanced"
          className="bg-card rounded-lg p-4 shadow-sm"
        >
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-500" />
            Advanced Controls
          </h3>
          <AdvancedControls
            onParameterChange={(param, value) => {
              switch (param) {
                case "fuelInjectionRate":
                  engine.setFuelInjectionRate(value);
                  break;
                case "load":
                  engine.setLoad(value);
                  break;
                case "coolingSystemPower":
                  engine.setCoolingSystemPower(value);
                  break;
                case "generatorExcitation":
                  engine.setGeneratorExcitation(value);
                  break;
                case "maintenanceStatus":
                  engine.setMaintenanceStatus(value);
                  break;
              }
            }}
            running={engine.running}
            emergencyMode={engine.emergencyMode}
          />
        </TabsContent>

        <TabsContent value="auto" className="bg-card rounded-lg p-4 shadow-sm">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Cpu className="h-5 w-5 text-cyan-500" />
            Automatic Control Systems
          </h3>
          <AutomaticControls
            autoControlEnabled={engine.autoControlEnabled}
            autoControlTargets={engine.autoControlTargets}
            updateAutoControl={engine.updateAutoControl}
            updatePIDParameters={engine.updatePIDParameters}
            controllerOutputs={engine.controllerOutputs}
            currentValues={{
              temperature: engine.engineTemperature,
              power: engine.powerOutput,
              efficiency: engine.efficiency,
            }}
            running={engine.running}
            emergencyMode={engine.emergencyMode}
            controllerHistory={engine.controllerHistory}
            autoTunePID={engine.autoTunePID}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
