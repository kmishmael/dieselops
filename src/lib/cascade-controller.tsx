/**
 * Cascade Control System for Diesel Power Plant Simulator
 *
 * A cascade control system consists of two or more controllers arranged so that
 * the output of the primary (master) controller sets the setpoint for the secondary
 * (slave) controller. This arrangement improves disturbance rejection and handles
 * processes with multiple time constants more effectively.
 */

import { PIDController } from "./pid-controller"

export interface CascadeControllerConfig {
  // Primary (outer) loop controller
  primaryController: {
    kp: number
    ki: number
    kd: number
    outputMin: number
    outputMax: number
  }
  // Secondary (inner) loop controller
  secondaryController: {
    kp: number
    ki: number
    kd: number
    outputMin: number
    outputMax: number
  }
  // Configuration
  enabled: boolean
  primarySetpoint: number
  secondarySetpointOffset: number
  secondarySetpointScale: number
}

export class CascadeController {
  // Controllers
  private primaryController: PIDController
  private secondaryController: PIDController

  // Configuration
  private enabled: boolean
  private primarySetpoint: number
  private secondarySetpointOffset: number
  private secondarySetpointScale: number

  // State
  private secondarySetpoint = 0
  private primaryOutput = 0
  private secondaryOutput = 0
  private primaryMeasurement = 0
  private secondaryMeasurement = 0

  // History for visualization and analysis
  private history: {
    time: number
    primarySetpoint: number
    primaryMeasurement: number
    primaryOutput: number
    secondarySetpoint: number
    secondaryMeasurement: number
    secondaryOutput: number
  }[] = []

  private currentTime = 0

  /**
   * Create a new cascade controller
   *
   * @param config Configuration for the cascade controller
   */
  constructor(config: CascadeControllerConfig) {
    // Create controllers
    this.primaryController = new PIDController(
      config.primaryController.kp,
      config.primaryController.ki,
      config.primaryController.kd,
      config.primaryController.outputMin,
      config.primaryController.outputMax,
    )

    this.secondaryController = new PIDController(
      config.secondaryController.kp,
      config.secondaryController.ki,
      config.secondaryController.kd,
      config.secondaryController.outputMin,
      config.secondaryController.outputMax,
    )

    // Set configuration
    this.enabled = config.enabled
    this.primarySetpoint = config.primarySetpoint
    this.secondarySetpointOffset = config.secondarySetpointOffset
    this.secondarySetpointScale = config.secondarySetpointScale

    // Configure controllers for cascade operation
    this.primaryController.setMode(true, false)
    this.secondaryController.setMode(true, false)
  }

  /**
   * Reset the cascade controller
   */
  public reset(): void {
    this.primaryController.reset()
    this.secondaryController.reset()
    this.secondarySetpoint = 0
    this.primaryOutput = 0
    this.secondaryOutput = 0
    this.history = []
    this.currentTime = 0
  }

  /**
   * Enable or disable the cascade controller
   *
   * @param enabled Whether the cascade controller is enabled
   */
  public setEnabled(enabled: boolean): void {
    if (this.enabled !== enabled) {
      this.enabled = enabled
      this.reset()
    }
  }

  /**
   * Set the primary setpoint
   *
   * @param setpoint The primary setpoint
   */
  public setPrimarySetpoint(setpoint: number): void {
    this.primarySetpoint = setpoint
  }

  /**
   * Set the secondary setpoint offset and scale
   *
   * @param offset The secondary setpoint offset
   * @param scale The secondary setpoint scale
   */
  public setSecondarySetpointParameters(offset: number, scale: number): void {
    this.secondarySetpointOffset = offset
    this.secondarySetpointScale = scale
  }

  /**
   * Update the cascade controller
   *
   * @param primaryMeasurement The primary process variable measurement
   * @param secondaryMeasurement The secondary process variable measurement
   * @param deltaTime Time since last update (seconds)
   * @returns The controller output
   */
  public update(primaryMeasurement: number, secondaryMeasurement: number, deltaTime: number): number {
    // Update time
    this.currentTime += deltaTime

    // Store measurements
    this.primaryMeasurement = primaryMeasurement
    this.secondaryMeasurement = secondaryMeasurement

    if (!this.enabled) {
      // If disabled, return zero and don't update controllers
      this.secondaryOutput = 0
      return this.secondaryOutput
    }

    // Update primary controller
    this.primaryOutput = this.primaryController.update(this.primarySetpoint, primaryMeasurement, deltaTime)

    // Calculate secondary setpoint from primary output
    this.secondarySetpoint = this.primaryOutput * this.secondarySetpointScale + this.secondarySetpointOffset

    // Update secondary controller with the new setpoint
    this.secondaryOutput = this.secondaryController.update(this.secondarySetpoint, secondaryMeasurement, deltaTime)

    // Store history
    this.history.push({
      time: this.currentTime,
      primarySetpoint: this.primarySetpoint,
      primaryMeasurement: primaryMeasurement,
      primaryOutput: this.primaryOutput,
      secondarySetpoint: this.secondarySetpoint,
      secondaryMeasurement: secondaryMeasurement,
      secondaryOutput: this.secondaryOutput,
    })

    // Limit history length
    if (this.history.length > 100) {
      this.history.shift()
    }

    return this.secondaryOutput
  }

  /**
   * Get the current state of the cascade controller
   */
  public getState() {
    return {
      enabled: this.enabled,
      primarySetpoint: this.primarySetpoint,
      primaryMeasurement: this.primaryMeasurement,
      primaryOutput: this.primaryOutput,
      secondarySetpoint: this.secondarySetpoint,
      secondaryMeasurement: this.secondaryMeasurement,
      secondaryOutput: this.secondaryOutput,
    }
  }

  /**
   * Get the history of the cascade controller
   */
  public getHistory() {
    return this.history
  }

  /**
   * Update controller parameters
   *
   * @param controller Which controller to update ('primary' or 'secondary')
   * @param kp Proportional gain
   * @param ki Integral gain
   * @param kd Derivative gain
   */
  public updateParameters(controller: "primary" | "secondary", kp?: number, ki?: number, kd?: number): void {
    const targetController = controller === "primary" ? this.primaryController : this.secondaryController

    if (kp !== undefined) targetController.kp = kp
    if (ki !== undefined) targetController.ki = ki
    if (kd !== undefined) targetController.kd = kd
  }

  /**
   * Get the current parameters of the controllers
   */
  public getParameters() {
    return {
      primary: {
        kp: this.primaryController.kp,
        ki: this.primaryController.ki,
        kd: this.primaryController.kd,
      },
      secondary: {
        kp: this.secondaryController.kp,
        ki: this.secondaryController.ki,
        kd: this.secondaryController.kd,
      },
    }
  }
}
