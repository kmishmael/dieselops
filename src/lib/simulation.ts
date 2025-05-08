
const DESIGN_POWER_MW = 62; // Target electrical power output in MW
const MAX_MECHANICAL_POWER_MW = 75; // Max engine shaft power (slightly higher than electrical)
const NOMINAL_FUEL_CONSUMPTION_RATE_KGH_PER_MW = 200; // Approx kg/h per MW at good efficiency (used conceptually)
const IDEAL_THERMAL_EFFICIENCY_PERCENT = 48; // Peak thermal efficiency
const AMBIENT_TEMPERATURE_C = 25; // degrees C

// Constants for Temperature Dynamics
const THERMAL_MASS_CAPACITY = 1000; // Arbitrary value for temperature dynamics
const COOLING_EFFECTIVENESS = 0.1; // How much cooling power affects temperature change rate
const HEAT_GENERATION_PER_FUEL = 0.3; // How much fuel contributes to temperature rise (scaled)
const HEAT_GENERATION_PER_LOAD = 0.1; // How much load contributes to temperature rise (scaled)
const NATURAL_COOLING_RATE = 0.05; // How much heat is lost naturally (scaled)

// Constants for Efficiency & Power Factors
const GENERATOR_EFFICIENCY_BASE = 0.95; // Base generator efficiency
const GENERATOR_EFFICIENCY_VARIATION = 0.05; // Variation based on excitation (0.95 to 1.0)
const MAINTENANCE_POWER_FACTOR_BASE = 0.7; // Minimum power factor due to maintenance
const MAINTENANCE_EFFICIENCY_FACTOR_BASE = 0.5; // Minimum efficiency factor due to maintenance

// Constants for Realism Factors
const STARTUP_DURATION_SECONDS = 10; // How long it takes to spool up at the start
const RANDOM_NOISE_POWER_MW = 0.5; // Max random variation in power output (MW)
const RANDOM_NOISE_TEMPERATURE_C = 0.2; // Max random variation in temperature (C/s rate)
const RANDOM_NOISE_EFFICIENCY_PERCENT = 0.5; // Max random variation in efficiency (%)
const RANDOM_NOISE_EMISSIONS_SCALED = 5; // Max random variation in emissions (scaled units)

function addNoise(value: number, maxNoise: number): number {
  // Generates a random number between -maxNoise and +maxNoise
  return value + (Math.random() * 2 - 1) * maxNoise;
}

/**
 * Calculates the current power output of the engine and generator.
 * Incorporates startup ramp-up and random noise.
 * @param fuelInjectionRate - Fuel rate (0-100 scale)
 * @param load - Electrical load demand (0-100 scale)
 * @param engineTemperature - Engine temperature (degrees C)
 * @param generatorExcitation - Generator excitation (0-100 scale)
 * @param maintenanceStatus - Maintenance status (0-100 scale)
 * @param timeSinceStart - Time elapsed since the simulation started (seconds)
 * @returns Power output in MW
 */
