// System Constants
export const ENGINE_CONSTANTS = {
  MAX_POWER: 25, // Maximum power output in MW
  RATED_RPM: 500, // Rated RPM for large industrial diesel engine
  IDLE_RPM: 200, // Idle speed RPM
  AMBIENT_TEMP: 25, // Ambient temperature in °C
  OPTIMAL_TEMP: 85, // Optimal operating temperature in °C
  THERMAL_DANGER: 98, // Temperature danger threshold
  SPECIFIC_HEAT_CAPACITY_AIR: 1.005, // kJ/kgK (approx for exhaust gases)
  ENGINE_THERMAL_MASS: 35700, // kJ/°C (effective thermal mass of the engine block, fluids etc.) - Increased for slower, more realistic changes
  MAX_HEAT_GENERATION_RATE: 35000, // kW (thermal power at max load/rpm, related to MAX_POWER * (1/efficiency - 1))
  MAX_COOLING_POWER_RATE: 40000, // kW (max heat dissipation capability of the cooling system)
  AMBIENT_HEAT_TRANSFER_COEFFICIENT: 0.5, // kW/°C (heat loss to ambient)
  NOMINAL_FUEL_RATE: 85, // Nominal fuel consumption at rated power (L/hour)
  MAX_TORQUE_RPM: 250, // RPM at max torque
  MOMENT_OF_INERTIA: 17500, // Engine moment of inertia in kg·m² (large flywheel effect)
  RPM_TIME_CONSTANT: 8, // Time constant for RPM changes in seconds
  TEMPERATURE_TIME_CONSTANT: 8, // Time constant for temperature changes in seconds
  STARTUP_DURATION: 0, // Duration for engine to reach stable idle in seconds
  SHUTDOWN_DURATION: 5, // Duration for engine to cool down in seconds 
};

// Internal engine state tracking for smoother transitions
let engineState = {
  startupProgress: 0, // 0-1 value representing startup progression
  startupTime: 0,     // Time spent in startup sequence
  isStarting: false,  // Flag to indicate if engine is in startup sequence
  shutdownProgress: 0, // 0-1 value representing shutdown progression
  shutdownTime: 0,     // Time spent in shutdown sequence
  isShuttingDown: false, // Flag to indicate if engine is in shutdown sequence
  wasRunning: false,   // Flag to track if engine was previously running
  targetRpm: 0,       // Target RPM based on controls
  lastTimestamp: 0,   // Last timestamp for deltaTime calcs
};

/**
 * Calculate sigmoid value for smooth transitions
 * Returns value between 0-1
 */
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Normalized sigmoid from 0-1 for x from -6 to 6
 */
function normalizedSigmoid(x: number): number {
  // Map x from 0-1 to -6 to 6 range for sigmoid
  const remapped = (x * 12) - 6;
  // Get sigmoid and normalize to 0-1 range
  return (sigmoid(remapped) - sigmoid(-6)) / (sigmoid(6) - sigmoid(-6));
}

/**
 * Process engine startup sequence
 */
