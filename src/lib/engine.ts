import { create } from 'zustand';
import {
  calculatePowerOutput,
  calculateFuelConsumption,
  calculateTemperature,
  calculateEfficiency,
  calculateEmissions
} from "./simulation";
import { PIDController } from "./pid-controller";
import { CascadeController, type CascadeControllerConfig } from "./cascade-controller";

export interface EngineState {
  // Simulation state
  running: boolean;
  simulationSpeed: number;
  time: number;

  // Plant parameters
  fuelInjectionRate: number;
  load: number;
  coolingSystemPower: number;
  generatorExcitation: number;
  maintenanceStatus: number;
  emergencyMode: boolean;

  // Calculated outputs
  powerOutput: number;
  fuelConsumption: number;
  engineTemperature: number;
  efficiency: number;
  emissions: {
    co2: number;
    nox: number;
    particulates: number;
  };
  alerts: string[];

  // Historical data
  powerHistory: Array<{ time: number; value: number }>;
  temperatureHistory: Array<{ time: number; value: number }>;
  efficiencyHistory: Array<{ time: number; value: number }>;

  // Automatic control systems
  autoControlEnabled: {
    temperature: boolean;
    power: boolean;
    efficiency: boolean;
  };
  autoControlTargets: {
    temperature: number;
    power: number;
    efficiency: number;
  };

  // Controller outputs
  controllerOutputs: {
    cooling: number;
    fuel: number;
    excitation: number;
  };

  // Controller history
  controllerHistory: {
    temperature: Array<{ time: number; value: number; setpoint: number }>;
    power: Array<{ time: number; value: number; setpoint: number }>;
    efficiency: Array<{ time: number; value: number; setpoint: number }>;
  };

  // Cascade control
  cascadeControlEnabled: boolean;
  cascadeControlType: string;
  cascadeControlConfig: {
    type: string;
    primarySetpoint: number;
    primaryMeasurement: number;
    primaryOutput: number;
    secondarySetpoint: number;
    secondaryMeasurement: number;
    secondaryOutput: number;
  };
  cascadeParameters: {
    primary: { kp: number; ki: number; kd: number };
    secondary: { kp: number; ki: number; kd: number };
  };
  cascadeHistory: any[];

  // Actions
  setRunning: (isRunning: boolean) => void;
  setSimulationSpeed: (speed: number) => void;
  resetSimulation: () => void;
  toggleEmergencyMode: () => void;
  updateSimulation: (deltaTime: number) => void;

  // Plant control actions
  setFuelInjectionRate: (rate: number) => void;
  setLoad: (load: number) => void;
  setCoolingSystemPower: (power: number) => void;
  setGeneratorExcitation: (excitation: number) => void;
  setMaintenanceStatus: (status: number) => void;

  // Auto control actions
  updateAutoControl: (type: "temperature" | "power" | "efficiency", enabled: boolean, target?: number) => void;
  updatePIDParameters: (controller: "temperature" | "power" | "efficiency", kp?: number, ki?: number, kd?: number) => void;
  autoTunePID: (controller: "temperature" | "power" | "efficiency") => Promise<void>;

  // Cascade control actions
  setCascadeControl: (enabled: boolean) => void;
  setCascadeControlType: (type: string) => void;
  updateCascadeSetpoint: (setpoint: number) => void;
  updateCascadeParameters: (controller: "primary" | "secondary", kp?: number, ki?: number, kd?: number) => void;
}

// Initialize controllers
const temperatureController = new PIDController(2.0, 0.1, 0.5, 0, 100);
const powerController = new PIDController(5.0, 0.2, 1.0, 0, 100);
const efficiencyController = new PIDController(3.0, 0.15, 0.8, 0, 100);

// Use derivative on measurement to avoid derivative kick on setpoint changes
temperatureController.setMode(true, false);
powerController.setMode(true, false);
efficiencyController.setMode(true, false);

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
  primarySetpoint: 75, // Default temperature setpoint for Temp-Cooling
  secondarySetpointOffset: 0,
  secondarySetpointScale: 1,
};

