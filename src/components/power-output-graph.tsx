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

    // Add padding for axes labels
    const paddingLeft = 40
    const paddingBottom = 30
    const graphWidth = width - paddingLeft
    const graphHeight = height - paddingBottom

    // Vertical grid lines (time)
    for (let i = 0; i <= 10; i++) {
      const x = paddingLeft + (i / 10) * graphWidth
      ctx.beginPath()
      ctx.moveTo(x, 10)
      ctx.lineTo(x, graphHeight)
      ctx.stroke()
    }

    // Horizontal grid lines (values)
    for (let i = 0; i <= 5; i++) {
      const y = (i / 5) * graphHeight
      ctx.beginPath()
      ctx.moveTo(paddingLeft, y)
      ctx.lineTo(width - 10, y)
      ctx.stroke()
    }
  }

  const drawAxesLabels = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Add padding for axes labels
    const paddingLeft = 40
    const paddingBottom = 30
    const graphWidth = width - paddingLeft
    const graphHeight = height - paddingBottom

    ctx.fillStyle = "#999"
    ctx.font = "11px sans-serif"

    // Time labels (x-axis)
    for (let i = 0; i <= 10; i += 2) { // Reduced number of labels to prevent overlap
      const x = paddingLeft + (i / 10) * graphWidth
      const timeValue = -100 + i * 10 // Last 100 seconds
      ctx.fillText(`${timeValue}s`, x - 12, height - 10)
    }

    // Value labels (y-axis)
    for (let i = 0; i <= 5; i++) {
      const y = graphHeight - (i / 5) * graphHeight
      const value = i * 20
      ctx.fillText(`${value}`, 5, y + 3)
    }

    // Axes titles
    ctx.fillStyle = "#ccc"
    ctx.font = "12px sans-serif"
    ctx.fillText("Time (seconds)", width / 2, height - 5)

    // Rotate text for y-axis label
    ctx.save()
    ctx.translate(8, height / 2)
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

    // Add padding for axes labels
    const paddingLeft = 40
    const paddingBottom = 30
    const graphWidth = width - paddingLeft
    const graphHeight = height - paddingBottom

    const latestTime = data[data.length - 1].time

    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.beginPath()

    // Plot each point
    data.forEach((point, index) => {
      // Map time to x coordinate (show last 100 seconds)
      const timeOffset = latestTime - point.time
      const x = paddingLeft + graphWidth - (timeOffset / 100) * graphWidth

      // Map value to y coordinate
      const normalizedValue = (point.value - minValue) / (maxValue - minValue)
      const y = graphHeight - normalizedValue * graphHeight

      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.stroke()
  }

  const drawLegend = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const legendX = width - 160
    const legendY = 20

    // Legend background
    ctx.fillStyle = "rgba(20, 20, 20, 0.7)"
    ctx.fillRect(legendX - 10, legendY - 15, 150, 85) // Made taller to accommodate spacing
    ctx.strokeStyle = "#444"
    ctx.strokeRect(legendX - 10, legendY - 15, 150, 85)

    // Legend items with more spacing
    ctx.font = "12px sans-serif"

    // Power output
    ctx.fillStyle = "#4ade80"
    ctx.fillRect(legendX, legendY, 18, 3) // Made line thicker
    ctx.fillStyle = "#fff"
    ctx.fillText("Power Output (MW)", legendX + 25, legendY + 5)

    // Temperature - increased vertical spacing
    ctx.fillStyle = "#f97316"
    ctx.fillRect(legendX, legendY + 25, 18, 3)
    ctx.fillStyle = "#fff"
    ctx.fillText("Temperature (°C)", legendX + 25, legendY + 30)

    // Efficiency - increased vertical spacing
    ctx.fillStyle = "#60a5fa"
    ctx.fillRect(legendX, legendY + 50, 18, 3)
    ctx.fillStyle = "#fff"
    ctx.fillText("Efficiency (%)", legendX + 25, legendY + 55)
  }

  return (
    <div className="w-full h-[300px] border border-neutral-700 p-4 bg-zinc-900 rounded-lg overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" style={{ width: "100%", height: "100%" }} />
    </div>
  )
}