export function processStartup(
  isRunning: boolean,
  deltaTime: number
): number {
  // Track running state changes
  const wasRunningBefore = engineState.wasRunning;
  engineState.wasRunning = isRunning;

  // Engine was just turned off - initiate shutdown
  if (wasRunningBefore && !isRunning) {
    engineState.isShuttingDown = true;
    engineState.shutdownTime = 0;
    engineState.shutdownProgress = 0;
    engineState.isStarting = false;
  }

  // Start the sequence when engine is turned on from off state
  if (isRunning && !engineState.isStarting && engineState.startupProgress === 0) {
    engineState.isStarting = true;
    engineState.startupTime = 0;
    engineState.isShuttingDown = false;
    engineState.shutdownProgress = 0;
  }

  // Process startup sequence
  if (engineState.isStarting) {
    // Make sure we use the actual deltaTime value, not scaled
    engineState.startupTime += deltaTime;

    // Calculate progress as a fraction of startup duration with sigmoid curve
    const linearProgress = Math.min(1, engineState.startupTime / ENGINE_CONSTANTS.STARTUP_DURATION);
    engineState.startupProgress = normalizedSigmoid(linearProgress);

    // If startup completed
    if (engineState.startupTime >= ENGINE_CONSTANTS.STARTUP_DURATION) {
      engineState.isStarting = false;
      engineState.startupProgress = 1;
    }

    return engineState.startupProgress;
  }

  // Process shutdown sequence
  if (engineState.isShuttingDown) {
    engineState.shutdownTime += deltaTime;

    // Calculate shutdown progress (inverse of startup - from 1 to 0)
    const linearProgress = Math.min(1, engineState.shutdownTime / ENGINE_CONSTANTS.SHUTDOWN_DURATION);
    engineState.shutdownProgress = 1 - normalizedSigmoid(linearProgress);

    // If shutdown completed
    if (engineState.shutdownTime >= ENGINE_CONSTANTS.SHUTDOWN_DURATION) {
      engineState.isShuttingDown = false;
      engineState.shutdownProgress = 0;
      engineState.startupProgress = 0; // Reset startup progress too
    }

    return engineState.shutdownProgress;
  }

  // Not in startup or shutdown - return appropriate value
  return isRunning ? 1 : 0;
}

/**
 * Calculate target RPM based on control settings
 */
export function calculateTargetRPM(
  fuelInjectionRate: number,
  load: number,
  isRunning: boolean
): number {
  if (!isRunning) return 0;

  // Base RPM based on fuel rate
  const baseRpm = ENGINE_CONSTANTS.IDLE_RPM +
    (fuelInjectionRate / 100) * (ENGINE_CONSTANTS.RATED_RPM - ENGINE_CONSTANTS.IDLE_RPM);

  // Load effect: high load tends to slow down engine slightly without governor action
  const loadEffect = (load / 100) * 15;

  engineState.targetRpm = Math.max(ENGINE_CONSTANTS.IDLE_RPM, baseRpm - loadEffect);
  return engineState.targetRpm;
}

/**
 * Calculate RPM with gradual changes based on physical properties
 */
export function calculateRPM(
  currentRpm: number,
  fuelInjectionRate: number,
  load: number,
  isRunning: boolean,
  deltaTime: number
): number {
  // Process startup or shutdown sequence and get the appropriate factor
  const transitionFactor = processStartup(isRunning, deltaTime);

  // Engine is not running and not in transition - no RPM
  if (!isRunning && !engineState.isShuttingDown) return 0;

  // During startup sequence
  if (engineState.isStarting) {
    // Gradually ramp up to idle RPM using sigmoid curve - no random variations during startup
    return ENGINE_CONSTANTS.IDLE_RPM * transitionFactor;
  }

  // During shutdown sequence
  if (engineState.isShuttingDown) {
    // Gradually ramp down from current RPM to zero - no random variations during shutdown
    const targetShutdownRpm = Math.max(currentRpm, ENGINE_CONSTANTS.IDLE_RPM);
    return targetShutdownRpm * transitionFactor;
  }

  // Normal operation after startup
  // Get the target RPM from fuel settings
  const targetRpm = calculateTargetRPM(fuelInjectionRate, load, isRunning);

  // First-order response model based on engine inertia 
  const rpmDifference = targetRpm - currentRpm;
  const rpmChangeRate = rpmDifference / ENGINE_CONSTANTS.RPM_TIME_CONSTANT;
  let newRpm = currentRpm + rpmChangeRate * deltaTime;

  // Apply load resistance - heavier loads require more time to accelerate
  const loadResistance = 1 + (load / 100) * 0.5;
  if (rpmDifference > 0) {
    // When accelerating, apply load resistance
    newRpm = currentRpm + (rpmChangeRate / loadResistance) * deltaTime;
  } else {
    // When decelerating, apply slight boost due to engine braking
    newRpm = currentRpm + rpmChangeRate * deltaTime * 1.2;
  }

  // Add small random variations (engine roughness) - only during normal operation
  const roughness = (Math.random() - 0.5) * (Math.min(5, currentRpm / 50));
  newRpm += roughness;

  // Ensure RPM never goes below 0
  return Math.max(0, newRpm);
}

/**
 * Calculate true power output based on all physical factors
 */
