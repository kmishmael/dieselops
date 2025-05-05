"use client"

import { useEffect, useRef } from "react"

interface PowerOutputGraphProps {
  powerData: { time: number; value: number }[]
  temperatureData: { time: number; value: number }[]
  efficiencyData: { time: number; value: number }[]
}

export default function PowerOutputGraph({ powerData, temperatureData, efficiencyData }: PowerOutputGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

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

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height)

    // Draw graph background
    ctx.fillStyle = "#1a1a1a"
    ctx.fillRect(0, 0, rect.width, rect.height)

    // Draw grid
    drawGrid(ctx, rect.width, rect.height)

    // Draw axes labels
    drawAxesLabels(ctx, rect.width, rect.height)

    // Draw data lines
    if (powerData.length > 1) {
      drawDataLine(ctx, powerData, rect.width, rect.height, "#4ade80", 0, 100)
    }

    if (temperatureData.length > 1) {
      drawDataLine(ctx, temperatureData, rect.width, rect.height, "#f97316", 0, 120)
    }

    if (efficiencyData.length > 1) {
      drawDataLine(ctx, efficiencyData, rect.width, rect.height, "#60a5fa", 0, 100)
    }

    // Draw legend
    drawLegend(ctx, rect.width, rect.height)
  }, [powerData, temperatureData, efficiencyData])

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = "#333"
    ctx.lineWidth = 1

    // Vertical grid lines (time)
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * width
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    // Horizontal grid lines (values)
    for (let i = 0; i <= 5; i++) {
      const y = (i / 5) * height
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
  }

  const drawAxesLabels = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = "#999"
    ctx.font = "10px sans-serif"

    // Time labels (x-axis)
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * width
      const timeValue = -100 + i * 10 // Last 100 seconds
      ctx.fillText(`${timeValue}s`, x - 10, height - 5)
    }

    // Value labels (y-axis)
    for (let i = 0; i <= 5; i++) {
      const y = height - (i / 5) * height
      const value = i * 20
      ctx.fillText(`${value}`, 5, y + 3)
    }

    // Axes titles
    ctx.fillStyle = "#ccc"
    ctx.font = "12px sans-serif"
    ctx.fillText("Time (seconds)", width / 2 - 40, height - 15)

    // Rotate text for y-axis label
    ctx.save()
    ctx.translate(15, height / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText("Value", 0, 0)
    ctx.restore()
  }

  const drawDataLine = (
    ctx: CanvasRenderingContext2D,
    data: { time: number; value: number }[],
    width: number,
    height: number,
    color: string,
    minValue: number,
    maxValue: number,
  ) => {
    if (data.length < 2) return

    const latestTime = data[data.length - 1].time

    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.beginPath()

    // Plot each point
    data.forEach((point, index) => {
      // Map time to x coordinate (show last 100 seconds)
      const timeOffset = latestTime - point.time
      const x = width - (timeOffset / 100) * width

      // Map value to y coordinate
      const normalizedValue = (point.value - minValue) / (maxValue - minValue)
      const y = height - normalizedValue * height

      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.stroke()
  }

  const drawLegend = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const legendX = width - 150
    const legendY = 20

    // Legend background
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
    ctx.fillRect(legendX - 10, legendY - 15, 150, 65)
    ctx.strokeStyle = "#555"
    ctx.strokeRect(legendX - 10, legendY - 15, 150, 65)

    // Legend items
    ctx.font = "12px sans-serif"

    // Power output
    ctx.fillStyle = "#4ade80"
    ctx.fillRect(legendX, legendY, 15, 2)
    ctx.fillStyle = "#fff"
    ctx.fillText("Power Output (MW)", legendX + 20, legendY + 5)

    // Temperature
    ctx.fillStyle = "#f97316"
    ctx.fillRect(legendX, legendY + 20, 15, 2)
    ctx.fillStyle = "#fff"
    ctx.fillText("Temperature (°C)", legendX + 20, legendY + 25)

    // Efficiency
    ctx.fillStyle = "#60a5fa"
    ctx.fillRect(legendX, legendY + 40, 15, 2)
    ctx.fillStyle = "#fff"
    ctx.fillText("Efficiency (%)", legendX + 20, legendY + 45)
  }

  return (
    <div className="w-full h-[200px] bg-zinc-900 rounded-lg overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" style={{ width: "100%", height: "100%" }} />
    </div>
  )
}
