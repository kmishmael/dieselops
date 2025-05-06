import { useState, useEffect, useRef } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Slider } from "../components/ui/slider";
import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";
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
import EngineVisualization from "../components/engine-visualization";
import PowerOutputGraph from "../components/power-output-graph";
import CircuitDiagram from "../components/circuit-diagram";
import SystemStatus from "../components/system-status";
import {
  calculatePowerOutput,
  calculateFuelConsumption,
  calculateTemperature,
  calculateEfficiency,
  calculateEmissions,
} from "../lib/simulation-engine";
import ParameterDashboard from "../components/parameter-dashboard";
import AdvancedControls from "../components/advanced-controls";
import AutomaticControls from "../components/automatic-controls";
import CascadeControlPanel from "../components/cascade-control-panel";
import { PIDController } from "../lib/pid-controller";
import {
  CascadeController,
  type CascadeControllerConfig,
} from "../lib/cascade-controller";
import { ThemeToggle } from "../components/theme-toggle";

export default function DieselPlantSimulator() {
  // Simulation state
  const [running, setRunning] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [time, setTime] = useState(0);
  const animationRef = useRef<number | null>(null);

  // Plant parameters
  const [fuelInjectionRate, setFuelInjectionRate] = useState(50);
  const [load, setLoad] = useState(40);
  const [coolingSystemPower, setCoolingSystemPower] = useState(60);
  const [generatorExcitation, setGeneratorExcitation] = useState(70);
  const [maintenanceStatus, setMaintenanceStatus] = useState(100);
  const [emergencyMode, setEmergencyMode] = useState(false);

  // Calculated outputs
  const [powerOutput, setPowerOutput] = useState(0);
  const [fuelConsumption, setFuelConsumption] = useState(0);
  const [engineTemperature, setEngineTemperature] = useState(25);
  const [efficiency, setEfficiency] = useState(0);
  const [emissions, setEmissions] = useState({
    co2: 0,
    nox: 0,
    particulates: 0,
  });
  const [alerts, setAlerts] = useState<string[]>([]);

  // Historical data for graphs
  const [powerHistory, setPowerHistory] = useState<
    { time: number; value: number }[]
  >([]);
  const [temperatureHistory, setTemperatureHistory] = useState<
    { time: number; value: number }[]
  >([]);
  const [efficiencyHistory, setEfficiencyHistory] = useState<
    { time: number; value: number }[]
  >([]);

  // Automatic control systems
  const [autoControlEnabled, setAutoControlEnabled] = useState({
    temperature: false,
    power: false,
    efficiency: false,
  });

  const [autoControlTargets, setAutoControlTargets] = useState({
    temperature: 75,
    power: 5,
    efficiency: 40,
  });

  // PID controllers
  const temperatureController = useRef(
    new PIDController(2.0, 0.1, 0.5, 0, 100)
  );
  const powerController = useRef(new PIDController(5.0, 0.2, 1.0, 0, 100));
  const efficiencyController = useRef(
    new PIDController(3.0, 0.15, 0.8, 0, 100)
  );

  // Controller outputs
  const [controllerOutputs, setControllerOutputs] = useState({
    cooling: 0,
    fuel: 0,
    excitation: 0,
  });

  // PID controller history for visualization
  const [controllerHistory, setControllerHistory] = useState({
    temperature: [] as Array<{ time: number; value: number; setpoint: number }>,
    power: [] as Array<{ time: number; value: number; setpoint: number }>,
    efficiency: [] as Array<{ time: number; value: number; setpoint: number }>,
  });

  // Cascade control
  const [cascadeControlEnabled, setCascadeControlEnabled] = useState(false);
  const [cascadeControlType, setCascadeControlType] = useState(
    "temperature-cooling"
  );

  // Initialize cascade controller with default configuration
  const cascadeControllerConfig: CascadeControllerConfig = {
    primaryController: {
      kp: 1.5,
      ki: 0.05,
      kd: 0.3,
      outputMin: 0,
      outputMax: 100,
    },
    secondaryController: {
      kp: 3.0,
      ki: 0.1,
      kd: 0.5,
      outputMin: 0,
      outputMax: 100,
    },
    enabled: false,
    primarySetpoint: 75, // Default temperature setpoint
    secondarySetpointOffset: 0,
    secondarySetpointScale: 1,
  };

  const cascadeController = useRef(
    new CascadeController(cascadeControllerConfig)
  );

  // Cascade controller state
  const [cascadeControlConfig, setCascadeControlConfig] = useState({
    type: "temperature-cooling",
    primarySetpoint: 75,
    primaryMeasurement: 25,
    primaryOutput: 0,
    secondarySetpoint: 0,
    secondaryMeasurement: 0,
    secondaryOutput: 0,
  });

  const [cascadeParameters, setCascadeParameters] = useState({
    primary: { kp: 1.5, ki: 0.05, kd: 0.3 },
    secondary: { kp: 3.0, ki: 0.1, kd: 0.5 },
  });

  const [cascadeHistory, setCascadeHistory] = useState<any[]>([]);

  // Initialize controllers with appropriate modes
  useEffect(() => {
    // Use derivative on measurement to avoid derivative kick on setpoint changes
    temperatureController.current.setMode(true, false);
    powerController.current.setMode(true, false);
    efficiencyController.current.setMode(true, false);

    // Initialize cascade controller
    cascadeController.current.setEnabled(false);
  }, []);

  // Run simulation loop
  useEffect(() => {
    if (!running) {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const updateSimulation = (timestamp: number) => {
      setTime((prevTime) => {
        const newTime = prevTime + 0.016 * simulationSpeed; // ~60fps with speed multiplier
        const deltaTime = 0.016 * simulationSpeed;

        // Apply automatic controls if enabled
        let newCoolingPower = coolingSystemPower;
        let newFuelRate = fuelInjectionRate;
        let newExcitation = generatorExcitation;

        // Handle cascade control if enabled
        if (cascadeControlEnabled && !emergencyMode) {
          // Update cascade controller based on type
          if (cascadeControlType === "temperature-cooling") {
            // Temperature -> Cooling cascade
            const output = cascadeController.current.update(
              engineTemperature,
              coolingSystemPower,
              deltaTime
            );
            newCoolingPower = Math.max(0, Math.min(100, output));
            setCoolingSystemPower(newCoolingPower);

            // Disable regular temperature control when cascade is active
            if (autoControlEnabled.temperature) {
              setAutoControlEnabled((prev) => ({
                ...prev,
                temperature: false,
              }));
            }
          } else if (cascadeControlType === "power-fuel") {
            // Power -> Fuel cascade
            const output = cascadeController.current.update(
              powerOutput,
              fuelInjectionRate,
              deltaTime
            );
            newFuelRate = Math.max(0, Math.min(100, output));
            setFuelInjectionRate(newFuelRate);

            // Disable regular power control when cascade is active
            if (autoControlEnabled.power) {
              setAutoControlEnabled((prev) => ({ ...prev, power: false }));
            }
          } else if (cascadeControlType === "efficiency-excitation") {
            // Efficiency -> Excitation cascade
            const output = cascadeController.current.update(
              efficiency,
              generatorExcitation,
              deltaTime
            );
            newExcitation = Math.max(0, Math.min(100, output));
            setGeneratorExcitation(newExcitation);

            // Disable regular efficiency control when cascade is active
            if (autoControlEnabled.efficiency) {
              setAutoControlEnabled((prev) => ({ ...prev, efficiency: false }));
            }
          }

          // Update cascade control state for UI
          const state = cascadeController.current.getState();
          setCascadeControlConfig({
            type: cascadeControlType,
            primarySetpoint: state.primarySetpoint,
            primaryMeasurement: state.primaryMeasurement,
            primaryOutput: state.primaryOutput,
            secondarySetpoint: state.secondarySetpoint,
            secondaryMeasurement: state.secondaryMeasurement,
            secondaryOutput: state.secondaryOutput,
          });

          // Update cascade history for visualization
          setCascadeHistory(cascadeController.current.getHistory());
        }
        // Apply regular PID control if cascade is not enabled
        else if (!cascadeControlEnabled) {
          if (autoControlEnabled.temperature) {
            // Temperature control via cooling system
            const coolingOutput = temperatureController.current.update(
              autoControlTargets.temperature,
              engineTemperature,
              deltaTime
            );
            newCoolingPower = Math.max(0, Math.min(100, coolingOutput));
            if (!emergencyMode) {
              setCoolingSystemPower(newCoolingPower);
            }

            setControllerOutputs((prev) => ({
              ...prev,
              cooling: coolingOutput,
            }));

            // Update controller history for visualization
            setControllerHistory((prev: any) => ({
              ...prev,
              temperature: temperatureController.current.getHistory(),
            }));
          }

          if (autoControlEnabled.power) {
            // Power control via fuel injection
            const fuelOutput = powerController.current.update(
              autoControlTargets.power,
              powerOutput,
              deltaTime
            );
            newFuelRate = Math.max(0, Math.min(100, fuelOutput));
            if (!emergencyMode) {
              setFuelInjectionRate(newFuelRate);
            }

            setControllerOutputs((prev) => ({
              ...prev,
              fuel: fuelOutput,
            }));

            // Update controller history for visualization
            setControllerHistory((prev: any) => ({
              ...prev,
              power: powerController.current.getHistory(),
            }));
          }

          if (autoControlEnabled.efficiency) {
            // Efficiency control via generator excitation
            const excitationOutput = efficiencyController.current.update(
              autoControlTargets.efficiency,
              efficiency,
              deltaTime
            );
            newExcitation = Math.max(0, Math.min(100, excitationOutput));
            if (!emergencyMode) {
              setGeneratorExcitation(newExcitation);
            }

            setControllerOutputs((prev) => ({
              ...prev,
              excitation: excitationOutput,
            }));

            // Update controller history for visualization
            setControllerHistory((prev: any) => ({
              ...prev,
              efficiency: efficiencyController.current.getHistory(),
            }));
          }
        }

        // Calculate new values based on current parameters and time
        const newPowerOutput = calculatePowerOutput(
          newFuelRate,
          load,
          engineTemperature,
          newExcitation,
          maintenanceStatus,
          deltaTime
        );

        const newFuelConsumption = calculateFuelConsumption(
          newFuelRate,
          load,
          efficiency
        );

        const newTemperature = calculateTemperature(
          engineTemperature,
          newFuelRate,
          newCoolingPower,
          load,
          deltaTime
        );

        const newEfficiency = calculateEfficiency(
          engineTemperature,
          newFuelRate,
          load,
          maintenanceStatus
        );

        const newEmissions = calculateEmissions(
          newFuelRate,
          engineTemperature,
          efficiency
        );

        // Update state with new calculated values
        setPowerOutput(newPowerOutput);
        setFuelConsumption(newFuelConsumption);
        setEngineTemperature(newTemperature);
        setEfficiency(newEfficiency);
        setEmissions(newEmissions);

        // Update historical data for graphs
        if (Math.floor(newTime) > Math.floor(prevTime)) {
          setPowerHistory((prev) =>
            [...prev, { time: newTime, value: newPowerOutput }].slice(-100)
          );
          setTemperatureHistory((prev) =>
            [...prev, { time: newTime, value: newTemperature }].slice(-100)
          );
          setEfficiencyHistory((prev) =>
            [...prev, { time: newTime, value: newEfficiency }].slice(-100)
          );
        }

        // Check for alerts
        const currentAlerts = [];
        if (newTemperature > 95)
          currentAlerts.push("Engine temperature critical!");
        if (newEfficiency < 20) currentAlerts.push("Low efficiency warning");
        if (maintenanceStatus < 30) currentAlerts.push("Maintenance required");
        if (newEmissions.nox > 80)
          currentAlerts.push("NOx emissions exceeding limits");
        setAlerts(currentAlerts);

        return newTime;
      });

      animationRef.current = requestAnimationFrame(updateSimulation);
    };

    animationRef.current = requestAnimationFrame(updateSimulation);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [
    running,
    simulationSpeed,
    fuelInjectionRate,
    load,
    coolingSystemPower,
    generatorExcitation,
    maintenanceStatus,
    engineTemperature,
    efficiency,
    autoControlEnabled,
    autoControlTargets,
    emergencyMode,
    powerOutput,
    cascadeControlEnabled,
    cascadeControlType,
  ]);

  // Reset simulation
  const resetSimulation = () => {
    setRunning(false);
    setTime(0);
    setFuelInjectionRate(50);
    setLoad(40);
    setCoolingSystemPower(60);
    setGeneratorExcitation(70);
    setMaintenanceStatus(100);
    setEmergencyMode(false);
    setPowerOutput(0);
    setFuelConsumption(0);
    setEngineTemperature(25);
    setEfficiency(0);
    setEmissions({ co2: 0, nox: 0, particulates: 0 });
    setAlerts([]);
    setPowerHistory([]);
    setTemperatureHistory([]);
    setEfficiencyHistory([]);

    // Reset PID controllers
    temperatureController.current.reset();
    powerController.current.reset();
    efficiencyController.current.reset();

    setControllerOutputs({
      cooling: 0,
      fuel: 0,
      excitation: 0,
    });

    setControllerHistory({
      temperature: [],
      power: [],
      efficiency: [],
    });

    // Reset cascade controller
    cascadeController.current.reset();
    setCascadeHistory([]);
    setCascadeControlConfig({
      ...cascadeControlConfig,
      primaryMeasurement: 25,
      primaryOutput: 0,
      secondarySetpoint: 0,
      secondaryMeasurement: 0,
      secondaryOutput: 0,
    });
  };

  // Toggle emergency mode
  const toggleEmergencyMode = () => {
    const newMode = !emergencyMode;
    setEmergencyMode(newMode);

    if (newMode) {
      // Emergency mode settings
      setFuelInjectionRate(90);
      setCoolingSystemPower(100);
      setGeneratorExcitation(100);

      // Disable automatic controls in emergency mode
      setAutoControlEnabled({
        temperature: false,
        power: false,
        efficiency: false,
      });

      // Disable cascade control in emergency mode
      setCascadeControlEnabled(false);
      cascadeController.current.setEnabled(false);
    }
  };

  // Update automatic control settings
  const updateAutoControl = (
    type: "temperature" | "power" | "efficiency",
    enabled: boolean,
    target?: number
  ) => {
    // Disable cascade control if it conflicts with the enabled PID control
    if (enabled && cascadeControlEnabled) {
      if (
        (type === "temperature" &&
          cascadeControlType === "temperature-cooling") ||
        (type === "power" && cascadeControlType === "power-fuel") ||
        (type === "efficiency" &&
          cascadeControlType === "efficiency-excitation")
      ) {
        setCascadeControlEnabled(false);
        cascadeController.current.setEnabled(false);
      }
    }

    setAutoControlEnabled((prev) => ({
      ...prev,
      [type]: enabled,
    }));

    if (target !== undefined) {
      setAutoControlTargets((prev) => ({
        ...prev,
        [type]: target,
      }));
    }

    // Reset the controller when enabling/disabling
    if (type === "temperature") temperatureController.current.reset();
    if (type === "power") powerController.current.reset();
    if (type === "efficiency") efficiencyController.current.reset();
  };

  // Update PID controller parameters
  const updatePIDParameters = (
    controller: "temperature" | "power" | "efficiency",
    kp?: number,
    ki?: number,
    kd?: number
  ) => {
    if (controller === "temperature") {
      if (kp !== undefined) temperatureController.current.kp = kp;
      if (ki !== undefined) temperatureController.current.ki = ki;
      if (kd !== undefined) temperatureController.current.kd = kd;
    } else if (controller === "power") {
      if (kp !== undefined) powerController.current.kp = kp;
      if (ki !== undefined) powerController.current.ki = ki;
      if (kd !== undefined) powerController.current.kd = kd;
    } else if (controller === "efficiency") {
      if (kp !== undefined) efficiencyController.current.kp = kp;
      if (ki !== undefined) efficiencyController.current.ki = ki;
      if (kd !== undefined) efficiencyController.current.kd = kd;
    }
  };

  // Auto-tune PID controller
  const autoTunePID = async (
    controller: "temperature" | "power" | "efficiency"
  ) => {
    if (!running) return;

    // Temporarily disable other controllers
    const prevAutoControlEnabled = { ...autoControlEnabled };
    setAutoControlEnabled({
      temperature: controller === "temperature",
      power: controller === "power",
      efficiency: controller === "efficiency",
    });

    try {
      if (controller === "temperature") {
        // This would be a real auto-tuning process in a production system
        // For now, we'll just set some reasonable values
        await new Promise((resolve) => setTimeout(resolve, 2000));
        updatePIDParameters("temperature", 2.5, 0.12, 0.6);
      } else if (controller === "power") {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        updatePIDParameters("power", 5.5, 0.25, 1.2);
      } else if (controller === "efficiency") {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        updatePIDParameters("efficiency", 3.5, 0.18, 0.9);
      }
    } finally {
      // Restore previous controller states
      setAutoControlEnabled(prevAutoControlEnabled);
    }
  };

  // Update cascade control settings
  const setCascadeControl = (enabled: boolean) => {
    // Disable conflicting PID controllers
    if (enabled) {
      const newAutoControlEnabled = { ...autoControlEnabled };

      if (
        cascadeControlType === "temperature-cooling" &&
        autoControlEnabled.temperature
      ) {
        newAutoControlEnabled.temperature = false;
      } else if (
        cascadeControlType === "power-fuel" &&
        autoControlEnabled.power
      ) {
        newAutoControlEnabled.power = false;
      } else if (
        cascadeControlType === "efficiency-excitation" &&
        autoControlEnabled.efficiency
      ) {
        newAutoControlEnabled.efficiency = false;
      }

      setAutoControlEnabled(newAutoControlEnabled);
    }

    setCascadeControlEnabled(enabled);
    cascadeController.current.setEnabled(enabled);

    if (enabled) {
      // Set the appropriate setpoint based on cascade type
      if (cascadeControlType === "temperature-cooling") {
        cascadeController.current.setPrimarySetpoint(
          autoControlTargets.temperature
        );
      } else if (cascadeControlType === "power-fuel") {
        cascadeController.current.setPrimarySetpoint(autoControlTargets.power);
      } else if (cascadeControlType === "efficiency-excitation") {
        cascadeController.current.setPrimarySetpoint(
          autoControlTargets.efficiency
        );
      }
    }
  };

  // Update cascade setpoint
  const updateCascadeSetpoint = (setpoint: number) => {
    cascadeController.current.setPrimarySetpoint(setpoint);
    setCascadeControlConfig((prev) => ({
      ...prev,
      primarySetpoint: setpoint,
    }));
  };

  // Update cascade controller parameters
  const updateCascadeParameters = (
    controller: "primary" | "secondary",
    kp?: number,
    ki?: number,
    kd?: number
  ) => {
    cascadeController.current.updateParameters(controller, kp, ki, kd);

    // Update UI state
    const params = cascadeController.current.getParameters();
    setCascadeParameters({
      primary: params.primary,
      secondary: params.secondary,
    });
  };

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
              Time: <span className="font-mono">{Math.floor(time)}s</span>
            </span>
            <ThemeToggle />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="flex items-center flex-wrap gap-2">
            <Button
              variant={running ? "destructive" : "default"}
              size="sm"
              onClick={() => setRunning(!running)}
              className={`flex-shrink-0 shadow-sm border transition-all duration-200 hover:shadow-md active:scale-[0.98] ${
                running
                  ? "border-red-700/80 dark:border-red-700/80 text-white hover:bg-red-800/90"
                  : "border-border/50 hover:border-primary/50"
              }`}
            >
              {running ? (
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
              onClick={resetSimulation}
              className="flex-shrink-0 shadow-sm border border-border/60 transition-all duration-200 hover:bg-muted/60 hover:border-border active:scale-[0.98] hover:shadow"
            >
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Reset
            </Button>

            <div className="flex items-center gap-2 md:hidden">
              <span className="text-xs font-medium bg-muted/80 px-2 py-1 rounded-md border border-border/20">
                Time: <span className="font-mono">{Math.floor(time)}s</span>
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
                value={[simulationSpeed]}
                min={0.1}
                max={5}
                step={0.1}
                onValueChange={(value) => setSimulationSpeed(value[0])}
                className="flex-grow"
              />
              <span className="text-xs font-medium bg-muted/80 px-2 py-1 rounded-md w-10 text-center border border-border/20">
                {simulationSpeed.toFixed(1)}x
              </span>
            </div>

            <div className="hidden md:flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setSimulationSpeed(Math.max(0.1, simulationSpeed / 2))
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
                  setSimulationSpeed(Math.min(10, simulationSpeed * 2))
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
              onClick={toggleEmergencyMode}
              className={`group flex items-center gap-3 px-4 py-2 rounded-lg border shadow-sm transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                emergencyMode
                  ? "bg-red-100/90 dark:bg-red-900/60 border-red-300/80 dark:border-red-800/80 hover:shadow-md"
                  : "bg-muted/60 border-border/40 hover:border-border/70"
              }`}
            >
              <Switch
                id="emergency-mode"
                checked={emergencyMode}
                onCheckedChange={toggleEmergencyMode}
                className={`transition border ${
                  emergencyMode
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
                    emergencyMode
                      ? "text-red-600 dark:text-red-300 opacity-100 animate-pulse"
                      : "text-muted-foreground opacity-0 w-0 -ml-2"
                  }`}
                />
                <span>
                  Emergency Mode
                  <span
                    className={`absolute -right-2 -top-1 h-1.5 w-1.5 rounded-full bg-red-500 transition-opacity duration-200 ${
                      emergencyMode ? "opacity-100 animate-ping" : "opacity-0"
                    }`}
                  ></span>
                </span>
              </Label>
            </div>
          </div>
        </div>
      </header>

      {alerts.length > 0 && (
        <div className="bg-red-900/30 border border-red-500 rounded-md p-3 mb-6 dark:bg-red-950/30">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h3 className="font-bold text-red-500">System Alerts</h3>
          </div>
          <ul className="space-y-1">
            {alerts.map((alert, index) => (
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
                {powerOutput.toFixed(1)} MW
              </div>
              {autoControlEnabled.power && (
                <div className="text-xs text-emerald-500 dark:text-emerald-400 mt-1">
                  Auto: {autoControlTargets.power} MW
                </div>
              )}
              {cascadeControlEnabled && cascadeControlType === "power-fuel" && (
                <div className="text-xs text-purple-500 dark:text-purple-400 mt-1">
                  Cascade: {cascadeControlConfig.primarySetpoint.toFixed(1)} MW
                </div>
              )}
            </div>
            <div className="bg-muted rounded-lg p-3">
              <div className="text-sm text-muted-foreground mb-1">
                Fuel Consumption
              </div>
              <div className="text-2xl font-bold">
                {fuelConsumption.toFixed(1)} L/min
              </div>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <div className="text-sm text-muted-foreground mb-1">
                Engine Temperature
              </div>
              <div className="text-2xl font-bold">
                {engineTemperature.toFixed(1)} °C
              </div>
              {autoControlEnabled.temperature && (
                <div className="text-xs text-emerald-500 dark:text-emerald-400 mt-1">
                  Auto: {autoControlTargets.temperature} °C
                </div>
              )}
              {cascadeControlEnabled &&
                cascadeControlType === "temperature-cooling" && (
                  <div className="text-xs text-purple-500 dark:text-purple-400 mt-1">
                    Cascade: {cascadeControlConfig.primarySetpoint.toFixed(1)}{" "}
                    °C
                  </div>
                )}
            </div>
            <div className="bg-muted rounded-lg p-3">
              <div className="text-sm text-muted-foreground mb-1">
                Efficiency
              </div>
              <div className="text-2xl font-bold">{efficiency.toFixed(1)}%</div>
              {autoControlEnabled.efficiency && (
                <div className="text-xs text-emerald-500 dark:text-emerald-400 mt-1">
                  Auto: {autoControlTargets.efficiency}%
                </div>
              )}
              {cascadeControlEnabled &&
                cascadeControlType === "efficiency-excitation" && (
                  <div className="text-xs text-purple-500 dark:text-purple-400 mt-1">
                    Cascade: {cascadeControlConfig.primarySetpoint.toFixed(1)}%
                  </div>
                )}
            </div>
          </div>
          
          <PowerOutputGraph
            powerData={powerHistory}
            temperatureData={temperatureHistory}
            efficiencyData={efficiencyHistory}
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
                <span className="text-sm">{fuelInjectionRate}%</span>
              </div>
              <Slider
                id="fuel-injection"
                value={[fuelInjectionRate]}
                min={0}
                max={100}
                step={1}
                onValueChange={(value) => setFuelInjectionRate(value[0])}
                disabled={
                  emergencyMode ||
                  autoControlEnabled.power ||
                  (cascadeControlEnabled && cascadeControlType === "power-fuel")
                }
              />
              {autoControlEnabled.power && (
                <div className="text-xs text-emerald-500 dark:text-emerald-400 flex justify-end">
                  Auto-controlled
                </div>
              )}
              {cascadeControlEnabled && cascadeControlType === "power-fuel" && (
                <div className="text-xs text-purple-500 dark:text-purple-400 flex justify-end">
                  Cascade-controlled
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="load">Load Demand</Label>
                <span className="text-sm">{load}%</span>
              </div>
              <Slider
                id="load"
                value={[load]}
                min={0}
                max={100}
                step={1}
                onValueChange={(value) => setLoad(value[0])}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="cooling">Cooling System Power</Label>
                <span className="text-sm">{coolingSystemPower}%</span>
              </div>
              <Slider
                id="cooling"
                value={[coolingSystemPower]}
                min={0}
                max={100}
                step={1}
                onValueChange={(value) => setCoolingSystemPower(value[0])}
                disabled={
                  emergencyMode ||
                  autoControlEnabled.temperature ||
                  (cascadeControlEnabled &&
                    cascadeControlType === "temperature-cooling")
                }
              />
              {autoControlEnabled.temperature && (
                <div className="text-xs text-emerald-500 dark:text-emerald-400 flex justify-end">
                  Auto-controlled
                </div>
              )}
              {cascadeControlEnabled &&
                cascadeControlType === "temperature-cooling" && (
                  <div className="text-xs text-purple-500 dark:text-purple-400 flex justify-end">
                    Cascade-controlled
                  </div>
                )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="excitation">Generator Excitation</Label>
                <span className="text-sm">{generatorExcitation}%</span>
              </div>
              <Slider
                id="excitation"
                value={[generatorExcitation]}
                min={0}
                max={100}
                step={1}
                onValueChange={(value) => setGeneratorExcitation(value[0])}
                disabled={
                  emergencyMode ||
                  autoControlEnabled.efficiency ||
                  (cascadeControlEnabled &&
                    cascadeControlType === "efficiency-excitation")
                }
              />
              {autoControlEnabled.efficiency && (
                <div className="text-xs text-emerald-500 dark:text-emerald-400 flex justify-end">
                  Auto-controlled
                </div>
              )}
              {cascadeControlEnabled &&
                cascadeControlType === "efficiency-excitation" && (
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
                    maintenanceStatus < 30 ? "text-red-500" : ""
                  }`}
                >
                  {maintenanceStatus}%
                </span>
              </div>
              <Slider
                id="maintenance"
                value={[maintenanceStatus]}
                min={0}
                max={100}
                step={1}
                onValueChange={(value) => setMaintenanceStatus(value[0])}
              />
              {maintenanceStatus < 30 && (
                <p className="text-xs text-red-500">Maintenance required!</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="engine" className="w-full">
        <TabsList className="grid grid-cols-8 mb-4">
          <TabsTrigger value="engine">Engine</TabsTrigger>
          <TabsTrigger value="circuit">Circuit</TabsTrigger>
          <TabsTrigger value="emissions">Emissions</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="parameters">Parameters</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="auto" className="flex items-center gap-1">
            <Cpu className="h-3 w-3" />
            Auto Control
          </TabsTrigger>
          <TabsTrigger value="cascade" className="flex items-center gap-1">
            <Layers className="h-3 w-3" />
            Cascade
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
            temperature={engineTemperature}
            fuelRate={fuelInjectionRate}
            load={load}
            running={running}
            rpm={1500 * (load / 100) * (fuelInjectionRate / 50)}
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
            powerOutput={powerOutput}
            generatorExcitation={generatorExcitation}
            load={load}
            running={running}
          />
        </TabsContent>

        <TabsContent
          value="emissions"
          className="bg-card rounded-lg p-4 shadow-sm"
        >
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-500" />
            Emissions Data
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">
                CO₂ Emissions
              </div>
              <div className="text-2xl font-bold mb-2">
                {emissions.co2.toFixed(1)} kg/h
              </div>
              <div className="w-full bg-muted-foreground/20 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full"
                  style={{ width: `${Math.min(emissions.co2, 100)}%` }}
                ></div>
              </div>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">
                NOₓ Emissions
              </div>
              <div className="text-2xl font-bold mb-2">
                {emissions.nox.toFixed(1)} g/kWh
              </div>
              <div className="w-full bg-muted-foreground/20 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    emissions.nox > 80 ? "bg-red-500" : "bg-amber-500"
                  }`}
                  style={{ width: `${Math.min(emissions.nox, 100)}%` }}
                ></div>
              </div>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">
                Particulate Matter
              </div>
              <div className="text-2xl font-bold mb-2">
                {emissions.particulates.toFixed(1)} mg/m³
              </div>
              <div className="w-full bg-muted-foreground/20 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${Math.min(emissions.particulates, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-bold mb-2 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Environmental Impact Analysis
            </h4>
            <p className="text-sm">
              The current operating parameters result in an environmental impact
              score of
              <span className="font-bold">
                {" "}
                {Math.round(
                  (emissions.co2 / 100) * 0.5 +
                    (emissions.nox / 100) * 0.3 +
                    (emissions.particulates / 100) * 0.2 * 100
                )}
                /100
              </span>
              .
              {emissions.nox > 80
                ? " NOₓ emissions are currently exceeding recommended limits. Consider adjusting fuel injection rate or increasing maintenance status."
                : " All emissions are within acceptable parameters."}
            </p>
          </div>
        </TabsContent>

        <TabsContent
          value="system"
          className="bg-card rounded-lg p-4 shadow-sm"
        >
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-500" />
            System Status
          </h3>
          <SystemStatus
            temperature={engineTemperature}
            efficiency={efficiency}
            maintenanceStatus={maintenanceStatus}
            fuelConsumption={fuelConsumption}
            emissions={emissions}
            running={running}
            time={time}
          />
        </TabsContent>

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
              powerOutput,
              fuelConsumption,
              engineTemperature,
              efficiency,
              emissions,
              fuelInjectionRate,
              load,
              coolingSystemPower,
              generatorExcitation,
              maintenanceStatus,
            }}
            time={time}
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
                  setFuelInjectionRate(value);
                  break;
                case "load":
                  setLoad(value);
                  break;
                case "coolingSystemPower":
                  setCoolingSystemPower(value);
                  break;
                case "generatorExcitation":
                  setGeneratorExcitation(value);
                  break;
                case "maintenanceStatus":
                  setMaintenanceStatus(value);
                  break;
              }
            }}
            running={running}
            emergencyMode={emergencyMode}
          />
        </TabsContent>

        <TabsContent value="auto" className="bg-card rounded-lg p-4 shadow-sm">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Cpu className="h-5 w-5 text-cyan-500" />
            Automatic Control Systems
          </h3>
          <AutomaticControls
            autoControlEnabled={autoControlEnabled}
            autoControlTargets={autoControlTargets}
            updateAutoControl={updateAutoControl}
            updatePIDParameters={updatePIDParameters}
            controllerOutputs={controllerOutputs}
            currentValues={{
              temperature: engineTemperature,
              power: powerOutput,
              efficiency,
            }}
            running={running}
            emergencyMode={emergencyMode}
            controllerHistory={controllerHistory}
            autoTunePID={autoTunePID}
          />
        </TabsContent>

        <TabsContent
          value="cascade"
          className="bg-card rounded-lg p-4 shadow-sm"
        >
          <CascadeControlPanel
            cascadeControlEnabled={cascadeControlEnabled}
            setCascadeControlEnabled={setCascadeControl}
            cascadeControlConfig={cascadeControlConfig}
            updateCascadeSetpoint={updateCascadeSetpoint}
            updateCascadeParameters={updateCascadeParameters}
            cascadeParameters={cascadeParameters}
            cascadeHistory={cascadeHistory}
            running={running}
            emergencyMode={emergencyMode}
          />
        </TabsContent>
      </Tabs>

      {/* <footer className="mt-6 text-center text-sm text-muted-foreground">
        <p>Diesel Power Plant Simulator - Electrical Engineering Project</p>
        <p className="text-xs mt-1">
          This simulation uses mathematical models to represent real-world
          physics and engineering principles.
        </p>
      </footer> */}
    </div>
  );
}