const cascadeController = new CascadeController(cascadeControllerConfig);

export const useEngineStore = create<EngineState>((set, get) => ({
  // Initial state
  running: false,
  simulationSpeed: 1,
  time: 0,

  fuelInjectionRate: 70,
  load: 80,
  coolingSystemPower: 60,
  generatorExcitation: 80,
  maintenanceStatus: 100,
  emergencyMode: false,

  powerOutput: 0,
  fuelConsumption: 0,
  engineTemperature: 25,
  efficiency: 0,
  emissions: { co2: 0, nox: 0, particulates: 0 },
  alerts: [],

  powerHistory: [],
  temperatureHistory: [],
  efficiencyHistory: [],

  autoControlEnabled: {
    temperature: false,
    power: false,
    efficiency: false,
  },
  autoControlTargets: {
    temperature: 75,
    power: 50,
    efficiency: 45,
  },

  controllerOutputs: {
    cooling: 0,
    fuel: 0,
    excitation: 0,
  },
  controllerHistory: {
    temperature: [],
    power: [],
    efficiency: [],
  },

  cascadeControlEnabled: false,
  cascadeControlType: "temperature-cooling",
  cascadeControlConfig: {
    type: "temperature-cooling",
    primarySetpoint: 75,
    primaryMeasurement: 25,
    primaryOutput: 0,
    secondarySetpoint: 0,
    secondaryMeasurement: 0,
    secondaryOutput: 0,
  },
  cascadeParameters: {
    primary: { kp: 1.5, ki: 0.05, kd: 0.3 },
    secondary: { kp: 3.0, ki: 0.1, kd: 0.5 },
  },
  cascadeHistory: [],

  // Actions
  setRunning: (isRunning) => set({ running: isRunning }),
  setSimulationSpeed: (speed) => set({ simulationSpeed: speed }),

  resetSimulation: () => {
    // Reset engine state
    temperatureController.reset();
    powerController.reset();
    efficiencyController.reset();
    cascadeController.reset();

    set({
      running: false,
      time: 0,
      fuelInjectionRate: 70,
      load: 80,
      coolingSystemPower: 60,
      generatorExcitation: 80,
      maintenanceStatus: 100,
      emergencyMode: false,
      powerOutput: 0,
      fuelConsumption: 0,
      engineTemperature: 25,
      efficiency: 0,
      emissions: { co2: 0, nox: 0, particulates: 0 },
      alerts: [],
      powerHistory: [],
      temperatureHistory: [],
      efficiencyHistory: [],
      controllerOutputs: {
        cooling: 0,
        fuel: 0,
        excitation: 0,
      },
      controllerHistory: {
        temperature: [],
        power: [],
        efficiency: [],
      },
      cascadeHistory: [],
      autoControlEnabled: get().autoControlEnabled,
      autoControlTargets: get().autoControlTargets,

      cascadeControlEnabled: get().cascadeControlEnabled, // Keep enabled state
      cascadeControlType: get().cascadeControlType,

      cascadeControlConfig: {
        type: get().cascadeControlType,
        primarySetpoint: get().cascadeControlConfig.primarySetpoint, // Keep setpoint
        primaryMeasurement: 25, // Reset measurement
        primaryOutput: 0,
        secondarySetpoint: 0,
        secondaryMeasurement: 0,
        secondaryOutput: 0,
      },
      cascadeParameters: get().cascadeParameters, // Keep parameters
    });
  },

  toggleEmergencyMode: () => {
    const newMode = !get().emergencyMode;

    if (newMode) {
      // Emergency mode settings
      set({
        fuelInjectionRate: 90,
        coolingSystemPower: 100,
        generatorExcitation: 100,
        autoControlEnabled: {
          temperature: false,
          power: false,
          efficiency: false,
        },
        cascadeControlEnabled: false,
        emergencyMode: true,
      });

      // temperatureController.setEnabled(false);
      // powerController.setEnabled(false);
      // efficiencyController.setEnabled(false);
      cascadeController.setEnabled(false);
    } else {
      set({ emergencyMode: false });
    }
  },

  updateSimulation: (deltaTime) => {
    const state = get();
    const {
      running,
      simulationSpeed,
      autoControlEnabled,
      autoControlTargets,
      cascadeControlEnabled,
      cascadeControlType,
      emergencyMode,
      engineTemperature,
      powerOutput,
      efficiency,
      fuelInjectionRate,
      load,
      coolingSystemPower,
      generatorExcitation,
      maintenanceStatus,
      time
    } = state;

    if (!running) return;

    // Calculate effective deltaTime based on simulation speed
    const effectiveDeltaTime = deltaTime * simulationSpeed;

    // Calculate new time
    const newTime = time + effectiveDeltaTime;

    // Apply automatic controls if enabled
    let newCoolingPower = coolingSystemPower;
    let newFuelRate = fuelInjectionRate;
    let newExcitation = generatorExcitation;

    // Handle cascade control if enabled
    if (cascadeControlEnabled && !emergencyMode) {
      // Update cascade controller based on type
      if (cascadeControlType === "temperature-cooling") {
        // Temperature -> Cooling cascade
        const output = cascadeController.update(
          engineTemperature,
          coolingSystemPower,
          deltaTime
        );
        newCoolingPower = Math.max(0, Math.min(100, output));
      } else if (cascadeControlType === "power-fuel") {
        // Power -> Fuel cascade
        const output = cascadeController.update(
          powerOutput,
          fuelInjectionRate,
          deltaTime
        );
        newFuelRate = Math.max(0, Math.min(100, output));
      } else if (cascadeControlType === "efficiency-excitation") {
        // Efficiency -> Excitation cascade
        const output = cascadeController.update(
          efficiency,
          generatorExcitation,
          deltaTime
        );
        newExcitation = Math.max(0, Math.min(100, output));
      }

      // Update cascade control state for UI
      const controllerState = cascadeController.getState();
      set({
        cascadeControlConfig: {
          type: cascadeControlType,
          primarySetpoint: controllerState.primarySetpoint,
          primaryMeasurement: controllerState.primaryMeasurement,
          primaryOutput: controllerState.primaryOutput,
          secondarySetpoint: controllerState.secondarySetpoint,
          secondaryMeasurement: controllerState.secondaryMeasurement,
          secondaryOutput: controllerState.secondaryOutput,
        },
        cascadeHistory: cascadeController.getHistory(),
        coolingSystemPower: cascadeControlType === "temperature-cooling" ? newCoolingPower : coolingSystemPower,
        fuelInjectionRate: cascadeControlType === "power-fuel" ? newFuelRate : fuelInjectionRate,
        generatorExcitation: cascadeControlType === "efficiency-excitation" ? newExcitation : generatorExcitation,
      });
    }
    // Apply regular PID control if cascade is not enabled
    else if (!cascadeControlEnabled) {
      let newControllerOutputs = { ...state.controllerOutputs };
      let newControllerHistory = { ...state.controllerHistory };

      if (autoControlEnabled.temperature && !emergencyMode) {
        // Temperature control via cooling system
        const coolingOutput = temperatureController.update(
          autoControlTargets.temperature,
          engineTemperature,
          deltaTime
        );
        newCoolingPower = Math.max(0, Math.min(100, coolingOutput));
        newControllerOutputs.cooling = coolingOutput;
        newControllerHistory.temperature = temperatureController.getHistory().map(entry => ({
          time: entry.time,
          value: entry.measurement,
          setpoint: entry.setpoint,
        }));
      }

      if (autoControlEnabled.power && !emergencyMode) {
        // Power control via fuel injection
        const fuelOutput = powerController.update(
          autoControlTargets.power,
          powerOutput,
          deltaTime
        );
        newFuelRate = Math.max(0, Math.min(100, fuelOutput));
        newControllerOutputs.fuel = fuelOutput;
        newControllerHistory.power = powerController.getHistory().map(entry => ({
          time: entry.time,
          value: entry.measurement,
          setpoint: entry.setpoint,
        }));
      }

      if (autoControlEnabled.efficiency && !emergencyMode) {
        // Efficiency control via generator excitation
        const excitationOutput = efficiencyController.update(
          autoControlTargets.efficiency,
          efficiency,
          deltaTime
        );
        newExcitation = Math.max(0, Math.min(100, excitationOutput));
        newControllerOutputs.excitation = excitationOutput;
        newControllerHistory.efficiency = efficiencyController.getHistory().map(entry => ({
          time: entry.time,
          value: entry.measurement,
          setpoint: entry.setpoint,
        }));
      }

      set({
        coolingSystemPower: newCoolingPower,
        fuelInjectionRate: newFuelRate,
        generatorExcitation: newExcitation,
        controllerOutputs: newControllerOutputs,
        controllerHistory: newControllerHistory
      });
    }

    // Calculate new values based on current parameters and time

    const newPowerOutput = calculatePowerOutput(
      newFuelRate,
      load,
      engineTemperature,
      newExcitation,
      maintenanceStatus,
      newTime
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
      effectiveDeltaTime
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

    // Check for alerts
    const currentAlerts: string[] = [];
    if (newTemperature > 95) currentAlerts.push("Engine temperature critical!");
    if (newEfficiency < 5) currentAlerts.push("Low efficiency warning");
    if (maintenanceStatus < 30) currentAlerts.push("Maintenance required");
    if (newEmissions.nox > 80) currentAlerts.push("NOx emissions exceeding limits");

    // Update historical data for graphs
    let newPowerHistory = [...state.powerHistory];
    let newTemperatureHistory = [...state.temperatureHistory];
    let newEfficiencyHistory = [...state.efficiencyHistory];

    if (Math.floor(newTime) > Math.floor(time)) {
      newPowerHistory = [...newPowerHistory, { time: newTime, value: newPowerOutput }].slice(-100);
      newTemperatureHistory = [...newTemperatureHistory, { time: newTime, value: newTemperature }].slice(-100);
      newEfficiencyHistory = [...newEfficiencyHistory, { time: newTime, value: newEfficiency }].slice(-100);
    }

    // Update state with new calculated values
    set({
      time: newTime,
      fuelInjectionRate: newFuelRate,
      coolingSystemPower: newCoolingPower,
      generatorExcitation: newExcitation,

      powerOutput: newPowerOutput,
      fuelConsumption: newFuelConsumption,
      engineTemperature: newTemperature,
      efficiency: newEfficiency,
      emissions: newEmissions,
      alerts: currentAlerts,

      powerHistory: newPowerHistory,
      temperatureHistory: newTemperatureHistory,
      efficiencyHistory: newEfficiencyHistory,

    });
  },

  // Plant control actions
  setFuelInjectionRate: (rate) => set({ fuelInjectionRate: rate }),
  setLoad: (load) => set({ load }),
  setCoolingSystemPower: (power) => set({ coolingSystemPower: power }),
  setGeneratorExcitation: (excitation) => set({ generatorExcitation: excitation }),
  setMaintenanceStatus: (status) => set({ maintenanceStatus: status }),

  // Auto control actions
  updateAutoControl: (type, enabled, target) => {
    const state = get();

    // Disable cascade control if it conflicts with the enabled PID control
    if (enabled && state.cascadeControlEnabled) {
      if (
        (type === "temperature" && state.cascadeControlType === "temperature-cooling") ||
        (type === "power" && state.cascadeControlType === "power-fuel") ||
        (type === "efficiency" && state.cascadeControlType === "efficiency-excitation")
      ) {
        set({ cascadeControlEnabled: false });
        cascadeController.setEnabled(false);
      }
    }

    set(state => ({
      autoControlEnabled: {
        ...state.autoControlEnabled,
        [type]: enabled,
      },
      autoControlTargets: target !== undefined ? {
        ...state.autoControlTargets,
        [type]: target,
      } : state.autoControlTargets
    }));

    // Reset the controller when enabling/disabling
    if (type === "temperature") temperatureController.reset();
    if (type === "power") powerController.reset();
    if (type === "efficiency") efficiencyController.reset();
  },

  updatePIDParameters: (controller, kp, ki, kd) => {
    if (controller === "temperature") {
      if (kp !== undefined) temperatureController.kp = kp;
      if (ki !== undefined) temperatureController.ki = ki;
      if (kd !== undefined) temperatureController.kd = kd;
    } else if (controller === "power") {
      if (kp !== undefined) powerController.kp = kp;
      if (ki !== undefined) powerController.ki = ki;
      if (kd !== undefined) powerController.kd = kd;
    } else if (controller === "efficiency") {
      if (kp !== undefined) efficiencyController.kp = kp;
      if (ki !== undefined) efficiencyController.ki = ki;
      if (kd !== undefined) efficiencyController.kd = kd;
    }
  },

  autoTunePID: async (controller) => {
    if (!get().running) return Promise.resolve();

    const prevAutoControlEnabled = { ...get().autoControlEnabled };

    // Temporarily disable other controllers
    set({
      autoControlEnabled: {
        temperature: controller === "temperature",
        power: controller === "power",
        efficiency: controller === "efficiency",
      }
    });

    try {
      if (controller === "temperature") {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        temperatureController.kp = 2.5;
        temperatureController.ki = 0.12;
        temperatureController.kd = 0.6;
      } else if (controller === "power") {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        powerController.kp = 5.5;
        powerController.ki = 0.25;
        powerController.kd = 1.2;
      } else if (controller === "efficiency") {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        efficiencyController.kp = 3.5;
        efficiencyController.ki = 0.18;
        efficiencyController.kd = 0.9;
      }
    } finally {
      // Restore previous controller states
      set({ autoControlEnabled: prevAutoControlEnabled });
    }

    return Promise.resolve();
  },

  // Cascade control actions
  setCascadeControl: (enabled) => {
    const state = get();

    // Disable conflicting PID controllers
    if (enabled) {
      const newAutoControlEnabled = { ...state.autoControlEnabled };

      if (
        state.cascadeControlType === "temperature-cooling" &&
        state.autoControlEnabled.temperature
      ) {
        newAutoControlEnabled.temperature = false;
      } else if (
        state.cascadeControlType === "power-fuel" &&
        state.autoControlEnabled.power
      ) {
        newAutoControlEnabled.power = false;
      } else if (
        state.cascadeControlType === "efficiency-excitation" &&
        state.autoControlEnabled.efficiency
      ) {
        newAutoControlEnabled.efficiency = false;
      }

      set({ autoControlEnabled: newAutoControlEnabled });
    }

    cascadeController.setEnabled(enabled);

    if (enabled) {
      // Set the appropriate setpoint based on cascade type
      if (state.cascadeControlType === "temperature-cooling") {
        cascadeController.setPrimarySetpoint(state.autoControlTargets.temperature);
      } else if (state.cascadeControlType === "power-fuel") {
        cascadeController.setPrimarySetpoint(state.autoControlTargets.power);
      } else if (state.cascadeControlType === "efficiency-excitation") {
        cascadeController.setPrimarySetpoint(state.autoControlTargets.efficiency);
      }
    }

    set({ cascadeControlEnabled: enabled });
  },

  setCascadeControlType: (type) => set({ cascadeControlType: type }),

  updateCascadeSetpoint: (setpoint) => {
    cascadeController.setPrimarySetpoint(setpoint);
    set(state => ({
      cascadeControlConfig: {
        ...state.cascadeControlConfig,
        primarySetpoint: setpoint,
      }
    }));
  },

  updateCascadeParameters: (controller, kp, ki, kd) => {
    cascadeController.updateParameters(controller, kp, ki, kd);

    // Update UI state
    const params = cascadeController.getParameters();
    set({
      cascadeParameters: {
        primary: params.primary,
        secondary: params.secondary,
      }
    });
  },
}));