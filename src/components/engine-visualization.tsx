"use client";

import { useRef, useEffect, useState } from "react";
import { LinearGauge, RadialGauge } from "react-canvas-gauges";

interface EngineVisualizationProps {
  temperature: number;
  fuelRate: number;
  load: number;
  running: boolean;
  rpm: number;
  pressure?: number;
  efficiency?: number;
}

export default function EngineVisualization({
  temperature,
  fuelRate,
  load,
  running,
  rpm,
  pressure = 1.2,
  efficiency = 85,
}: EngineVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastTimestamp = useRef<number>(0);
  const [criticalAlert, setCriticalAlert] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Check for critical conditions
  useEffect(() => {
    if (temperature > 95 || rpm > 3800 || pressure > 1.8) {
      setCriticalAlert(true);
    } else {
      setCriticalAlert(false);
    }
  }, [temperature, rpm, pressure]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: rect.height,
        });
      }
    };

    handleResize(); // Initialize dimensions
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions with higher resolution for retina displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Animation function
    const animate = (timestamp: number) => {
      if (!lastTimestamp.current) lastTimestamp.current = timestamp;
      lastTimestamp.current = timestamp;

      // Dark gradient background that works with both light/dark modes
      const gradient = ctx.createLinearGradient(0, 0, 0, rect.height);
      gradient.addColorStop(0, "rgba(15, 23, 42, 0.95)"); // dark blue-gray
      gradient.addColorStop(1, "rgba(3, 7, 18, 0.98)"); // darker blue-gray
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Draw engineering grid lines
      drawGrid(ctx, rect.width, rect.height, timestamp);

      // Draw engine blueprint background
      drawBlueprintBackground(ctx, rect.width, rect.height);

      // Draw main engine visualization
      drawPowerPlantSystem(ctx, rect.width, rect.height, timestamp, rpm);

      // Draw critical alert if needed
      if (criticalAlert) {
        drawCriticalAlert(ctx, rect.width, rect.height, timestamp);
      }

      // Draw status indicators and data overlay
      drawDataOverlay(ctx, rect.width, rect.height, timestamp);

      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [
    temperature,
    fuelRate,
    load,
    running,
    rpm,
    pressure,
    efficiency,
    criticalAlert,
    dimensions,
  ]);

  // Draw background engineering grid with animation
  const drawGrid = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    timestamp: number
  ) => {
    const pulse = Math.sin(timestamp / 2000) * 0.1 + 0.3; // Creates a pulsing effect

    // Major grid
    ctx.strokeStyle = `rgba(50, 130, 240, ${0.1 + pulse * 0.05})`;
    ctx.lineWidth = 0.5;

    const majorSize = 50;
    // Vertical lines
    for (let x = 0; x < width; x += majorSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y < height; y += majorSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Minor grid
    ctx.strokeStyle = `rgba(50, 130, 240, ${0.05 + pulse * 0.02})`;
    ctx.lineWidth = 0.2;

    const minorSize = 10;
    // Vertical minor lines
    for (let x = 0; x < width; x += minorSize) {
      if (x % majorSize !== 0) {
        // Skip where major lines already exist
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
    }

    // Horizontal minor lines
    for (let y = 0; y < height; y += minorSize) {
      if (y % majorSize !== 0) {
        // Skip where major lines already exist
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    // Add coordinate numbers for technical look
    ctx.fillStyle = `rgba(100, 200, 255, ${0.2 + pulse * 0.1})`;
    ctx.font = "8px monospace";

    for (let x = 0; x < width; x += majorSize * 2) {
      for (let y = 0; y < height; y += majorSize * 2) {
        ctx.fillText(`${x},${y}`, x + 2, y + 8);
      }
    }
  };

  // Draw blueprint-style background
  const drawBlueprintBackground = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    // Blueprint border
    ctx.strokeStyle = "rgba(0, 150, 255, 0.5)";
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    // Corner marks
    const cornerSize = 15;

    // Top-left
    ctx.beginPath();
    ctx.moveTo(10, 25);
    ctx.lineTo(10, 10);
    ctx.lineTo(25, 10);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(width - 25, 10);
    ctx.lineTo(width - 10, 10);
    ctx.lineTo(width - 10, 25);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(10, height - 25);
    ctx.lineTo(10, height - 10);
    ctx.lineTo(25, height - 10);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(width - 25, height - 10);
    ctx.lineTo(width - 10, height - 10);
    ctx.lineTo(width - 10, height - 25);
    ctx.stroke();
  };

  // Draw simplified power plant system
  const drawPowerPlantSystem = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    timestamp: number,
    currentRpm: number
  ) => {
    // Layout coordinates
    const centerY = height * 0.5;
    const padding = 40;

    // Engine block
    const engineX = width * 0.25;
    const engineY = centerY;
    const engineWidth = Math.min(width * 0.25, 200);
    const engineHeight = Math.min(height * 0.3, 150);

    // Alternator block
    const alternatorX = width * 0.6;
    const alternatorY = centerY;
    const alternatorWidth = Math.min(width * 0.15, 120);
    const alternatorHeight = Math.min(height * 0.25, 120);

    // Transformer
    const transformerX = width * 0.85;
    const transformerY = centerY - 40;
    const transformerWidth = 50;
    const transformerHeight = 80;

    // Power lines and pylons
    const pylonX1 = width - 80;
    const pylonX2 = width - 30;
    const pylonY = centerY - 100;
    const pylonHeight = 80;

    // ====== DRAW THE ENGINE BLOCK ======
    // Engine gradient with metallic effect
    const engineGradient = ctx.createLinearGradient(
      engineX - engineWidth / 2,
      engineY - engineHeight / 2,
      engineX + engineWidth / 2,
      engineY + engineHeight / 2
    );
    engineGradient.addColorStop(0, "#333");
    engineGradient.addColorStop(0.4, "#444");
    engineGradient.addColorStop(0.6, "#3a3a3a");
    engineGradient.addColorStop(1, "#333");

    ctx.fillStyle = engineGradient;
    ctx.fillRect(
      engineX - engineWidth / 2,
      engineY - engineHeight / 2,
      engineWidth,
      engineHeight
    );

    // Engine outline with glow when running
    if (running) {
      const pulseIntensity = 0.2 + Math.sin(timestamp / 200) * 0.1;

      // Glow effect
      ctx.strokeStyle = `rgba(0, 180, 255, ${pulseIntensity})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(
        engineX - engineWidth / 2,
        engineY - engineHeight / 2,
        engineWidth,
        engineHeight
      );
    } else {
      ctx.strokeStyle = "#444";
      ctx.lineWidth = 1;
      ctx.strokeRect(
        engineX - engineWidth / 2,
        engineY - engineHeight / 2,
        engineWidth,
        engineHeight
      );
    }

    // Engine label and data
    ctx.fillStyle = running
      ? "rgba(100, 200, 255, 0.9)"
      : "rgba(150, 150, 150, 0.7)";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.fillText("DIESEL ENGINE", engineX, engineY - engineHeight / 2 - 10);

    // Engine technical data
    ctx.font = "10px monospace";
    ctx.fillStyle = "rgba(100, 200, 255, 0.7)";
    ctx.textAlign = "left";
    ctx.fillText(
      `TEMP: ${temperature.toFixed(1)}°C`,
      engineX - engineWidth / 2 + 10,
      engineY - engineHeight / 4
    );
    ctx.fillText(
      `RPM: ${currentRpm.toFixed(0)}`,
      engineX - engineWidth / 2 + 10,
      engineY
    );
    ctx.fillText(
      `FUEL: ${fuelRate.toFixed(1)}%`,
      engineX - engineWidth / 2 + 10,
      engineY + engineHeight / 4
    );

    // ====== DRAW THE ROTATING SHAFT ======
    const shaftY = centerY;
    const shaftStart = engineX + engineWidth / 2;
    const shaftEnd = alternatorX - alternatorWidth / 2;

    // Shaft housing
    ctx.fillStyle = "#222";
    ctx.fillRect(shaftStart, shaftY - 5, shaftEnd - shaftStart, 10);
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 1;
    ctx.strokeRect(shaftStart, shaftY - 5, shaftEnd - shaftStart, 10);

    // Rotating shaft with animation - speed based on RPM
    if (running) {
      // Adjust shaft speed based on RPM (600-4000 range)
      const shaftSpeed = timestamp * (0.1 + (currentRpm / 4000) * 0.9);

      ctx.save();
      // Create a clipping region for the shaft
      ctx.beginPath();
      ctx.rect(shaftStart, shaftY - 5, shaftEnd - shaftStart, 10);
      ctx.clip();

      // Draw the rotating pattern
      ctx.strokeStyle = "#999";
      ctx.lineWidth = 2;

      for (let x = shaftStart - 50 + (shaftSpeed % 20); x < shaftEnd; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, shaftY - 5);
        ctx.lineTo(x + 10, shaftY + 5);
        ctx.stroke();
      }

      ctx.restore();
    }

    // ====== DRAW THE ALTERNATOR ======
    // Alternator gradient
    const alternatorGradient = ctx.createLinearGradient(
      alternatorX - alternatorWidth / 2,
      alternatorY - alternatorHeight / 2,
      alternatorX + alternatorWidth / 2,
      alternatorY + alternatorHeight / 2
    );
    alternatorGradient.addColorStop(0, "#2a2a3a");
    alternatorGradient.addColorStop(0.5, "#3a3a4a");
    alternatorGradient.addColorStop(1, "#2a2a3a");

    ctx.fillStyle = alternatorGradient;
    ctx.fillRect(
      alternatorX - alternatorWidth / 2,
      alternatorY - alternatorHeight / 2,
      alternatorWidth,
      alternatorHeight
    );

    // Alternator outline with glow when running
    if (running) {
      const pulseIntensity = 0.3 + Math.sin(timestamp / 300) * 0.2;

      // Glow effect
      ctx.strokeStyle = `rgba(0, 200, 255, ${pulseIntensity})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(
        alternatorX - alternatorWidth / 2,
        alternatorY - alternatorHeight / 2,
        alternatorWidth,
        alternatorHeight
      );

      // Electrical core animation
      const coreGlow = ctx.createRadialGradient(
        alternatorX,
        alternatorY,
        0,
        alternatorX,
        alternatorY,
        alternatorWidth * 0.4
      );
      coreGlow.addColorStop(0, `rgba(100, 200, 255, ${0.7 * pulseIntensity})`);
      coreGlow.addColorStop(1, `rgba(0, 100, 200, 0)`);

      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(alternatorX, alternatorY, alternatorWidth * 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = "#444";
      ctx.lineWidth = 1;
      ctx.strokeRect(
        alternatorX - alternatorWidth / 2,
        alternatorY - alternatorHeight / 2,
        alternatorWidth,
        alternatorHeight
      );
    }

    // ====== DRAW ROTATING ALTERNATOR FAN ======
    if (running) {
      ctx.save();
      ctx.translate(alternatorX, alternatorY);

      // Adjust rotation speed based on RPM (600-4000 range)
      const rotationSpeed = timestamp * (0.1 + (currentRpm / 4000) * 0.9);
      const rotationAngle = rotationSpeed / 1000;

      ctx.rotate(rotationAngle);

      // Draw fan blades (4 blades)
      const fanRadius = alternatorWidth * 0.25;
      ctx.fillStyle = "#444";

      for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.rotate((Math.PI / 2) * i);

        // Fan blade
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(fanRadius, 0);
        ctx.lineTo(fanRadius * 0.8, fanRadius * 0.2);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }

      // Center circle
      ctx.fillStyle = "#222";
      ctx.beginPath();
      ctx.arc(0, 0, fanRadius * 0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // Alternator label
    ctx.fillStyle = running
      ? "rgba(100, 200, 255, 0.9)"
      : "rgba(150, 150, 150, 0.7)";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      "ALTERNATOR",
      alternatorX,
      alternatorY - alternatorHeight / 2 - 10
    );

    // Alternator data
    if (running) {
      ctx.font = "10px monospace";
      ctx.fillText(
        `${efficiency.toFixed(1)}% EFF`,
        alternatorX,
        alternatorY + alternatorHeight / 2 + 15
      );
      ctx.fillText(
        `${load.toFixed(1)}% LOAD`,
        alternatorX,
        alternatorY + alternatorHeight / 2 + 30
      );
    }

    // ====== DRAW FUEL LINES ======
    // Fuel inlet from left side
    if (running) {
      const flowOffset = (timestamp / 300) % 20;

      ctx.strokeStyle = "#e67e22";
      ctx.lineCap = "round";
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 15]);
      ctx.lineDashOffset = -flowOffset;
    } else {
      ctx.strokeStyle = "#875000";
      ctx.lineCap = "butt";
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
    }

    // Main fuel line to engine
    ctx.beginPath();
    ctx.moveTo(padding, centerY - engineHeight / 4);
    ctx.lineTo(engineX - engineWidth / 2, centerY - engineHeight / 4);
    ctx.stroke();

    // Reset line style
    ctx.setLineDash([]);

    // ====== DRAW POWER LINES AND TRANSFORMER ======
    // Power line from alternator to transformer
    if (running) {
      const pulseIntensity = 0.6 + Math.sin(timestamp / 100) * 0.4;

      // Multiple layers for glow effect
      for (let i = 2; i >= 0; i--) {
        ctx.strokeStyle = `rgba(0, 200, 255, ${pulseIntensity * (1 - i / 3)})`;
        ctx.lineWidth = i + 1;

        ctx.beginPath();
        ctx.moveTo(alternatorX + alternatorWidth / 2, alternatorY);
        ctx.lineTo(transformerX - transformerWidth / 2, alternatorY);
        ctx.stroke();
      }

      // Electricity symbols
      ctx.fillStyle = `rgba(100, 200, 255, ${pulseIntensity})`;
      ctx.font = "bold 14px sans-serif";

      const symbols = ["⚡", "≈", "~"];
      const symbolX =
        alternatorX +
        alternatorWidth / 2 +
        (transformerX -
          transformerWidth / 2 -
          alternatorX -
          alternatorWidth / 2) /
          2;
      ctx.fillText(
        symbols[Math.floor(timestamp / 500) % symbols.length],
        symbolX,
        alternatorY - 10
      );
    } else {
      ctx.strokeStyle = "#338";
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.moveTo(alternatorX + alternatorWidth / 2, alternatorY);
      ctx.lineTo(transformerX - transformerWidth / 2, alternatorY);
      ctx.stroke();
    }

    // ====== DRAW TRANSFORMER ======
    // Transformer body
    const transformerGradient = ctx.createLinearGradient(
      transformerX - transformerWidth / 2,
      transformerY,
      transformerX + transformerWidth / 2,
      transformerY + transformerHeight
    );

    transformerGradient.addColorStop(0, "#444");
    transformerGradient.addColorStop(1, "#333");

    ctx.fillStyle = transformerGradient;
    ctx.fillRect(
      transformerX - transformerWidth / 2,
      transformerY,
      transformerWidth,
      transformerHeight
    );

    ctx.strokeStyle = running ? "rgba(100, 200, 255, 0.5)" : "#444";
    ctx.lineWidth = 1;
    ctx.strokeRect(
      transformerX - transformerWidth / 2,
      transformerY,
      transformerWidth,
      transformerHeight
    );

    // Transformer coils
    for (let i = 0; i < 3; i++) {
      const coilY = transformerY + 15 + i * 20;
      ctx.fillStyle = "#222";
      ctx.fillRect(
        transformerX - transformerWidth / 2 + 5,
        coilY,
        transformerWidth - 10,
        10
      );

      ctx.strokeStyle = "#555";
      ctx.lineWidth = 1;
      ctx.strokeRect(
        transformerX - transformerWidth / 2 + 5,
        coilY,
        transformerWidth - 10,
        10
      );
    }

    // Transformer label
    ctx.fillStyle = running
      ? "rgba(100, 200, 255, 0.7)"
      : "rgba(150, 150, 150, 0.7)";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("TRANSFORMER", transformerX, transformerY - 5);

    // ====== DRAW POWER PYLONS AND LINES ======
    // Draw pylons
    const drawPylon = (x: number) => {
      // Pylon base
      ctx.fillStyle = "#555";
      ctx.fillRect(x - 5, centerY - pylonHeight, 10, pylonHeight);

      // Cross arms
      ctx.fillRect(x - 25, centerY - pylonHeight, 50, 5);
      ctx.fillRect(x - 20, centerY - pylonHeight + 15, 40, 5);
    };

    drawPylon(pylonX1);
    drawPylon(pylonX2);

    // Power lines to/from pylons
    if (running) {
      const pulseIntensity = 0.5 + Math.sin(timestamp / 150) * 0.3;

      // Multiple layers for glow effect
      for (let i = 1; i >= 0; i--) {
        ctx.strokeStyle = `rgba(0, 180, 255, ${pulseIntensity * (1 - i / 2)})`;
        ctx.lineWidth = i + 1;

        // Line from transformer to first pylon
        ctx.beginPath();
        ctx.moveTo(transformerX + transformerWidth / 2, transformerY + 15);
        ctx.lineTo(pylonX1, centerY - pylonHeight + 5);
        ctx.stroke();

        // Upper power line between pylons
        ctx.beginPath();
        ctx.moveTo(pylonX1, centerY - pylonHeight + 2);

        // Add a slight curve to the line
        const cp1x = pylonX1 + (pylonX2 - pylonX1) * 0.25;
        const cp1y = centerY - pylonHeight - 5 + Math.sin(timestamp / 2000) * 2;
        const cp2x = pylonX1 + (pylonX2 - pylonX1) * 0.75;
        const cp2y = centerY - pylonHeight - 3 + Math.cos(timestamp / 2000) * 2;

        ctx.bezierCurveTo(
          cp1x,
          cp1y,
          cp2x,
          cp2y,
          pylonX2,
          centerY - pylonHeight + 2
        );
        ctx.stroke();

        // Lower power line between pylons
        ctx.beginPath();
        ctx.moveTo(pylonX1, centerY - pylonHeight + 17);

        const cp3x = pylonX1 + (pylonX2 - pylonX1) * 0.25;
        const cp3y =
          centerY - pylonHeight + 25 + Math.cos(timestamp / 2000) * 2;
        const cp4x = pylonX1 + (pylonX2 - pylonX1) * 0.75;
        const cp4y =
          centerY - pylonHeight + 25 + Math.sin(timestamp / 2000) * 2;

        ctx.bezierCurveTo(
          cp3x,
          cp3y,
          cp4x,
          cp4y,
          pylonX2,
          centerY - pylonHeight + 17
        );
        ctx.stroke();

        // Line continuing to the right
        ctx.beginPath();
        ctx.moveTo(pylonX2, centerY - pylonHeight + 2);
        ctx.lineTo(width, centerY - pylonHeight - 10);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(pylonX2, centerY - pylonHeight + 17);
        ctx.lineTo(width, centerY - pylonHeight + 5);
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = "#666";
      ctx.lineWidth = 1;

      // Line from transformer to first pylon
      ctx.beginPath();
      ctx.moveTo(transformerX + transformerWidth / 2, transformerY + 15);
      ctx.lineTo(pylonX1, centerY - pylonHeight + 5);
      ctx.stroke();

      // Power lines between pylons
      ctx.beginPath();
      ctx.moveTo(pylonX1, centerY - pylonHeight + 2);
      ctx.lineTo(pylonX2, centerY - pylonHeight + 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(pylonX1, centerY - pylonHeight + 17);
      ctx.lineTo(pylonX2, centerY - pylonHeight + 17);
      ctx.stroke();

      // Lines continuing to the right
      ctx.beginPath();
      ctx.moveTo(pylonX2, centerY - pylonHeight + 2);
      ctx.lineTo(width, centerY - pylonHeight - 10);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(pylonX2, centerY - pylonHeight + 17);
      ctx.lineTo(width, centerY - pylonHeight + 5);
      ctx.stroke();
    }

    // ====== SYSTEM INFO LABEL ======
    if (running) {
      const glow = ctx.createLinearGradient(
        width / 2 - 150,
        20,
        width / 2 + 150,
        45
      );

      const pulseIntensity = 0.7 + Math.sin(timestamp / 500) * 0.3;

      glow.addColorStop(0, `rgba(0, 150, 255, ${0.3 * pulseIntensity})`);
      glow.addColorStop(0.5, `rgba(0, 200, 255, ${0.8 * pulseIntensity})`);
      glow.addColorStop(1, `rgba(0, 150, 255, ${0.3 * pulseIntensity})`);

      ctx.fillStyle = glow;
    } else {
      ctx.fillStyle = "#567";
    }

    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center";
    ctx.fillText("DIESEL POWER PLANT SYSTEM", width / 2, 30);
  };

  // Draw critical alert overlay
  const drawCriticalAlert = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    timestamp: number
  ) => {
    const intensity = 0.5 + Math.sin(timestamp / 200) * 0.5;

    // Red alert overlay
    ctx.fillStyle = `rgba(255, 0, 0, ${intensity * 0.15})`;
    ctx.fillRect(0, 0, width, height);

    // Alert message
    ctx.fillStyle = `rgba(255, 50, 50, ${0.7 + intensity * 0.3})`;
    ctx.font = "bold 24px monospace";
    ctx.textAlign = "center";
    ctx.fillText("⚠ CRITICAL ALERT ⚠", width / 2, 30);

    // Alert details with flashing effect
    ctx.font = "bold 18px monospace";

    // Determine critical parameters
    let criticalParams = [];
    if (temperature > 95)
      criticalParams.push(`TEMPERATURE: ${temperature.toFixed(1)}°C`);
    if (rpm > 3800) criticalParams.push(`RPM: ${rpm.toFixed(0)}`);
    if (pressure > 1.8)
      criticalParams.push(`PRESSURE: ${pressure.toFixed(2)} MPa`);

    ctx.fillStyle = `rgba(255, 200, 50, ${intensity})`;
    criticalParams.forEach((param, i) => {
      ctx.fillText(param, width / 2, 60 + i * 25);
    });
  };

  // Draw data overlay with system status
  const drawDataOverlay = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    timestamp: number
  ) => {
    const pulse = 0.7 + Math.sin(timestamp / 1000) * 0.3;

    // Bottom status bar
    ctx.fillStyle = "rgba(0, 20, 40, 0.7)";
    ctx.fillRect(0, height - 24, width, 24);

    // System time and status
    ctx.fillStyle = running
      ? `rgba(100, 200, 255, ${pulse})`
      : "rgba(150, 150, 150, 0.7)";

    ctx.font = "10px monospace";
    ctx.textAlign = "left";
    ctx.fillText(
      `STATUS: ${
        running ? "ONLINE" : "OFFLINE"
      } | TIME: ${new Date().toLocaleTimeString()} | RPM: ${rpm.toFixed(
        0
      )} | TEMP: ${temperature.toFixed(1)}°C | LOAD: ${load.toFixed(1)}%`,
      10,
      height - 9
    );

    // Right side system ID
    ctx.textAlign = "right";
    ctx.fillText(
      `SYS-ID: DPE-${(Math.floor(timestamp / 1000) % 10000)
        .toString()
        .padStart(4, "0")}`,
      width - 10,
      height - 9
    );

    // Top-right efficiency indicator
    if (running) {
      const efficiencyColor =
        efficiency > 80
          ? "rgba(0, 255, 100, 0.8)"
          : efficiency > 60
          ? "rgba(255, 255, 0, 0.8)"
          : "rgba(255, 100, 0, 0.8)";

      ctx.fillStyle = efficiencyColor;
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`EFFICIENCY: ${efficiency.toFixed(1)}%`, width - 15, 20);
    }
  };

  // Get color for gauges
  const getValueColor = (value: number, critical: number, warning: number) => {
    if (value > critical) return "#ff4545";
    if (value > warning) return "#ffcc00";
    return "#30BF78"; // green
  };

  const temperatureColor = getValueColor(temperature, 95, 85);
  const rpmColor = getValueColor(rpm, 3800, 3200);
  const pressureColor = getValueColor(pressure, 1.8, 1.5);

  return (
    <div className="relative w-full bg-black shadow-md rounded-lg overflow-hidden">
      <div
        className={`relative w-full bg-black rounded-lg overflow-hidden border ${
          criticalAlert ? "border-red-500" : "border-gray-800"
        }`}
      >
        {/* Canvas for power plant animation */}
        <div className="w-full h-[350px] md:h-[400px]">
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ width: "100%", height: "100%" }}
          />
        </div>

        {/* Gauges section */}
        <div className="w-full flex flex-wrap justify-around items-center px-2 pt-4 pb-2 bg-gray-950/80">
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* RPM Gauge */}
            <div className="flex justify-center">
              <RadialGauge
                width={200}
                height={200}
                units="RPM"
                title="RPM"
                value={rpm}
                minValue={0}
                maxValue={4000}
                majorTicks={["0", "1000", "2000", "3000", "4000"]}
                minorTicks={4}
                strokeTicks={true}
                highlights={[
                  { from: 0, to: 3200, color: "rgba(0, 255, 0, .15)" },
                  { from: 3200, to: 3800, color: "rgba(255, 255, 0, .25)" },
                  { from: 3800, to: 4000, color: "rgba(255, 0, 0, .25)" },
                ]}
                colorPlate="#222"
                colorMajorTicks="#f5f5f5"
                colorMinorTicks="#ddd"
                colorTitle="#fff"
                colorUnits="#ccc"
                colorNumbers="#eee"
                colorNeedle={rpmColor}
                colorNeedleEnd={rpmColor}
                valueBox={true}
                animationRule="linear"
                animationDuration={100}
                fontNumbersSize={20}
                fontUnitsSize={22}
                fontTitleSize={24}
                borders={false}
                borderShadowWidth={0}
                needleType="arrow"
                needleWidth={2}
                needleCircleSize={7}
                needleCircleOuter={true}
                needleCircleInner={false}
                animatedValue={true}
              />
            </div>

            {/* Temperature Gauge */}
            <div className="flex justify-center">
              <RadialGauge
                width={200}
                height={200}
                units="°C"
                title="TEMPERATURE"
                value={temperature}
                minValue={0}
                maxValue={120}
                majorTicks={["0", "20", "40", "60", "80", "100", "120"]}
                minorTicks={5}
                strokeTicks={true}
                highlights={[
                  { from: 0, to: 85, color: "rgba(0, 255, 0, .15)" },
                  { from: 85, to: 95, color: "rgba(255, 255, 0, .25)" },
                  { from: 95, to: 120, color: "rgba(255, 0, 0, .25)" },
                ]}
                colorPlate="#222"
                colorMajorTicks="#f5f5f5"
                colorMinorTicks="#ddd"
                colorTitle="#fff"
                colorUnits="#ccc"
                colorNumbers="#eee"
                colorNeedle={temperatureColor}
                colorNeedleEnd={temperatureColor}
                valueBox={true}
                animationRule="linear"
                animationDuration={100}
                fontNumbersSize={20}
                fontUnitsSize={22}
                fontTitleSize={24}
                borders={false}
                borderShadowWidth={0}
                needleType="arrow"
                needleWidth={2}
                needleCircleSize={7}
                needleCircleOuter={true}
                needleCircleInner={false}
                animatedValue={true}
              />
            </div>

            {/* Pressure Gauge */}
            <div className="flex justify-center">
              <RadialGauge
                width={200}
                height={200}
                units="MPa"
                title="PRESSURE"
                value={pressure}
                minValue={0}
                maxValue={2.5}
                majorTicks={["0", "0.5", "1.0", "1.5", "2.0", "2.5"]}
                minorTicks={5}
                strokeTicks={true}
                highlights={[
                  { from: 0, to: 1.5, color: "rgba(0, 255, 0, .15)" },
                  { from: 1.5, to: 1.8, color: "rgba(255, 255, 0, .25)" },
                  { from: 1.8, to: 2.5, color: "rgba(255, 0, 0, .25)" },
                ]}
                colorPlate="#222"
                colorMajorTicks="#f5f5f5"
                colorMinorTicks="#ddd"
                colorTitle="#fff"
                colorUnits="#ccc"
                colorNumbers="#eee"
                colorNeedle={pressureColor}
                colorNeedleEnd={pressureColor}
                valueBox={true}
                animationRule="linear"
                animationDuration={100}
                fontNumbersSize={20}
                fontUnitsSize={22}
                fontTitleSize={24}
                borders={false}
                borderShadowWidth={0}
                needleType="arrow"
                needleWidth={2}
                needleCircleSize={7}
                needleCircleOuter={true}
                needleCircleInner={false}
                animatedValue={true}
              />
            </div>
          </div>
        </div>

        <div className="absolute bottom-2 left-2 text-xs text-gray-400">
          {running
            ? `ENGINE OPERATIONAL | ${new Date().toLocaleTimeString()}`
            : "ENGINE OFFLINE"}
        </div>

        {criticalAlert && (
          <div className="absolute top-2 right-2 text-xs text-red-500 font-mono font-bold animate-pulse">
            WARNING: CRITICAL PARAMETERS
          </div>
        )}
      </div>
    </div>
  );
}