export function calculatePowerOutput(
  fuelInjectionRate: number,
  load: number,
  temperature: number,
  generatorExcitation: number,
  maintenanceStatus: number,
  rpm: number
): number {
  // A stationary engine produces no power
  if (rpm < ENGINE_CONSTANTS.IDLE_RPM * 0.9) return 0;

  // Base power calculation based on fuel, load and max capacity
  const normalizedRpm = Math.min(rpm / ENGINE_CONSTANTS.RATED_RPM, 1.05);
  const basePower = (fuelInjectionRate / 100) * (load / 100) * ENGINE_CONSTANTS.MAX_POWER;

  // RPM efficiency curve - engines are most efficient near rated RPM
  const rpmEfficiency = 1 - 0.5 * Math.pow((normalizedRpm - 1), 2);

  // Temperature efficiency factor - cold engines are less efficient
  let tempFactor = 1.0;
  if (temperature < 60) {
    // Cold engine inefficiency
    tempFactor = 0.7 + (temperature - 40) / 80;
  } else if (temperature > 95) {
    // Overheating engine inefficiency
    tempFactor = 1.0 - (temperature - 95) / 25;
  }

  // Generator excitation affects power output (0.7-1.1 range)
  const excitationFactor = 0.7 + (generatorExcitation / 100) * 0.4;

  // Maintenance factor - poorly maintained engines lose power
  const maintenanceFactor = 0.7 + (maintenanceStatus / 100) * 0.3;

  // Apply all factors
  const calculatedPower = basePower * rpmEfficiency * tempFactor *
    excitationFactor * maintenanceFactor;

  // Add small random variations - but not during startup/shutdown transitions
  const isInTransition = engineState.isStarting || engineState.isShuttingDown;
  const variationFactor = isInTransition ? 1.0 : (0.99 + Math.random() * 0.02);

  // Add slight oscillations - but not during transitions
  const oscillationFactor = isInTransition ? 1.0 : (1 + Math.sin(Date.now() / 5000) * 0.01);

  return Math.max(0, calculatedPower * variationFactor * oscillationFactor);
}

/**
 * Calculate fuel consumption in liters per hour
 */
export function calculateFuelConsumption(
  fuelInjectionRate: number,
  rpm: number,
  load: number,
  efficiency: number
): number {
  // No fuel consumption when engine is stopped
  if (rpm < 10) return 0;

  // Base consumption scaled by engine size
  const rpmFactor = rpm / ENGINE_CONSTANTS.RATED_RPM;
  const baseFuelFlow = (fuelInjectionRate / 100) * ENGINE_CONSTANTS.NOMINAL_FUEL_RATE;

  // Efficiency adjustment - more efficient engines use less fuel
  const efficiencyAdjustment = 1.0 - ((efficiency || 1) / 100) * 0.2;

  // RPM adjustment - less efficient at idle and over-speed
  const rpmEfficiency = 1 + Math.pow((rpmFactor - 0.9), 2) * 0.3;

  // Calculate actual consumption
  const actualConsumption = baseFuelFlow * rpmEfficiency * efficiencyAdjustment;

  // Add small random variations - but not during startup/shutdown
  const isInTransition = engineState.isStarting || engineState.isShuttingDown;
  const randomFactor = isInTransition ? 1.0 : (0.98 + Math.random() * 0.04);

  return actualConsumption * randomFactor;
}

