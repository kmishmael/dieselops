import React, { useEffect, useState } from "react";
import "./eng.css";
import { RadialGauge } from "react-canvas-gauges";
import AlternatorFan from "./alternator-fan";

interface EngineVisualizationProps {
  temperature: number;
  load: number;
  running: boolean;
  rpm: number;
  voltage?: number;
  frequency?: number;
  excitation: number;
}

interface GaugeProps {
  label: string;
  value: number;
  unit: string;
  minValue: number;
  maxValue: number;
  size?: number;
}

const Gauge: React.FC<GaugeProps> = ({
  label,
  value,
  unit,
  minValue,
  maxValue,
  size = 150,
}) => {
  const safeValue = Math.min(Math.max(value, minValue), maxValue);

  let highlights: { from: number; to: number; color: string }[] = [];
  let valueTextColor = "#E2E8F0";

  if (label.toLowerCase().includes("temp")) {
    valueTextColor =
      safeValue > 95
        ? "rgba(239, 68, 68, 1)"
        : safeValue > 80
        ? "rgba(245, 158, 11, 1)"
        : "rgba(34, 197, 94, 1)";
    highlights = [
      { from: minValue, to: 80, color: "rgba(34, 197, 94, 0.75)" },
      { from: 80, to: 95, color: "rgba(245, 158, 11, 0.75)" },
      { from: 95, to: maxValue, color: "rgba(239, 68, 68, 0.75)" },
    ];
  } else if (label.toLowerCase().includes("load")) {
    valueTextColor =
      safeValue > 90
        ? "rgba(239, 68, 68, 1)"
        : safeValue > 75
        ? "rgba(245, 158, 11, 1)"
        : "rgba(34, 197, 94, 1)";
    highlights = [
      { from: minValue, to: 75, color: "rgba(34, 197, 94, 0.75)" },
      { from: 75, to: 90, color: "rgba(245, 158, 11, 0.75)" },
      { from: 90, to: maxValue, color: "rgba(239, 68, 68, 0.75)" },
    ];
  } else if (label.toLowerCase().includes("rpm")) {
    highlights = [
      { from: 0, to: 600, color: "rgba(148, 163, 184, 0.5)" },
      { from: 600, to: 800, color: "rgba(34, 197, 94, 0.65)" },
      { from: 800, to: maxValue, color: "rgba(245, 158, 11, 0.75)" },
    ];
  }

  const tickDelta = (maxValue - minValue) / 5;
  const majorTicks = Array.from({ length: 6 }, (_, i) =>
    parseFloat(
      (minValue + i * tickDelta).toFixed(
        label.toLowerCase().includes("temp") ? 1 : 0
      )
    )
  );

  return (
    <div
      className="flex flex-col items-center p-2 bg-secondary rounded-lg shadow-md"
      style={{ width: size + 20 }}
    >
      <RadialGauge
        width={size}
        height={size}
        units={unit}
        title={label}
        value={safeValue}
        minValue={minValue}
        maxValue={maxValue}
        majorTicks={majorTicks}
        minorTicks={2}
        highlights={highlights}
        valueBox={true}
        valueBoxStroke={2}
        valueBoxWidth={40}
        fontValueSize={30}
        valueInt={label.toLowerCase().includes("temp") ? 2 : 2}
        valueText={safeValue.toFixed(
          label.toLowerCase().includes("temp") ? 1 : 0
        )}
        colorPlate="#334155"
        colorMajorTicks="#E2E8F0"
        colorMinorTicks="#94A3B8"
        colorTitle="#F1F5F9"
        colorUnits="#CBD5E1"
        colorNumbers="#E2E8F0"
        colorNeedle="#F8FAFC"
        colorNeedleEnd="#EF4444"
        needleType="arrow"
        needleWidth={3}
        needleCircleSize={10}
        needleCircleOuter={true}
        needleCircleInner={false}
        needleCircleFill="#F1F5F9"
        animationRule="linear"
        animationDuration={1500}
        fontValue="Led"
        fontNumbers="Arial"
        animatedValue={true}
        fontTitle="Arial"
        fontUnits="Arial"
        borders={true}
        borderOuterWidth={2}
        borderMiddleWidth={2}
        borderInnerWidth={2}
        colorBorderOuter="#475569"
        colorBorderMiddle="#334155"
        colorBorderInner="#1E293B"
        strokeTicks={true}
      />
    </div>
  );
};
interface DigitalDisplayProps {
  label: string;
  value?: number;
  unit: string;
  blinking?: boolean;
}

const DigitalDisplay: React.FC<DigitalDisplayProps> = ({
  label,
  value,
  unit,
  blinking = false,
}) => {
  const [blink, setBlink] = useState(false);

  // Blinking effect
  useEffect(() => {
    if (blinking) {
      const interval = setInterval(() => {
        setBlink((prev) => !prev);
      }, 500);
      return () => clearInterval(interval);
    } else {
      setBlink(false);
    }
  }, [blinking]);

  return (
    <div className="relative p-4 bg-card/80 border border-muted rounded-lg shadow-lg min-w-[160px]">
      {/* Top label bar */}
      <div className="absolute top-0 left-0 right-0 bg-card text-center py-1 px-2 rounded-t-lg border-b border-muted">
        <span className="text-xs font-medium text-gray-300 uppercase tracking-wider">
          {label}
        </span>
      </div>

      {/* LED Display */}
      <div className="mt-6 mb-1 p-2 bg-black rounded-md border border-muted font-mono text-center">
        <div
          className={`text-green-400 text-3xl font-bold ${
            blink ? "opacity-30" : "opacity-100"
          }`}
        >
          {value !== undefined ? value.toFixed(1) : "----"}
          <span className="text-lg ml-1 text-gray-400">{unit}</span>
        </div>
      </div>
    </div>
  );
};