export function calculatePowerOutput(
  fuelInjectionRate: number,
  load: number,
  engineTemperature: number,
  generatorExcitation: number,
  maintenanceStatus: number,
  timeSinceStart: number // Added parameter for startup dynamics
): number {
  // --- Startup Ramp-up ---
  // Engine power capability ramps up during the initial startup phase.
  const startupFactor = Math.min(1, timeSinceStart / STARTUP_DURATION_SECONDS); // Goes from 0 to 1 during startup duration

  // --- Mechanical Power Available ---
  const fuelFactor = fuelInjectionRate / 100;
  const maintenanceFactor = maintenanceStatus / 100 * (1 - MAINTENANCE_POWER_FACTOR_BASE) + MAINTENANCE_POWER_FACTOR_BASE;
  const availableMechanicalPower = fuelFactor * MAX_MECHANICAL_POWER_MW * maintenanceFactor * startupFactor; // Apply startup factor here

  // --- Generator Conversion ---
  const excitationFactor = generatorExcitation / 100 * GENERATOR_EFFICIENCY_VARIATION + GENERATOR_EFFICIENCY_BASE;
  const electricalOutputCapability = availableMechanicalPower * excitationFactor;

  // --- Load Demand ---
  const demandedElectricalPower = (load / 100) * DESIGN_POWER_MW;

  // --- Temperature Derating ---
  const tempDeratingThreshold = 85;
  const maxTempDerating = 0.2;
  const tempDerating = Math.max(0, engineTemperature - tempDeratingThreshold) / (100 - tempDeratingThreshold) * maxTempDerating;
  const finalElectricalOutputCapability = electricalOutputCapability * (1 - tempDerating);

  // --- Final Power Output ---
  let powerOutput = Math.max(0, Math.min(finalElectricalOutputCapability, demandedElectricalPower));

  // --- Add Random Noise ---
  powerOutput = addNoise(powerOutput, RANDOM_NOISE_POWER_MW);

  // Ensure output is not negative after adding noise
  return Math.max(0, powerOutput);
}

/**
 * Calculates the engine's fuel consumption rate.
 * Simplified model proportional to fuel injection rate.
 * (No dynamic or noise added here for simplicity and consistency)
 * @param fuelInjectionRate - Fuel rate (0-100 scale)
 * @param load - Electrical load demand (0-100 scale) // Not used in calculation
 * @param efficiency - Current engine efficiency (percentage 0-100) // Not used in calculation
 * @returns Fuel consumption rate (arbitrary scaled units)
 */
export function calculateFuelConsumption(
  fuelInjectionRate: number,
  load: number,
  efficiency: number
): number {
  // Max fuel consumption rate (scaled) at 100% fuel injection.
  const MAX_SCALED_FUEL_CONSUMPTION = 10000; // Arbitrary max scaled units

  const fuelRateFactor = fuelInjectionRate / 100;
  const fuelConsumption = fuelRateFactor * MAX_SCALED_FUEL_CONSUMPTION;

  return fuelConsumption;
}

/**
 * Calculates the change in engine temperature over time.
 * Models temperature as a dynamic system (first-order approximation) with noise.
 * @param engineTemperature - Current engine temperature (degrees C)
 * @param fuelInjectionRate - Fuel rate (0-100 scale)
 * @param coolingSystemPower - Cooling power (0-100 scale)
 * @param load - Electrical load demand (0-100 scale)
 * @param deltaTime - Time elapsed since last update (seconds)
 * @returns New engine temperature (degrees C)
 */
export function calculateTemperature(
  engineTemperature: number,
  fuelInjectionRate: number,
  coolingSystemPower: number,
  load: number,
  deltaTime: number
): number {
  // Heat generation only occurs when fuel is injected.
  const heatGenerated = (fuelInjectionRate / 100) * HEAT_GENERATION_PER_FUEL + (load / 100) * HEAT_GENERATION_PER_LOAD;

  // Heat removal by cooling system.
  const heatRemovedByCooling = (coolingSystemPower / 100) * COOLING_EFFECTIVENESS;

  // Natural heat loss to the environment.
  const naturalHeatLoss = (engineTemperature - AMBIENT_TEMPERATURE_C) * NATURAL_COOLING_RATE;

  // --- Net Heat Flow ---
  const netHeatFlow = heatGenerated - heatRemovedByCooling - naturalHeatLoss;

  // --- Temperature Change Rate ---
  let temperatureChangeRate = netHeatFlow / THERMAL_MASS_CAPACITY; // degrees C per second (scaled)

  // --- Add Random Noise to the rate of change ---
  temperatureChangeRate = addNoise(temperatureChangeRate, RANDOM_NOISE_TEMPERATURE_C);

  // --- Update Temperature ---
  const newTemperature = engineTemperature + temperatureChangeRate * deltaTime;

  // Ensure temperature doesn't drop below ambient
  return Math.max(AMBIENT_TEMPERATURE_C, newTemperature);
}

