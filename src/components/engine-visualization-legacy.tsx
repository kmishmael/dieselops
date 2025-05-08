"use client";

import { useRef, useEffect, useState } from "react";
import { RadialGauge } from "react-canvas-gauges";

interface EngineVisualizationProps {
  temperature: number;
  fuelLevel?: number;
  load: number;
  running: boolean;
  rpm: number;
  voltage?: number;
  frequency?: number;
}

export default function DieselPowerPlantVisualization({
  temperature,
  fuelLevel =80,
  load,
  running,
  rpm,
  voltage = 480,
  frequency = 60,
}: EngineVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [criticalAlert, setCriticalAlert] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Check for critical conditions
  useEffect(() => {
    if (temperature > 95 || rpm > 3800 || fuelLevel < 10) {
      setCriticalAlert(true);
    } else {
      setCriticalAlert(false);
    }
  }, [temperature, rpm, fuelLevel]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setCanvasSize({
          width: rect.width,
          height: rect.height,
        });
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Render static canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Technical background
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    // Draw system components
    drawPowerPlantSystem(ctx, canvasSize.width, canvasSize.height);

    // Draw critical alert if needed
    if (criticalAlert) {
      drawTechnicalAlert(ctx, canvasSize.width, canvasSize.height);
    }
  }, [canvasSize, temperature, fuelLevel, load, running, rpm, criticalAlert]);

  const drawPowerPlantSystem = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    const centerY = height * 0.5;
    const engineColor = running ? "#d4d4d4" : "#666";
    const activeColor = running ? "#e5e5e5" : "#777";

    // 1. Diesel Engine Block (left)
    const engineX = width * 0.3;
    const engineWidth = width * 0.25;
    const engineHeight = height * 0.25;

    // Engine main block
    ctx.fillStyle = engineColor;
    ctx.fillRect(
      engineX - engineWidth / 2,
      centerY - engineHeight / 2,
      engineWidth,
      engineHeight
    );

    // Engine details
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 1;
    ctx.strokeRect(
      engineX - engineWidth / 2,
      centerY - engineHeight / 2,
      engineWidth,
      engineHeight
    );

    // Cylinder heads
    const cylinderCount = 6;
    const cylinderWidth = engineWidth * 0.8 / cylinderCount;
    for (let i = 0; i < cylinderCount; i++) {
      const cylinderX = engineX - engineWidth / 2 + (i + 0.5) * cylinderWidth;
      ctx.fillStyle = running && i % 2 === 0 ? "#f59e0b" : "#999";
      ctx.fillRect(
        cylinderX - cylinderWidth / 2,
        centerY - engineHeight / 2 - 15,
        cylinderWidth,
        15
      );
    }

    // 2. Mechanical Coupling to Alternator
    const couplingX = engineX + engineWidth / 2;
    const couplingWidth = width * 0.05;

    ctx.fillStyle = "#888";
    ctx.beginPath();
    ctx.arc(
      couplingX + couplingWidth / 2,
      centerY,
      couplingWidth / 3,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Shaft
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(couplingX, centerY);
    ctx.lineTo(couplingX + couplingWidth, centerY);
    ctx.stroke();

    // Rotating shaft effect
    if (running) {
      ctx.strokeStyle = "#f59e0b";
      ctx.setLineDash([3, 5]);
      ctx.lineDashOffset = -((Date.now() / 50) % 8);
      ctx.beginPath();
      ctx.moveTo(couplingX, centerY);
      ctx.lineTo(couplingX + couplingWidth, centerY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 3. Alternator (Generator)
    const alternatorX = couplingX + couplingWidth + width * 0.1;
    const alternatorWidth = width * 0.2;
    const alternatorHeight = height * 0.2;

    // Alternator housing
    ctx.fillStyle = engineColor;
    ctx.fillRect(
      alternatorX - alternatorWidth / 2,
      centerY - alternatorHeight / 2,
      alternatorWidth,
      alternatorHeight
    );

    // Cooling fins
    const finCount = 8;
    const finWidth = alternatorWidth * 0.8 / finCount;
    for (let i = 0; i < finCount; i++) {
      const finX = alternatorX - alternatorWidth / 2 + (i + 0.5) * finWidth;
      ctx.fillStyle = "#777";
      ctx.fillRect(
        finX - finWidth / 2,
        centerY - alternatorHeight / 2 - 10,
        finWidth,
        10
      );
    }

    // 4. Fuel System
    const fuelTankX = engineX;
    const fuelTankY = centerY + engineHeight / 2 + 30;
    const fuelTankWidth = engineWidth * 0.8;
    const fuelTankHeight = 20;

    // Tank body
    ctx.fillStyle = "#333";
    ctx.fillRect(
      fuelTankX - fuelTankWidth / 2,
      fuelTankY,
      fuelTankWidth,
      fuelTankHeight
    );

    // Fuel level
    const fuelWidth = (fuelTankWidth - 4) * (fuelLevel / 100);
    ctx.fillStyle = running ? "#f59e0b" : "#777";
    ctx.fillRect(
      fuelTankX - fuelTankWidth / 2 + 2,
      fuelTankY + 2,
      fuelWidth,
      fuelTankHeight - 4
    );

    // Fuel line to engine
    ctx.strokeStyle = running ? "#f59e0b" : "#666";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fuelTankX, fuelTankY);
    ctx.lineTo(fuelTankX, centerY + engineHeight / 2);
    ctx.stroke();

    // 5. Cooling System
    const radiatorX = engineX - engineWidth / 2 - 40;
    const radiatorY = centerY;
    const radiatorWidth = 30;
    const radiatorHeight = engineHeight * 0.8;

    // Radiator
    ctx.fillStyle = "#555";
    ctx.fillRect(
      radiatorX - radiatorWidth / 2,
      radiatorY - radiatorHeight / 2,
      radiatorWidth,
      radiatorHeight
    );

    // Radiator fins
    ctx.strokeStyle = "#777";
    ctx.lineWidth = 1;
    for (let y = radiatorY - radiatorHeight / 2 + 5; y < radiatorY + radiatorHeight / 2; y += 5) {
      ctx.beginPath();
      ctx.moveTo(radiatorX - radiatorWidth / 2, y);
      ctx.lineTo(radiatorX + radiatorWidth / 2, y);
      ctx.stroke();
    }

    // Coolant pipes
    ctx.strokeStyle = running ? "#3b82f6" : "#666";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(radiatorX + radiatorWidth / 2, radiatorY);
    ctx.lineTo(engineX - engineWidth / 2, centerY - engineHeight / 4);
    ctx.stroke();

    // 6. Electrical Output
    const terminalX = alternatorX + alternatorWidth / 2 + 30;
    const terminalY = centerY - 20;

    // Output terminals
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.arc(terminalX, terminalY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(terminalX, terminalY + 40, 5, 0, Math.PI * 2);
    ctx.fill();

    // Output cables
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(alternatorX + alternatorWidth / 2, centerY - 10);
    ctx.lineTo(terminalX, terminalY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(alternatorX + alternatorWidth / 2, centerY + 10);
    ctx.lineTo(terminalX, terminalY + 40);
    ctx.stroke();

    // Output label
    ctx.fillStyle = activeColor;
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      `${voltage}V ${frequency}Hz`,
      terminalX,
      terminalY + 60
    );

    // Component labels
    ctx.fillStyle = activeColor;
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.fillText("DIESEL ENGINE", engineX, centerY - engineHeight / 2 - 10);
    ctx.fillText("ALTERNATOR", alternatorX, centerY - alternatorHeight / 2 - 10);
    ctx.fillText("FUEL TANK", fuelTankX, fuelTankY + fuelTankHeight + 15);
    ctx.fillText("RADIATOR", radiatorX, radiatorY - radiatorHeight / 2 - 10);

    // Technical data
    ctx.font = "10px monospace";
    ctx.textAlign = "left";
    ctx.fillText(
      `RPM: ${rpm}`,
      engineX - engineWidth / 2 + 10,
      centerY - engineHeight / 4
    );
    ctx.fillText(
      `Temp: ${temperature}°C`,
      engineX - engineWidth / 2 + 10,
      centerY
    );
    ctx.fillText(
      `Load: ${load}%`,
      engineX - engineWidth / 2 + 10,
      centerY + engineHeight / 4
    );
  };

  const drawTechnicalAlert = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    // Alert background
    ctx.fillStyle = "rgba(220, 38, 38, 0.1)";
    ctx.fillRect(0, 0, width, height);

    // Alert message
    ctx.fillStyle = "#ef4444";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.fillText("CRITICAL ALERT", width / 2, 20);

    // Critical parameters
    ctx.font = "12px monospace";
    let criticalParams: string[] = [];
    if (temperature > 95) criticalParams.push(`HIGH TEMP: ${temperature}°C`);
    if (rpm > 3800) criticalParams.push(`OVERSPEED: ${rpm} RPM`);
    if (fuelLevel < 10) criticalParams.push(`LOW FUEL: ${fuelLevel}%`);

    criticalParams.forEach((param, i) => {
      ctx.fillText(param, width / 2, 40 + i * 15);
    });
  };

  const temperatureColor = temperature > 95 ? "#ef4444" : temperature > 85 ? "#f59e0b" : "#10b981";
  const rpmColor = rpm > 3800 ? "#ef4444" : rpm > 3200 ? "#f59e0b" : "#10b981";
  const fuelColor = fuelLevel < 15 ? "#ef4444" : fuelLevel < 30 ? "#f59e0b" : "#10b981";

  return (
    <div className="relative w-full bg-gray-900 rounded-lg overflow-hidden">
      <div className={`relative w-full ${criticalAlert ? "border border-red-500" : ""}`}>
        {/* Technical diagram */}
        <div className="w-full h-[300px]">
          <canvas
            ref={canvasRef}
            className="w-full h-full"
          />
        </div>

        {/* Key gauges - simplified to only essential metrics */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-800">
          {/* RPM Gauge */}
          <div className="flex justify-center">
            <RadialGauge
              width={180}
              height={180}
              units="RPM"
              title="ENGINE SPEED"
              value={rpm}
              minValue={0}
              maxValue={4000}
              majorTicks={["0", "1000", "2000", "3000", "4000"]}
              minorTicks={4}
              strokeTicks={true}
              highlights={[
                { from: 0, to: 3200, color: "rgba(0, 200, 0, 0.2)" },
                { from: 3200, to: 3800, color: "rgba(255, 200, 0, 0.2)" },
                { from: 3800, to: 4000, color: "rgba(255, 0, 0, 0.2)" },
              ]}
              colorPlate="#222"
              colorMajorTicks="#aaa"
              colorMinorTicks="#888"
              colorTitle="#eee"
              colorUnits="#ccc"
              colorNumbers="#ddd"
              colorNeedle={rpmColor}
              colorNeedleEnd={rpmColor}
              valueBox={true}
              animationRule="linear"
              animationDuration={100}
              fontNumbersSize={16}
              fontUnitsSize={18}
              fontTitleSize={20}
              borders={false}
              needleType="arrow"
              needleWidth={2}
              needleCircleSize={5}
              animatedValue={true}
            />
          </div>

          {/* Temperature Gauge */}
          <div className="flex justify-center">
            <RadialGauge
              width={180}
              height={180}
              units="°C"
              title="ENGINE TEMP"
              value={temperature}
              minValue={0}
              maxValue={120}
              majorTicks={["0", "20", "40", "60", "80", "100", "120"]}
              minorTicks={5}
              strokeTicks={true}
              highlights={[
                { from: 0, to: 85, color: "rgba(0, 200, 0, 0.2)" },
                { from: 85, to: 95, color: "rgba(255, 200, 0, 0.2)" },
                { from: 95, to: 120, color: "rgba(255, 0, 0, 0.2)" },
              ]}
              colorPlate="#222"
              colorMajorTicks="#aaa"
              colorMinorTicks="#888"
              colorTitle="#eee"
              colorUnits="#ccc"
              colorNumbers="#ddd"
              colorNeedle={temperatureColor}
              colorNeedleEnd={temperatureColor}
              valueBox={true}
              animationRule="linear"
              animationDuration={100}
              fontNumbersSize={16}
              fontUnitsSize={18}
              fontTitleSize={20}
              borders={false}
              needleType="arrow"
              needleWidth={2}
              needleCircleSize={5}
              animatedValue={true}
            />
          </div>

          {/* Fuel Level Gauge */}
          <div className="flex justify-center">
            <RadialGauge
              width={180}
              height={180}
              units="%"
              title="FUEL LEVEL"
              value={fuelLevel}
              minValue={0}
              maxValue={100}
              majorTicks={["0", "25", "50", "75", "100"]}
              minorTicks={5}
              strokeTicks={true}
              highlights={[
                { from: 0, to: 15, color: "rgba(255, 0, 0, 0.2)" },
                { from: 15, to: 30, color: "rgba(255, 200, 0, 0.2)" },
                { from: 30, to: 100, color: "rgba(0, 200, 0, 0.2)" },
              ]}
              colorPlate="#222"
              colorMajorTicks="#aaa"
              colorMinorTicks="#888"
              colorTitle="#eee"
              colorUnits="#ccc"
              colorNumbers="#ddd"
              colorNeedle={fuelColor}
              colorNeedleEnd={fuelColor}
              valueBox={true}
              animationRule="linear"
              animationDuration={100}
              fontNumbersSize={16}
              fontUnitsSize={18}
              fontTitleSize={20}
              borders={false}
              needleType="arrow"
              needleWidth={2}
              needleCircleSize={5}
              animatedValue={true}
            />
          </div>
        </div>

        {/* Status indicator */}
        <div className="absolute bottom-2 left-2 text-xs font-mono">
          {running ? (
            <span className="text-green-400">OPERATIONAL</span>
          ) : (
            <span className="text-gray-400">STANDBY</span>
          )}
        </div>

        {/* Critical alert indicator */}
        {criticalAlert && (
          <div className="absolute top-2 right-2 text-xs font-mono text-red-500">
            ALERT: CRITICAL PARAMETER
          </div>
        )}
      </div>
    </div>
  );
}