interface StatusLightProps {
  running: boolean;
}
const StatusLight: React.FC<StatusLightProps> = ({ running }) => {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-8 h-8 rounded-full border-2 border-border shadow-lg transition-all duration-300
                     ${
                       running
                         ? "bg-green-500 animate-pulse-green"
                         : "bg-red-600"
                     }`}
      />
      <span className="mt-1 text-xs text-muted-foreground font-medium">
        {running ? "RUNNING" : "STOPPED"}
      </span>
    </div>
  );
};

interface PistonProps {
  running: boolean;
  rpm: number;
  index: number;
}
const Piston: React.FC<PistonProps> = ({ running, rpm, index }) => {
  const animationDuration = rpm > 0 ? 60 / rpm : 0;
  const animationDelay = animationDuration
    ? (animationDuration / 4) * index
    : 0;

  return (
    <div className="w-10 h-20 bg-black/70 border-2 border-black rounded-t-md relative overflow-hidden">
      <div
        className="w-full h-8 bg-muted absolute bottom-0"
        style={{
          animation:
            running && rpm > 0
              ? `pistonMove ${animationDuration}s ease-in-out ${animationDelay}s infinite`
              : "none",
        }}
      />
    </div>
  );
};

interface GeneratorVisualProps {
  active: boolean;
  rpm: number;
  excitation;
}
const GeneratorVisual: React.FC<GeneratorVisualProps> = ({
  active,
  rpm,
  excitation,
}) => {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-24 h-32 rounded-lg border-2 shadow-md relative flex flex-col items-center justify-center transition-all duration-500 ${
          active ? "bg-emerald-600 border-emerald-700" : "bg-card border-border"
        }`}
      >
        <div
          className={`w-20 h-6 rounded-sm mb-2 ${
            active ? "bg-emerald-800" : "bg-muted"
          }`}
        ></div>

        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center shadow-inner ${
            active ? "bg-emerald-500" : "bg-secondary"
          }`}
        >
          {active && <AlternatorFan rpmSpeed={rpm} />}
          {!active && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-8 h-8 text-muted-foreground"
            >
              <path
                fillRule="evenodd"
                d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
        <div
          className={`w-20 h-4 text-center rounded-sm mt-2 ${
            active ? "bg-emerald-800" : "bg-muted"
          }`}
        >
          {active ? (
            <>
              {/** Excitation */}
              <p className="text-[10px] text-neutral-200 font-bold">
                {excitation}%
              </p>
            </>
          ) : null}
        </div>
      </div>
      <p
        className={`mt-2 text-xs font-semibold ${
          active ? "text-emerald-400 animate-pulse" : "text-muted-foreground"
        }`}
      >
        GENERATOR {active ? "(ACTIVE)" : "(IDLE)"}
      </p>
    </div>
  );
};

const EngineVisualization: React.FC<EngineVisualizationProps> = ({
  temperature,
  load,
  running,
  rpm,
  voltage,
  frequency,
  excitation,
}) => {
  const numPistons = 4;
  const isGeneratorActive = running && rpm > 300;

  return (
    <div className="flex flex-col items-center justify-center font-sans">
      <div className="w-full bg-card p-4 sm:p-6 rounded-xl shadow-2xl border border-border">
        <div className="mb-6 text-center">
          <h1 className="text-2xl mb-3 sm:text-3xl font-bold text-foreground">
            50MW DIESEL GENERATOR
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 sm:gap-6 mb-6">
          <div className="lg:col-span-3 bg-secondary p-4 rounded-lg shadow-md flex flex-col items-center justify-around">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              ENGINE & GENERATOR UNIT
            </h2>
            <div className="flex flex-col md:flex-row items-center md:items-end justify-around w-full gap-4 mb-4">
              <div className="flex flex-col items-center">
                <p className="text-sm text-muted-foreground mb-1 font-medium">
                  Engine Pistons
                </p>
                <div className="flex justify-around items-end w-auto h-32 bg-neutral-900 p-3 rounded-lg shadow-inner border-2 border-secondary space-x-2">
                  {Array.from({ length: numPistons }).map((_, i) => (
                    <Piston key={i} running={running} rpm={rpm} index={i} />
                  ))}
                </div>
              </div>
              <GeneratorVisual
                active={isGeneratorActive}
                rpm={rpm}
                excitation={excitation}
              />
            </div>

            <div className="flex items-center justify-center space-x-6 mt-auto pt-3 border-t border-border w-full">
              {running && (
                <div className="flex flex-col items-center space-y-1">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-yellow-400 rounded-full animate-ping opacity-75"></div>
                  <div className="text-xs text-muted-foreground self-center">
                    Exhaust
                  </div>
                </div>
              )}
              <StatusLight running={running} />
            </div>
          </div>

          <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 place-items-center">
            <Gauge
              label="RPM"
              value={rpm}
              unit="rpm"
              minValue={0}
              maxValue={2000}
              size={160}
            />
            <Gauge
              label="Temperature"
              value={temperature}
              unit="°C"
              minValue={0}
              maxValue={120}
              size={160}
            />
            <Gauge
              label="Load"
              value={load}
              unit="%"
              minValue={0}
              maxValue={100}
              size={160}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 items-center bg-secondary p-4 rounded-lg shadow-md">
          <DigitalDisplay
            label="Voltage Out"
            value={isGeneratorActive ? voltage : 0}
            unit="V"
          />
          <DigitalDisplay
            label="Frequency Out"
            value={isGeneratorActive ? frequency : 0}
            unit="Hz"
          />
        </div>
      </div>
    </div>
  );
};

export default EngineVisualization;
