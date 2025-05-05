"use client"

import { useRef, useEffect } from "react"

interface EngineVisualizationProps {
  temperature: number
  fuelRate: number
  load: number
  running: boolean
  rpm: number
}

export default function EngineVisualization({ temperature, fuelRate, load, running, rpm }: EngineVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pistonPositions = useRef<number[]>([0, 0.5, 0.25, 0.75])
  const lastTimestamp = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions with higher resolution for retina displays
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    // Animation function
    const animate = (timestamp: number) => {
      if (!lastTimestamp.current) lastTimestamp.current = timestamp
      const deltaTime = timestamp - lastTimestamp.current
      lastTimestamp.current = timestamp

      // Clear canvas
      ctx.clearRect(0, 0, rect.width, rect.height)

      // Draw engine block
      ctx.fillStyle = "#333"
      ctx.fillRect(50, 50, rect.width - 100, rect.height - 100)

      // Draw engine details
      drawEngine(ctx, rect.width, rect.height)

      // Update piston positions if engine is running
      if (running) {
        const cycleSpeed = rpm / 60 / 1000 // Revolutions per millisecond
        pistonPositions.current = pistonPositions.current.map((pos) => (pos + cycleSpeed * deltaTime) % 1)
      }

      // Draw pistons
      drawPistons(ctx, rect.width, rect.height)

      // Draw temperature indicators
      drawTemperatureIndicators(ctx, rect.width, rect.height)

      // Draw fuel injection visualization
      drawFuelInjection(ctx, rect.width, rect.height)

      // Draw RPM gauge
      drawRpmGauge(ctx, rect.width, rect.height)

      requestAnimationFrame(animate)
    }

    const animationId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [temperature, fuelRate, load, running, rpm])

  // Draw engine block and details
  const drawEngine = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Engine block outline
    ctx.strokeStyle = "#555"
    ctx.lineWidth = 2
    ctx.strokeRect(50, 50, width - 100, height - 100)

    // Engine name
    ctx.fillStyle = "#999"
    ctx.font = "14px monospace"
    ctx.fillText("DIESEL ENGINE MODEL DE-4000", width / 2 - 100, 30)

    // Engine details
    ctx.fillStyle = "#777"
    ctx.font = "10px monospace"
    ctx.fillText("4-CYLINDER DIRECT INJECTION", 60, 70)
    ctx.fillText(`TEMP: ${temperature.toFixed(1)}°C`, width - 150, 70)

    // Cooling system
    ctx.fillStyle = "#235"
    ctx.fillRect(width - 90, 100, 30, height - 200)
    ctx.fillStyle = "#fff"
    ctx.font = "9px monospace"
    ctx.fillText("COOLING", width - 85, height / 2)
    ctx.fillText("SYSTEM", width - 85, height / 2 + 15)

    // Draw connecting elements
    ctx.strokeStyle = "#666"
    ctx.beginPath()
    for (let i = 0; i < 4; i++) {
      const x = 100 + i * ((width - 200) / 4)
      ctx.moveTo(x, height - 100)
      ctx.lineTo(x, height - 70)
    }
    ctx.stroke()

    // Crankshaft
    ctx.strokeStyle = "#888"
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(50, height - 60)
    ctx.lineTo(width - 50, height - 60)
    ctx.stroke()
  }

  // Draw pistons with animation
  const drawPistons = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const pistonWidth = (width - 200) / 4 - 20

    for (let i = 0; i < 4; i++) {
      const x = 100 + i * ((width - 200) / 4)

      // Calculate piston position using sine wave for realistic motion
      // Add a phase offset for each piston to create a more realistic firing sequence
      const phaseOffset = i * (Math.PI / 2)
      const position = Math.sin(pistonPositions.current[i] * Math.PI * 2 + phaseOffset) * 0.5 + 0.5
      const y = 100 + position * (height - 250)

      // Piston
      ctx.fillStyle = "#aaa"
      ctx.fillRect(x - pistonWidth / 2, y, pistonWidth, 30)

      // Piston rod
      ctx.strokeStyle = "#999"
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(x, y + 30)
      ctx.lineTo(x, height - 60)
      ctx.stroke()

      // Combustion chamber with more dynamic coloring based on fuel rate and running state
      const fuelIntensity = running ? fuelRate / 100 : 0
      const cyclePosition = Math.sin(pistonPositions.current[i] * Math.PI * 2) // -1 to 1
      const isFiring = cyclePosition > 0.8 && running // Top of compression stroke

      // Create a more dynamic combustion effect
      let chamberColor = "#333" // Default dark color

      if (running) {
        if (isFiring) {
          // Bright combustion flash when firing
          const flashIntensity = Math.min(255, 150 + fuelRate)
          chamberColor = `rgba(${flashIntensity}, ${Math.max(0, flashIntensity - fuelRate * 1.5)}, 0, ${0.7 + (fuelRate / 100) * 0.3})`
        } else {
          // Normal running state
          chamberColor = `rgba(255, ${150 - fuelRate}, 0, ${0.2 + (fuelRate / 100) * 0.4})`
        }
      }

      ctx.fillStyle = chamberColor
      ctx.fillRect(x - pistonWidth / 2 - 5, 100, pistonWidth + 10, y - 100)

      // Add combustion particles for more visual effect when firing
      if (isFiring && running && fuelRate > 30) {
        const particleCount = Math.floor(fuelRate / 20)
        ctx.fillStyle = "rgba(255, 255, 100, 0.8)"

        for (let p = 0; p < particleCount; p++) {
          const particleX = x - pistonWidth / 2 + Math.random() * pistonWidth
          const particleY = 100 + Math.random() * (y - 110)
          const particleSize = 1 + Math.random() * 2

          ctx.beginPath()
          ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Piston rings
      ctx.strokeStyle = "#666"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x - pistonWidth / 2, y + 10)
      ctx.lineTo(x + pistonWidth / 2, y + 10)
      ctx.moveTo(x - pistonWidth / 2, y + 15)
      ctx.lineTo(x + pistonWidth / 2, y + 15)
      ctx.stroke()
    }
  }

  // Draw temperature visualization
  const drawTemperatureIndicators = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Temperature gradient on engine block
    const tempGradient = ctx.createLinearGradient(0, 50, 0, height - 50)
    tempGradient.addColorStop(0, `rgba(255, ${255 - temperature * 2}, 0, 0.2)`)
    tempGradient.addColorStop(1, `rgba(255, ${255 - temperature * 2}, 0, 0.05)`)

    ctx.fillStyle = tempGradient
    ctx.fillRect(50, 50, width - 100, height - 100)

    // Temperature scale
    ctx.fillStyle = "#fff"
    ctx.font = "10px monospace"

    for (let t = 0; t <= 100; t += 20) {
      const y = 50 + (t / 100) * (height - 100)
      ctx.fillText(`${100 - t}°`, 30, y)

      ctx.strokeStyle = "#555"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(40, y)
      ctx.lineTo(50, y)
      ctx.stroke()
    }

    // Current temperature indicator
    const tempY = 50 + ((100 - temperature) / 100) * (height - 100)
    ctx.strokeStyle = "#f00"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(30, tempY)
    ctx.lineTo(50, tempY)
    ctx.stroke()

    // Temperature warning indicator
    if (temperature > 90) {
      ctx.fillStyle = "rgba(255, 0, 0, " + (0.5 + Math.sin(Date.now() / 200) * 0.5) + ")"
      ctx.beginPath()
      ctx.arc(30, tempY, 5, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Draw fuel injection visualization
  const drawFuelInjection = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Fuel injectors
    for (let i = 0; i < 4; i++) {
      const x = 100 + i * ((width - 200) / 4)

      // Injector body
      ctx.fillStyle = "#555"
      ctx.fillRect(x - 5, 80, 10, 20)

      // Fuel spray - only visible when running
      if (running && fuelRate > 0) {
        const sprayIntensity = fuelRate / 100
        const sprayLength = 20 * sprayIntensity

        // Create spray gradient
        const sprayGradient = ctx.createLinearGradient(0, 100, 0, 100 + sprayLength)
        sprayGradient.addColorStop(0, "rgba(255, 255, 0, 0.8)")
        sprayGradient.addColorStop(1, "rgba(255, 150, 0, 0)")

        ctx.fillStyle = sprayGradient

        // Animate spray with randomness
        const randomOffset = Math.random() * 2 - 1
        const sprayWidth = 8 * sprayIntensity

        ctx.beginPath()
        ctx.moveTo(x - 2, 100)
        ctx.lineTo(x + 2, 100)
        ctx.lineTo(x + sprayWidth / 2 + randomOffset, 100 + sprayLength)
        ctx.lineTo(x - sprayWidth / 2 + randomOffset, 100 + sprayLength)
        ctx.closePath()
        ctx.fill()
      }
    }

    // Fuel rate indicator
    ctx.fillStyle = "#fff"
    ctx.font = "10px monospace"
    ctx.fillText("FUEL RATE", width - 150, height - 80)

    // Fuel gauge
    ctx.fillStyle = "#333"
    ctx.fillRect(width - 150, height - 70, 100, 10)

    ctx.fillStyle = `rgb(${Math.min(255, fuelRate * 2.55)}, ${255 - Math.min(255, fuelRate * 2.55)}, 0)`
    ctx.fillRect(width - 150, height - 70, fuelRate, 10)

    ctx.strokeStyle = "#555"
    ctx.strokeRect(width - 150, height - 70, 100, 10)
  }

  // Draw RPM gauge
  const drawRpmGauge = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const centerX = width / 2
    const centerY = height - 30
    const radius = 25

    // Gauge background
    ctx.fillStyle = "#222"
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = "#444"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.stroke()

    // RPM markings
    ctx.fillStyle = "#aaa"
    ctx.font = "8px monospace"

    for (let i = 0; i <= 8; i++) {
      const angle = (i / 8) * Math.PI - Math.PI / 2
      const x = centerX + Math.cos(angle) * (radius - 5)
      const y = centerY + Math.sin(angle) * (radius - 5)

      ctx.fillText((i * 500).toString(), x - 10, y)

      ctx.strokeStyle = "#666"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(centerX + Math.cos(angle) * (radius - 10), centerY + Math.sin(angle) * (radius - 10))
      ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius)
      ctx.stroke()
    }

    // RPM needle
    const rpmAngle = (Math.min(rpm, 4000) / 4000) * Math.PI - Math.PI / 2

    ctx.strokeStyle = "#f00"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(centerX, centerY)
    ctx.lineTo(centerX + Math.cos(rpmAngle) * radius, centerY + Math.sin(rpmAngle) * radius)
    ctx.stroke()

    // RPM text
    ctx.fillStyle = "#fff"
    ctx.font = "10px monospace"
    ctx.fillText(`${Math.round(rpm)} RPM`, centerX - 20, centerY + 5)
  }

  return (
    <div className="relative w-full h-[400px] bg-zinc-900 rounded-lg overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" style={{ width: "100%", height: "100%" }} />
      <div className="absolute bottom-2 left-2 text-xs text-zinc-500">
        {running ? `Engine running at ${Math.round(rpm)} RPM` : "Engine stopped"}
      </div>
    </div>
  )
}