export function calculateTemperature(
  currentTemperature: number,
  fuelInjectionRate: number, // %
  coolingSystemPower: number, // % of max cooling capacity used
  load: number, // %
  rpm: number,
  isRunning: boolean,
  deltaTime: number // seconds
): number {
  if (!isRunning && !engineState.isShuttingDown) {
    // If engine is off and not shutting down, gradually cool to ambient
    const coolingToAmbientRate = (ENGINE_CONSTANTS.AMBIENT_TEMP - currentTemperature) * 0.001; // Slow cooling
    return Math.max(ENGINE_CONSTANTS.AMBIENT_TEMP, currentTemperature + coolingToAmbientRate * deltaTime);
  }

  // 1. Heat Generation (kW)
  // Heat generated is proportional to fuel consumed, which relates to power output and efficiency.
  // A simpler model: proportional to fuel rate, load, and RPM, scaled to MAX_HEAT_GENERATION_RATE.
  const rpmFactor = Math.min(1, rpm / ENGINE_CONSTANTS.RATED_RPM);
  const loadFactor = load / 100;
  const fuelFactor = fuelInjectionRate / 100;
  // Consider that not all fuel energy becomes mechanical power; much is heat.
  // If powerOutput is available, a more accurate heat generation = powerOutput * (1/efficiency - 1)
  // For now, a simpler proportional model:
  let heatGenerated_kW = 0;
  if (rpm > ENGINE_CONSTANTS.IDLE_RPM * 0.5) { // Only generate significant heat if running above very low idle
    heatGenerated_kW = ENGINE_CONSTANTS.MAX_HEAT_GENERATION_RATE * fuelFactor * loadFactor * rpmFactor * 0.7; // 0.7 is an adjustment factor
    // Add a base heat generation for idling
    if (loadFactor < 0.1) { // If very low load (idle)
      heatGenerated_kW += ENGINE_CONSTANTS.MAX_HEAT_GENERATION_RATE * fuelFactor * rpmFactor * 0.05;
    }
  }


  // 2. Heat Dissipation by Cooling System (kW)
  const coolingSystemEffectiveness = coolingSystemPower / 100;
  // Cooling is more effective if the engine is hotter than ambient
  const tempDiffEngineToAmbient = Math.max(0, currentTemperature - ENGINE_CONSTANTS.AMBIENT_TEMP);
  // Make cooling effectiveness also dependent on temperature difference for realism
  const coolingFactor = Math.min(1, tempDiffEngineToAmbient / (ENGINE_CONSTANTS.OPTIMAL_TEMP - ENGINE_CONSTANTS.AMBIENT_TEMP + 10)); // Becomes fully effective around optimal temp
  const heatRemovedByCooling_kW = ENGINE_CONSTANTS.MAX_COOLING_POWER_RATE * coolingSystemEffectiveness * coolingFactor;

  // 3. Heat Loss to Ambient (kW)
  const heatLossToAmbient_kW = (currentTemperature - ENGINE_CONSTANTS.AMBIENT_TEMP) * ENGINE_CONSTANTS.AMBIENT_HEAT_TRANSFER_COEFFICIENT;

  // 4. Net Heat Power (kW)
  const netHeatPower_kW = heatGenerated_kW - heatRemovedByCooling_kW - heatLossToAmbient_kW;

  // 5. Temperature Change (°C)
  // delta_Temp = (NetHeatPower_kW * deltaTime_seconds) / ENGINE_THERMAL_MASS_kJ_per_C
  const temperatureChange = (netHeatPower_kW * deltaTime) / ENGINE_CONSTANTS.ENGINE_THERMAL_MASS;
  let newTemperature = currentTemperature + temperatureChange;

  // Clamp temperature to a minimum of ambient
  newTemperature = Math.max(ENGINE_CONSTANTS.AMBIENT_TEMP, newTemperature);
  // Optional: Clamp to a maximum survivable temperature (e.g., 150°C) to prevent runaway
  newTemperature = Math.min(150, newTemperature);


  // No random variations during startup/shutdown for stability
  if (engineState.isStarting || engineState.isShuttingDown) {
    return newTemperature;
  }

  // Add small random variations for realism during normal operation
  const randomFactor = (0.999 + Math.random() * 0.002);
  return newTemperature * randomFactor;
}

/**
 * Get engine state information
 */
export function getEngineState() {
  return {
    isStarting: engineState.isStarting,
    isShuttingDown: engineState.isShuttingDown,
    startupProgress: engineState.startupProgress,
    shutdownProgress: engineState.shutdownProgress,
    targetRpm: engineState.targetRpm
  };
}

/**
 * Reset the engine state
 */
export function resetEngineState(): void {
  engineState = {
    startupProgress: 0,
    startupTime: 0,
    isStarting: false,
    shutdownProgress: 0,
    shutdownTime: 0,
    isShuttingDown: false,
    wasRunning: false,
    targetRpm: 0,
    lastTimestamp: 0
  };
}

