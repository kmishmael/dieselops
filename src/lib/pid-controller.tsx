/**
 * Enhanced PID Controller implementation for automatic control systems
 *
 * A PID (Proportional-Integral-Derivative) controller is a control loop feedback mechanism
 * widely used in industrial control systems. It continuously calculates an error value
 * as the difference between a desired setpoint and a measured process variable and
 * applies a correction based on proportional, integral, and derivative terms.
 */
export class PIDController {
  // Controller gains
  public kp: number // Proportional gain
  public ki: number // Integral gain
  public kd: number // Derivative gain

  // Controller limits
  private outputMin: number
  private outputMax: number

  // Internal state
  private integral = 0
  private previousError = 0
  private previousMeasurement = 0
  private previousTime = 0

  // Controller history for analysis
  private history: {
    time: number
    setpoint: number
    measurement: number
    error: number
    p: number
    i: number
    d: number
    output: number
  }[] = []

  // Controller mode
  private useDerivativeOnMeasurement = true // Use derivative on measurement instead of error
  private useProportionalOnMeasurement = false // Use proportional on measurement instead of error
  private maxHistoryLength = 100 // Maximum number of history entries to keep

  /**
   * Create a new PID controller
   *
   * @param kp Proportional gain
   * @param ki Integral gain
   * @param kd Derivative gain
   * @param outputMin Minimum output value
   * @param outputMax Maximum output value
   */
  constructor(kp: number, ki: number, kd: number, outputMin: number, outputMax: number) {
    this.kp = kp
    this.ki = ki
    this.kd = kd
    this.outputMin = outputMin
    this.outputMax = outputMax
    this.reset()
  }

  /**
   * Reset the controller state
   */
  public reset(): void {
    this.integral = 0
    this.previousError = 0
    this.previousMeasurement = 0
    this.previousTime = 0
    this.history = []
  }

  /**
   * Get controller history for analysis and visualization
   */
  public getHistory() {
    return this.history
  }

  /**
   * Set controller mode
   *
   * @param useDerivativeOnMeasurement Use derivative on measurement instead of error
   * @param useProportionalOnMeasurement Use proportional on measurement instead of error
   */
  public setMode(useDerivativeOnMeasurement: boolean, useProportionalOnMeasurement: boolean): void {
    this.useDerivativeOnMeasurement = useDerivativeOnMeasurement
    this.useProportionalOnMeasurement = useProportionalOnMeasurement
  }

  /**
   * Update the controller with a new setpoint and process variable
   *
   * @param setpoint Desired value
   * @param measurement Current value (process variable)
   * @param deltaTime Time since last update (seconds)
   * @returns Controller output
   */
  public update(setpoint: number, measurement: number, deltaTime: number): number {
    // Ensure deltaTime is positive and reasonable
    if (deltaTime <= 0) {
      deltaTime = 0.01 // Default to 10ms if deltaTime is invalid
    }

    // Calculate error
    const error = setpoint - measurement

    // Proportional term
    let proportional: number
    if (this.useProportionalOnMeasurement) {
      // P on measurement (less aggressive on setpoint changes)
      proportional = this.kp * (this.previousMeasurement - measurement)
    } else {
      // Standard P on error
      proportional = this.kp * error
    }

    // Integral term
    this.integral += error * deltaTime
    const integral = this.ki * this.integral

    // Derivative term
    let derivative: number
    if (this.useDerivativeOnMeasurement) {
      // D on measurement (avoids derivative kick on setpoint changes)
      const dMeasurement = (measurement - this.previousMeasurement) / deltaTime
      derivative = -this.kd * dMeasurement // Negative because we want to counteract changes
    } else {
      // Standard D on error
      const dError = (error - this.previousError) / deltaTime
      derivative = this.kd * dError
    }

    // Calculate output
    let output = proportional + integral + derivative

    // Apply limits
    output = Math.max(this.outputMin, Math.min(this.outputMax, output))

    // Store state for next iteration
    this.previousError = error
    this.previousMeasurement = measurement
    this.previousTime += deltaTime

    // Apply anti-windup - if output is saturated, don't accumulate integral
    if ((output === this.outputMax && error > 0) || (output === this.outputMin && error < 0)) {
      // Don't accumulate integral term if we're saturated in the direction of the error
      this.integral -= error * deltaTime
    }

    // Store history for analysis
    this.history.push({
      time: this.previousTime,
      setpoint,
      measurement,
      error,
      p: proportional,
      i: integral,
      d: derivative,
      output,
    })

    // Limit history length
    if (this.history.length > this.maxHistoryLength) {
      this.history.shift()
    }

    return output
  }

  /**
   * Auto-tune the controller using the Ziegler-Nichols method
   * This is a simplified implementation and would need to be run
   * in a controlled environment
   *
   * @param getCurrentValue Function to get the current process value
   * @param setOutput Function to set the controller output
   * @param deltaTime Time step for the auto-tuning process
   */
  public async autoTune(
    getCurrentValue: () => number,
    setOutput: (value: number) => void,
    deltaTime = 0.1,
  ): Promise<{ kp: number; ki: number; kd: number }> {
    // Reset controller
    this.reset()

    // Start with P-only controller
    const originalKp = this.kp
    const originalKi = this.ki
    const originalKd = this.kd

    this.ki = 0
    this.kd = 0

    // Increase Kp until oscillation
    const kCritical = 1.0
    const oscillating = false
    const pCritical = 0

    // This would be implemented with proper oscillation detection
    // For now, we'll just return some reasonable values

    // Calculate Ziegler-Nichols parameters
    // For PID: Kp = 0.6*Kc, Ki = 1.2*Kc/Pc, Kd = 0.075*Kc*Pc
    const newKp = 0.6 * kCritical
    const newKi = (1.2 * kCritical) / pCritical
    const newKd = 0.075 * kCritical * pCritical

    // Restore original values for now (in a real implementation, we'd use the new values)
    this.kp = originalKp
    this.ki = originalKi
    this.kd = originalKd

    return { kp: newKp, ki: newKi, kd: newKd }
  }
}
