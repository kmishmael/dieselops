// Mathematical models for the diesel power plant simulation

// Calculate power output based on input parameters
export function calculatePowerOutput(
  fuelInjectionRate: number,
  load: number,
  temperature: number,
  generatorExcitation: number,
  maintenanceStatus: number,
  deltaTime = 0.016, // Add time parameter with default value
): number {
  // Base power calculation with enhanced impact
  let power = (fuelInjectionRate / 100) * (load / 100) * 10 // Max 10 MW

  // Temperature efficiency factor - more pronounced effect
  // Optimal temperature range is 70-85°C
  let tempFactor = 1.0
  if (temperature < 60) {
    tempFactor = 0.7 + (temperature - 40) / 100
  } else if (temperature > 90) {
    tempFactor = 1.0 - (temperature - 90) / 40 // Steeper decline
  }

  // Generator excitation factor - more pronounced effect
  // Optimal excitation is around 70-90%
  let excitationFactor = 0.4 + (generatorExcitation / 100) * 0.6 // More range
  if (generatorExcitation > 90) {
    excitationFactor = 1.0 - (generatorExcitation - 90) / 150
  }

  // Maintenance factor - more pronounced effect
  // Lower maintenance status reduces power output more significantly
  const maintenanceFactor = 0.6 + (maintenanceStatus / 100) * 0.4 // More impact

  // Apply all factors
  power = power * tempFactor * excitationFactor * maintenanceFactor

  // Add some small random variations for realism
  power = power * (0.97 + Math.random() * 0.06) // More variation

  // Add slight oscillation based on time for more dynamic behavior
  if (deltaTime > 0) {
    power = power * (1 + Math.sin(Date.now() / 2000) * 0.03)
  }

  return Math.max(0, power)
}

// Calculate fuel consumption based on input parameters
export function calculateFuelConsumption(fuelInjectionRate: number, load: number, efficiency: number): number {
  // Base fuel consumption
  let consumption = (fuelInjectionRate / 100) * (load / 100) * 200 // L/min

  // Efficiency factor
  const efficiencyFactor = 1.0 - (efficiency / 100) * 0.3

  // Apply factors
  consumption = consumption * efficiencyFactor

  // Add small random variations
  consumption = consumption * (0.98 + Math.random() * 0.04)

  return Math.max(0, consumption)
}

// Calculate engine temperature based on input parameters and time
export function calculateTemperature(
  currentTemperature: number,
  fuelInjectionRate: number,
  coolingSystemPower: number,
  load: number,
  deltaTime: number,
): number {
  // Heat generation from fuel combustion - more pronounced
  const heatGeneration = (fuelInjectionRate / 100) * (load / 100) * 12 // Increased from 10

  // Cooling effect - more pronounced
  const cooling = (coolingSystemPower / 100) * 10 // Increased from 8

  // Ambient heat loss (proportional to temperature difference)
  const ambientLoss = (currentTemperature - 25) * 0.015 // Increased from 0.01

  // Net temperature change rate (degrees per second)
  const tempChangeRate = heatGeneration - cooling - ambientLoss

  // Apply temperature change based on time delta
  let newTemperature = currentTemperature + tempChangeRate * deltaTime

  // Temperature cannot go below ambient (25°C)
  newTemperature = Math.max(25, newTemperature)

  // Add small random variations and oscillation
  const randomFactor = 0.997 + Math.random() * 0.006
  const oscillation = Math.sin(Date.now() / 3000) * 0.2
  newTemperature = newTemperature * randomFactor + oscillation

  return newTemperature
}

// Calculate efficiency based on input parameters
export function calculateEfficiency(
  temperature: number,
  fuelInjectionRate: number,
  load: number,
  maintenanceStatus: number,
): number {
  // Base efficiency
  let efficiency = 35 // Base diesel engine efficiency around 35%

  // Temperature factor - optimal temperature is around 80°C - more pronounced
  const tempFactor = 1.0 - Math.abs(temperature - 80) / 80 // Changed from 100

  // Fuel injection factor - optimal is around 60-80% - more pronounced
  let fuelFactor = 1.0
  if (fuelInjectionRate < 40) {
    fuelFactor = 0.7 + fuelInjectionRate / 100 // Changed from 0.8
  } else if (fuelInjectionRate > 90) {
    fuelFactor = 1.0 - (fuelInjectionRate - 90) / 80 // Changed from 100
  }

  // Load factor - engines are most efficient at 70-90% load - more pronounced
  let loadFactor = 0.7 // Changed from 0.8
  if (load > 40 && load < 90) {
    loadFactor = 0.7 + (load - 40) / 200 // Changed from 0.8 and 250
  } else if (load > 90) {
    loadFactor = 1.0 - (load - 90) / 80 // Changed from 100
  }

  // Maintenance factor - more pronounced
  const maintenanceFactor = 0.6 + (maintenanceStatus / 100) * 0.4 // Changed from 0.7 and 0.3

  // Apply all factors
  efficiency = efficiency * tempFactor * fuelFactor * loadFactor * maintenanceFactor

  // Add small random variations
  efficiency = efficiency * (0.97 + Math.random() * 0.06) // More variation

  return Math.max(10, Math.min(efficiency, 45)) // Clamp between 10% and 45%
}

// Calculate emissions based on input parameters
export function calculateEmissions(
  fuelInjectionRate: number,
  temperature: number,
  efficiency: number,
): { co2: number; nox: number; particulates: number } {
  // CO2 emissions (kg/h) - directly proportional to fuel consumption
  const co2 = fuelInjectionRate * 2.68 * (1 - (efficiency / 100) * 0.2)

  // NOx emissions (g/kWh) - increases with temperature
  let nox = 20 + (temperature - 70) * 1.5
  if (fuelInjectionRate > 80) {
    nox = nox * (1 + (fuelInjectionRate - 80) / 100)
  }

  // Particulate matter (mg/m³) - decreases with efficiency
  let particulates = 50 - efficiency * 0.5
  if (fuelInjectionRate > 90) {
    particulates = particulates * (1 + (fuelInjectionRate - 90) / 50)
  }

  // Add small random variations
  const randomFactor = 0.95 + Math.random() * 0.1

  return {
    co2: co2 * randomFactor,
    nox: Math.max(10, nox * randomFactor),
    particulates: Math.max(5, particulates * randomFactor),
  }
}