/**
 * Calculate efficiency based on all operating parameters
 */
export function calculateEfficiency(
  temperature: number,
  fuelInjectionRate: number,
  load: number,
  rpm: number,
  maintenanceStatus: number
): number {
  // Base efficiency for a modern diesel generator
  let efficiency = 35; // Start at 35% baseline

  // RPM factor - optimal efficiency near rated RPM
  const rpmRatio = rpm / ENGINE_CONSTANTS.RATED_RPM;
  const rpmFactor = 1.0 - 0.5 * Math.pow((rpmRatio - 1), 2);

  // Temperature factor - optimal temperature is around 85°C
  const tempDelta = Math.abs(temperature - ENGINE_CONSTANTS.OPTIMAL_TEMP);
  // Efficiency drops as temperature moves away from optimal
  const tempFactor = 1.0 - Math.pow(tempDelta / 60, 2);

  // Fuel injection factor - optimal is around 75-85% for most diesel engines
  let fuelFactor = 1.0;
  if (fuelInjectionRate < 50) {
    // Inefficient at low fuel rates (lean mixture)
    fuelFactor = 0.8 + fuelInjectionRate / 150;
  } else if (fuelInjectionRate > 90) {
    // Inefficient at high fuel rates (rich mixture)
    fuelFactor = 1.0 - (fuelInjectionRate - 90) / 70;
  }

  // Load factor - diesel engines are most efficient at 75-85% load
  let loadFactor = 0.8;
  if (load > 40 && load < 90) {
    loadFactor = 0.8 + (load - 40) / 200;
  } else if (load > 90) {
    loadFactor = 1.0 - (load - 90) / 100;
  }

  // Maintenance factor - poorly maintained engines lose efficiency
  const maintenanceFactor = 0.7 + (maintenanceStatus / 100) * 0.3;

  // If engine is just idling or at very low RPM, efficiency is always lower
  if (rpmRatio < 0.5) {
    return 20 * rpmRatio;
  }

  // Apply all factors to base efficiency
  efficiency = 42 * rpmFactor * tempFactor * fuelFactor * loadFactor * maintenanceFactor;

  // Add small random variations - but not during transitions
  const isInTransition = engineState.isStarting || engineState.isShuttingDown;
  const randomFactor = isInTransition ? 1.0 : (0.99 + Math.random() * 0.02);

  // Clamp to realistic diesel efficiency range
  return Math.max(20, Math.min(efficiency * randomFactor, 45));
}

/**
 * Calculate emissions based on operating parameters
 */
export function calculateEmissions(
  fuelInjectionRate: number,
  temperature: number,
  rpm: number,
  efficiency: number
): { co2: number; nox: number; particulates: number } {
  // CO2 emissions (g/kWh) - inversely proportional to efficiency
  const efficiencyFactor = 42 / Math.max(20, efficiency);
  const co2Base = 650 * efficiencyFactor;

  // Calculate NOx emissions (mg/Nm³)
  // NOx increases with temperature and fuel rate
  const tempFactor = Math.pow(temperature / ENGINE_CONSTANTS.OPTIMAL_TEMP, 1.5);
  // NOx is highest at high temperatures and high loads
  const noxBase = 600 * tempFactor * (0.5 + fuelInjectionRate / 200);

  // Calculate particulate matter emissions (mg/Nm³)
  // PM is worse at low temps and high fuel rates
  const tempEffectOnPM = (temperature < 70) ?
    (1.5 - temperature / 100) :
    (0.5 + Math.pow((temperature - 85) / 50, 2));
  const particulatesBase = 30 + (100 - efficiency) * 0.8 * tempEffectOnPM;

  // Add small random variations - but not during transitions
  const isInTransition = engineState.isStarting || engineState.isShuttingDown;
  const randomFactor = isInTransition ? 1.0 : (0.96 + Math.random() * 0.08);

  // Special handling for startup/shutdown
  if (isInTransition) {
    // During startup/shutdown, emissions are higher
    const transitionMultiplier = engineState.isStarting ?
      (1 + (1 - engineState.startupProgress)) :
      (1 + engineState.shutdownProgress);

    return {
      co2: co2Base * transitionMultiplier,
      nox: Math.max(100, noxBase * transitionMultiplier * 0.8),
      particulates: Math.max(10, particulatesBase * transitionMultiplier * 1.5), // Particulates especially high during transitions
    };
  }

  // Normal operation emissions
  return {
    co2: co2Base * randomFactor,
    nox: Math.max(100, noxBase * randomFactor),
    particulates: Math.max(10, particulatesBase * randomFactor),
  };
}