/**
 * Calculates the current engine efficiency.
 * Incorporates random noise.
 * @param engineTemperature - Engine temperature (degrees C)
 * @param fuelInjectionRate - Fuel rate (0-100 scale) // Proxy for load point
 * @param load - Electrical load demand (0-100 scale) // Actual load point
 * @param maintenanceStatus - Maintenance status (0-100 scale)
 * @returns Efficiency (percentage 0-100)
 */
export function calculateEfficiency(
  engineTemperature: number,
  fuelInjectionRate: number,
  load: number,
  maintenanceStatus: number
): number {
  // --- Base Efficiency ---
  let efficiency = IDEAL_THERMAL_EFFICIENCY_PERCENT;

  // --- Penalties / Factors ---
  const tempPenaltyThreshold = 90;
  const tempPenaltyFactor = 1.0;
  const tempPenalty = Math.max(0, engineTemperature - tempPenaltyThreshold) * tempPenaltyFactor;
  efficiency -= tempPenalty;

  const optimalLoad = 90;
  const optimalFuel = 95;
  const loadPenalty = Math.abs((load / 100) * 100 - optimalLoad) * 0.1;
  const fuelPenalty = Math.abs((fuelInjectionRate / 100) * 100 - optimalFuel) * 0.1;
  efficiency -= loadPenalty + fuelPenalty;

  const maintenanceFactor = maintenanceStatus / 100 * (1 - MAINTENANCE_EFFICIENCY_FACTOR_BASE) + MAINTENANCE_EFFICIENCY_FACTOR_BASE;
  efficiency *= maintenanceFactor;

  // --- Clamp Efficiency Before Noise ---
  efficiency = Math.max(5, Math.min(IDEAL_THERMAL_EFFICIENCY_PERCENT, efficiency));

  // --- Add Random Noise ---
  efficiency = addNoise(efficiency, RANDOM_NOISE_EFFICIENCY_PERCENT);

  // --- Clamp Efficiency After Noise ---
  return Math.max(5, Math.min(IDEAL_THERMAL_EFFICIENCY_PERCENT, efficiency)); // Re-clamp after noise
}

/**
 * Calculates engine emissions.
 * Incorporates random noise.
 * @param fuelInjectionRate - Fuel rate (0-100 scale)
 * @param engineTemperature - Engine temperature (degrees C)
 * @param efficiency - Current engine efficiency (percentage 0-100)
 * @returns Object with emission levels (arbitrary scaled units)
 */
export function calculateEmissions(
  fuelInjectionRate: number,
  engineTemperature: number,
  efficiency: number
): { co2: number; nox: number; particulates: number } {
  const fuelFactor = fuelInjectionRate / 100;
  const efficiencyFactor = Math.max(0.1, efficiency) / 100; // Prevent issues if efficiency is very low

  // --- Base Emissions ---
  const baseCO2 = fuelFactor * 1000;
  const tempThresholdNOx = 70;
  const tempEffectNOx = Math.max(0, engineTemperature - tempThresholdNOx) * 5;
  const baseNOx = fuelFactor * 50 + tempEffectNOx;
  const baseParticulates = fuelFactor * 20 + (100 - efficiency) * 2;

  // --- Add Random Noise ---
  const co2 = addNoise(baseCO2, RANDOM_NOISE_EMISSIONS_SCALED);
  const nox = addNoise(baseNOx, RANDOM_NOISE_EMISSIONS_SCALED);
  const particulates = addNoise(baseParticulates, RANDOM_NOISE_EMISSIONS_SCALED);


  // Ensure emissions are not negative
  return {
    co2: Math.max(0, co2),
    nox: Math.max(0, nox),
    particulates: Math.max(0, particulates),
  };
}
