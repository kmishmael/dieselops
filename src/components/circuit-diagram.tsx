"use client";

import { useRef, useEffect } from "react";

interface CircuitDiagramProps {
  powerOutput: number;
  generatorExcitation: number;
  load: number;
  running: boolean;
}

export default function CircuitDiagram({
  powerOutput,
  generatorExcitation,
  load,
  running,
}: CircuitDiagramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Draw circuit background
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw grid
    drawGrid(ctx, rect.width, rect.height);

    // Draw circuit components
    drawCircuitComponents(ctx, rect.width, rect.height);

    // Draw power flow
    if (running) {
      drawPowerFlow(ctx, rect.width, rect.height);
    }

    // Draw labels and values
    drawLabels(ctx, rect.width, rect.height);
  }, [powerOutput, generatorExcitation, load, running]);

  const drawGrid = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 1;

    // Draw grid lines
    const gridSize = 20;

    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  };

  const drawCircuitComponents = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    // Define component positions
    const centerX = width / 2;
    const diagramWidth = 450;
    const startX = centerX - diagramWidth / 2;

    const engineX = startX;
    const engineY = height / 2;
    const generatorX = startX + 150; // Was 250 (150 from engine)
    const generatorY = height / 2;
    const transformerX = startX + 300; // Was 400 (300 from engine)
    const transformerY = height / 2;
    const loadX = startX + 450; // Was 550 (450 from engine)
    const loadY = height / 2;

    // Draw engine
    ctx.fillStyle = "#444";
    ctx.fillRect(engineX - 40, engineY - 30, 80, 60);

    // Draw generator
    ctx.fillStyle = "#335";
    ctx.beginPath();
    ctx.arc(generatorX, generatorY, 40, 0, Math.PI * 2);
    ctx.fill();

    // Draw transformer
    ctx.fillStyle = "#353";
    ctx.fillRect(transformerX - 30, transformerY - 40, 60, 80);

    // Draw load
    ctx.fillStyle = "#533";
    ctx.fillRect(loadX - 40, loadY - 30, 80, 60);

    // Draw connecting lines
    ctx.strokeStyle = "#aaa";
    ctx.lineWidth = 3;

    // Engine to generator
    ctx.beginPath();
    ctx.moveTo(engineX + 40, engineY);
    ctx.lineTo(generatorX - 40, generatorY);
    ctx.stroke();

    // Generator to transformer
    ctx.beginPath();
    ctx.moveTo(generatorX + 40, generatorY);
    ctx.lineTo(transformerX - 30, transformerY);
    ctx.stroke();

    // Transformer to load
    ctx.beginPath();
    ctx.moveTo(transformerX + 30, transformerY);
    ctx.lineTo(loadX - 40, loadY);
    ctx.stroke();

    // Draw component details

    // Engine details
    ctx.fillStyle = "#666";
    ctx.fillRect(engineX - 30, engineY - 20, 60, 40);

    // Generator windings
    ctx.strokeStyle = "#557";
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const innerRadius = 20;
      const outerRadius = 35;

      ctx.beginPath();
      ctx.moveTo(
        generatorX + Math.cos(angle) * innerRadius,
        generatorY + Math.sin(angle) * innerRadius
      );
      ctx.lineTo(
        generatorX + Math.cos(angle) * outerRadius,
        generatorY + Math.sin(angle) * outerRadius
      );
      ctx.stroke();
    }

    // Transformer windings
    ctx.strokeStyle = "#575";
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const y = transformerY - 30 + i * 15;
      ctx.moveTo(transformerX - 20, y);
      ctx.lineTo(transformerX - 5, y);
    }
    ctx.stroke();

    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const y = transformerY - 35 + i * 10;
      ctx.moveTo(transformerX + 5, y);
      ctx.lineTo(transformerX + 20, y);
    }
    ctx.stroke();

    // Load details
    ctx.strokeStyle = "#755";
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const y = loadY - 15 + i * 15;
      ctx.moveTo(loadX - 30, y);
      ctx.lineTo(loadX + 30, y);
    }
    ctx.stroke();
  };

  const drawPowerFlow = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    const centerX = width / 2;

    // Calculate the total width of our diagram
    const diagramWidth = 450; // From engine to load

    // Start X position to center the diagram
    const startX = centerX - diagramWidth / 2;

    // Define component positions
    const engineX = startX;
    const engineY = height / 2;
    const generatorX = startX + 150;
    const generatorY = height / 2;
    const transformerX = startX + 300;
    const transformerY = height / 2;
    const loadX = startX + 450;
    const loadY = height / 2;

    // Animation time
    const time = Date.now() / 1000;

    // Draw power flow from engine to generator
    const mechanicalPower = powerOutput * 1.2; // Mechanical power is higher due to losses
    drawFlowingDots(
      ctx,
      engineX + 40,
      engineY,
      generatorX - 40,
      generatorY,
      "#fa0",
      time,
      mechanicalPower / 20
    );

    // Draw power flow from generator to transformer
    const generatorOutput = powerOutput * (generatorExcitation / 100);
    drawFlowingDots(
      ctx,
      generatorX + 40,
      generatorY,
      transformerX - 30,
      transformerY,
      "#0af",
      time,
      generatorOutput / 20
    );

    // Draw power flow from transformer to load
    const transformerOutput = generatorOutput * 0.98; // Small transformer loss
    drawFlowingDots(
      ctx,
      transformerX + 30,
      transformerY,
      loadX - 40,
      loadY,
      "#0fa",
      time,
      transformerOutput / 20
    );
  };

  const drawFlowingDots = (
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    time: number,
    intensity: number
  ) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Number of dots based on intensity
    const dotCount = Math.max(3, Math.floor(intensity * 10));

    for (let i = 0; i < dotCount; i++) {
      // Position along the line, cycling with time
      const pos = (i / dotCount + (time % 1)) % 1;

      const x = x1 + dx * pos;
      const y = y1 + dy * pos;

      // Dot size based on intensity
      const dotSize = Math.max(2, Math.min(6, intensity));

      // Draw dot
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, dotSize, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawLabels = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    const centerX = width / 2;

    // Calculate the total width of our diagram
    const diagramWidth = 450; // From engine to load

    // Start X position to center the diagram
    const startX = centerX - diagramWidth / 2;

    // Define component positions relative to startX
    const engineX = startX;
    const generatorX = startX + 150;
    const transformerX = startX + 300;
    const loadX = startX + 450;

    ctx.font = "12px monospace";

    // Engine label
    ctx.fillStyle = "#ccc";
    ctx.fillText("DIESEL ENGINE", engineX - 40, height / 2 - 40);
    ctx.fillStyle = running ? "#0f0" : "#f00";
    ctx.fillText(
      running ? "RUNNING" : "STOPPED",
      engineX - 20,
      height / 2 + 50
    );

    // Generator label
    ctx.fillStyle = "#ccc";
    ctx.fillText("GENERATOR", generatorX - 30, height / 2 - 50);
    ctx.fillStyle = "#aaf";
    ctx.fillText(
      `${generatorExcitation}% EXC`,
      generatorX - 30,
      height / 2 + 60
    );

    // Transformer label
    ctx.fillStyle = "#ccc";
    ctx.fillText("TRANSFORMER", transformerX - 40, height / 2 - 50);
    ctx.fillStyle = "#afa";
    ctx.fillText("11kV/400V", transformerX - 30, height / 2 + 60);

    // Load label
    ctx.fillStyle = "#ccc";
    ctx.fillText("LOAD", loadX - 15, height / 2 - 50);
    ctx.fillStyle = "#faa";
    ctx.fillText(`${load}%`, loadX - 10, height / 2 + 60);

    // Power output
    ctx.fillStyle = "#fff";
    ctx.font = "14px monospace";
    ctx.fillText(
      `POWER OUTPUT: ${powerOutput.toFixed(1)} MW`,
      width / 2 - 80,
      30
    );

    // Circuit diagram title
    ctx.fillStyle = "#999";
    ctx.font = "10px monospace";
    ctx.fillText("DIESEL POWER PLANT - SINGLE LINE DIAGRAM", 20, 20);
  };

  return (
    <div className="w-full h-[400px] bg-zinc-900 rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