export function calculateFrequency(rpm: number): number {
  // Standard formula: Frequency = (RPM × Number of Poles) / 120
  // For a 50Hz system with 4 poles at RATED_RPM (e.g. 1500 for 50Hz, or 500 RPM with 12 poles for 50Hz)
  // Let's assume ENGINE_CONSTANTS.RATED_RPM is the synchronous speed for 50Hz.
  // If RATED_RPM = 500, then poles = (50 * 120) / 500 = 12 poles.
  const poles = (50 * 120) / ENGINE_CONSTANTS.RATED_RPM; // Calculate poles needed for 50Hz at rated RPM
  let calculatedFrequency = (rpm * poles) / 120;

  // Apply Governor/AVR-like effect when close to rated RPM
  const rpmRatio = rpm / ENGINE_CONSTANTS.RATED_RPM;

  if (rpmRatio > 0.95 && rpmRatio < 1.05 && rpm > ENGINE_CONSTANTS.IDLE_RPM) {
    // Strong frequency regulation near rated RPM (simulates governor action)
    // Target 50Hz, allow slight deviation based on RPM ratio
    calculatedFrequency = 50 + (rpmRatio - 1) * 2.5; // e.g. at 1.02 * RATED_RPM, freq = 50.05 Hz
    calculatedFrequency = Math.max(47.5, Math.min(52.5, calculatedFrequency)); // Clamp within typical grid limits
  } else if (rpm < ENGINE_CONSTANTS.IDLE_RPM * 0.8) {
    calculatedFrequency = 0;
  }


  return calculatedFrequency;
}

export function calculateVoltage(rpm: number, excitation: number): number {
  const baseVoltage = 11000; // Volts (e.g., 11kV)

  if (rpm < ENGINE_CONSTANTS.IDLE_RPM * 0.7) return 0;

  const rpmFactor = rpm / ENGINE_CONSTANTS.RATED_RPM;
  // Excitation effect is non-linear and typically has a saturation point.
  // Let's model it as a factor from 0.5 to 1.1 based on excitation percentage.
  const excitationEffect = 0.5 + (excitation / 100) * 0.6; // Max 1.1 at 100% excitation

  let voltage = baseVoltage * rpmFactor * excitationEffect;

  // AVR (Automatic Voltage Regulation) effect simulation
  if (rpmFactor > 0.95 && rpmFactor < 1.05 && rpm > ENGINE_CONSTANTS.IDLE_RPM) {
    // Tighter voltage regulation around nominal operating point
    // Voltage should be primarily controlled by excitation when RPM is stable
    const targetVoltageFactor = 0.98 + (excitation / 100) * 0.04; // e.g. 1.0 at 50% excitation, 1.02 at 100%
    voltage = baseVoltage * targetVoltageFactor;
    voltage = Math.max(baseVoltage * 0.9, Math.min(baseVoltage * 1.1, voltage)); // Clamp
  }

  if (engineState.isStarting || engineState.isShuttingDown) {
    const transitionProgress = engineState.isStarting ? engineState.startupProgress : (1 - engineState.shutdownProgress);
    // Voltage builds up/down with transition, add some instability
    const instabilityFactor = 1 - Math.pow(transitionProgress - 0.5, 2) * 0.2; // Max instability in middle of transition
    const fluctuation = Math.sin(Date.now() / 150 + rpm / 100) * 0.02 * (1 - transitionProgress); // More fluctuation at start/end
    return Math.max(0, voltage * transitionProgress * instabilityFactor * (1 + fluctuation));
  }

  return Math.max(0, voltage);
}