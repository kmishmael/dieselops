import { useState, useEffect, useRef } from "react";
//import { Line } from "lucide-react";
//import * as d3 from "d3";

// Main simulator component
export default function DieselPowerPlantSimulator() {
  // System state
  const [engineRunning, setEngineRunning] = useState(false);
  const [fuelLevel, setFuelLevel] = useState(100);
  const [rpm, setRpm] = useState(0);
  const [targetRpm, setTargetRpm] = useState(0);
  const [load, setLoad] = useState(0);
  const [temperature, setTemperature] = useState(25);
  const [voltage, setVoltage] = useState(0);
  const [frequency, setFrequency] = useState(0);
  const [currentOutput, setCurrentOutput] = useState(0);
  const [powerOutput, setPowerOutput] = useState(0);
  const [time, setTime] = useState(0);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [faults, setFaults] = useState<{ id: number; message: string }[]>([]);
  const [selectedView, setSelectedView] = useState("main");

  // History of readings for graphs
  const [history, setHistory] = useState<{
      power: { time: number; value: number }[];
      rpm: { time: number; value: number }[];
      temp: { time: number; value: number }[];
      fuel: { time: number; value: number }[];
    }>({
      power: [],
      rpm: [],
      temp: [],
      fuel: [],
    });

  // Animation frame reference
  const animationRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef(Date.now());

  // Svg references for animations
  const pistonRef = useRef(null);
  const flywheelRef = useRef(null);
 // const gaugeRef = useRef(null);

  // Constants
  const MAX_RPM = 1800;
  const MAX_POWER = 2500; // kW
  const NOMINAL_FREQUENCY = 60; // Hz
  const FUEL_CONSUMPTION_RATE = 0.05; // % per second at max load
  const TEMPERATURE_RISE_RATE = 0.1; // degrees per second at max load
  const COOLING_RATE = 0.05; // degrees per second when idle

  // Physical simulation parameters
  const engineInertia = 100; // kg·m²
  const rpmAcceleration = 50; // RPM/s per % throttle
  const tempThermalMass = 200; // J/°C

  // Start/stop the engine
  const toggleEngine = () => {
    if (engineRunning) {
      setTargetRpm(0);
      // Don't immediately stop - it will decelerate based on physics
    } else {
      if (fuelLevel > 0) {
        setTargetRpm(800); // Idle RPM
      } else {
        setFaults([
          ...faults,
          { id: Date.now(), message: "Cannot start: No fuel" },
        ]);
      }
    }
    setEngineRunning(!engineRunning);
  };

  // Physics simulation loop
  useEffect(() => {
    if (!animationRef.current) {
      const updateSimulation = () => {
        const now = Date.now();
        const deltaTime =
          ((now - lastUpdateTimeRef.current) / 1000) * simulationSpeed;
        lastUpdateTimeRef.current = now;

        setTime((prevTime) => prevTime + deltaTime);

        // RPM dynamics - gradually approach target RPM based on engine inertia
        setRpm((prevRpm) => {
          // Calculate acceleration/deceleration rate based on difference
          const rpmDiff = targetRpm - prevRpm;
          const rpmChange =
            Math.min(Math.abs(rpmDiff), rpmAcceleration * deltaTime) *
            Math.sign(rpmDiff);

          // Apply load effects - load slows down the engine
          const loadEffect = load > 0 ? load * 2 * deltaTime : 0;

          // Calculate new RPM
          let newRpm = prevRpm + rpmChange - loadEffect;
          newRpm = Math.max(0, Math.min(MAX_RPM, newRpm));

          // If RPM falls too low but engine is supposed to be running, it stalls
          if (newRpm < 500 && engineRunning && prevRpm > 0) {
            setFaults((prev) => [
              ...prev,
              {
                id: Date.now(),
                message: "Engine stalled due to excessive load",
              },
            ]);
            setEngineRunning(false);
          }

          return newRpm;
        });

        // Fuel consumption based on RPM and load
        setFuelLevel((prevFuel) => {
          if (rpm > 0) {
            const consumption =
              (rpm / MAX_RPM) *
              (0.2 + 0.8 * (load / 100)) *
              FUEL_CONSUMPTION_RATE *
              deltaTime;
            const newFuel = prevFuel - consumption;

            // Engine stops if out of fuel
            if (newFuel <= 0 && engineRunning) {
              setEngineRunning(false);
              setTargetRpm(0);
              setFaults((prev) => [
                ...prev,
                { id: Date.now(), message: "Engine stopped: Fuel depleted" },
              ]);
              return 0;
            }
            return Math.max(0, newFuel);
          }
          return prevFuel;
        });

        // Temperature simulation - rises with load, falls when idle
        setTemperature((prevTemp) => {
          const loadHeat =
            (rpm / MAX_RPM) * (load / 100) * TEMPERATURE_RISE_RATE * deltaTime;
          const cooling = COOLING_RATE * deltaTime * (engineRunning ? 0.5 : 1);
          const newTemp = prevTemp + loadHeat - cooling;

          // Overheat condition
          if (newTemp > 95 && engineRunning) {
            setFaults((prev) => [
              ...prev,
              {
                id: Date.now(),
                message: "Warning: Engine temperature critical",
              },
            ]);
          }

          return Math.max(25, Math.min(110, newTemp));
        });

        // Calculate electrical outputs
        const rpmRatio = rpm / MAX_RPM;
        setFrequency(NOMINAL_FREQUENCY * rpmRatio);
        setVoltage(engineRunning ? 400 * rpmRatio : 0);
        setCurrentOutput(engineRunning ? (load / 100) * rpmRatio * 3600 : 0);
        setPowerOutput((voltage * currentOutput) / 1000); // kW

        // Update history for graphs (limit to 100 points)
        setHistory((prev) => {
          const newPoint = { time: time, value: powerOutput };
          const newRpmPoint = { time: time, value: rpm };
          const newTempPoint = { time: time, value: temperature };
          const newFuelPoint = { time: time, value: fuelLevel };

          return {
            power: [...prev.power.slice(-99), newPoint],
            rpm: [...prev.rpm.slice(-99), newRpmPoint],
            temp: [...prev.temp.slice(-99), newTempPoint],
            fuel: [...prev.fuel.slice(-99), newFuelPoint],
          };
        });

        animationRef.current = requestAnimationFrame(updateSimulation);
      };

      animationRef.current = requestAnimationFrame(updateSimulation);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [engineRunning, targetRpm, load, simulationSpeed]);

  // Styles for various components
  const gaugeStyle = (value: number, min: number, max: number, greenZone = 0.7) => {
    const percentage = (value - min) / (max - min);
    let color = "bg-green-500";
    if (percentage > greenZone) color = "bg-yellow-500";
    if (percentage > 0.9) color = "bg-red-500";
    return {
      width: `${Math.max(0, Math.min(100, percentage * 100))}%`,
      className: color,
    };
  };

  const buttonStyle = engineRunning
    ? "bg-red-500 hover:bg-red-700"
    : "bg-green-500 hover:bg-green-700";

  // Different views
  const renderMainView = () => (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-gray-800 p-4 rounded-lg col-span-2">
        <h2 className="text-lg font-bold mb-2">Engine Animation</h2>
        <div className="relative h-64 bg-gray-900 rounded-lg overflow-hidden">
          {/* Engine Animation */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg width="300" height="200" viewBox="0 0 300 200">
              {/* Engine block */}
              <rect x="50" y="80" width="200" height="80" fill="#555" />

              {/* Piston cylinder */}
              <rect x="80" y="60" width="50" height="100" fill="#777" />

              {/* Piston (animated) */}
              <rect
                ref={pistonRef}
                x="85"
                y={100 + Math.sin(time * (rpm / 60)) * 20}
                width="40"
                height="40"
                fill="#999"
              />

              {/* Flywheel (animated) */}
              <g
                ref={flywheelRef}
                transform={`rotate(${(time * rpm) % 360}, 200, 120)`}
              >
                <circle cx="200" cy="120" r="30" fill="#888" />
                <line
                  x1="200"
                  y1="120"
                  x2="230"
                  y2="120"
                  stroke="#333"
                  strokeWidth="4"
                />
                <line
                  x1="200"
                  y1="120"
                  x2="200"
                  y2="90"
                  stroke="#333"
                  strokeWidth="4"
                />
              </g>

              {/* Generator */}
              <rect x="240" y="90" width="40" height="60" fill="#226" />

              {/* Fuel tank */}
              <rect x="20" y="120" width="30" height="40" fill="#335" />
              <rect
                x="20"
                y={120 + 40 * (1 - fuelLevel / 100)}
                width="30"
                height={40 * (fuelLevel / 100)}
                fill="#550"
              />

              {/* Exhaust */}
              {engineRunning && rpm > 0 && (
                <>
                  <circle
                    cx="250"
                    cy="70"
                    r={Math.random() * 3 + 2}
                    opacity="0.3"
                    fill="#999"
                  />
                  <circle
                    cx="260"
                    cy="65"
                    r={Math.random() * 2 + 1}
                    opacity="0.2"
                    fill="#999"
                  />
                  <circle
                    cx="270"
                    cy="60"
                    r={Math.random() * 1 + 1}
                    opacity="0.1"
                    fill="#999"
                  />
                </>
              )}
            </svg>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg">
        <h2 className="text-lg font-bold mb-4">Controls</h2>
        <div className="space-y-4">
          <div>
            <button
              className={`px-4 py-2 text-white font-bold rounded-lg w-full ${buttonStyle}`}
              onClick={toggleEngine}
            >
              {engineRunning ? "STOP ENGINE" : "START ENGINE"}
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Engine Speed (RPM)
            </label>
            <input
              type="range"
              min="800"
              max={MAX_RPM}
              value={targetRpm}
              disabled={!engineRunning}
              onChange={(e) => setTargetRpm(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs">
              <span>800</span>
              <span>{MAX_RPM}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Load (%)</label>
            <input
              type="range"
              min="0"
              max="100"
              value={load}
              onChange={(e) => setLoad(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Simulation Speed
            </label>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={simulationSpeed}
              onChange={(e) => setSimulationSpeed(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs">
              <span>0.1x</span>
              <span>5x</span>
            </div>
          </div>

          <div>
            <button
              className="px-4 py-2 bg-blue-500 hover:bg-blue-700 text-white font-bold rounded-lg w-full"
              onClick={() => setFuelLevel(100)}
            >
              REFUEL
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg">
        <h2 className="text-lg font-bold mb-4">Status</h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-1 text-sm">
              <span>Engine Status:</span>
              <span
                className={engineRunning ? "text-green-500" : "text-red-500"}
              >
                {engineRunning ? "RUNNING" : "STOPPED"}
              </span>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1 text-sm">
              <span>Current RPM:</span>
              <span>{Math.round(rpm)}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className={`${gaugeStyle(rpm, 0, MAX_RPM).className} h-2 rounded-full bg-green-500`}
                style={{ width: gaugeStyle(rpm, 0, MAX_RPM).width }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1 text-sm">
              <span>Temperature:</span>
              <span
                className={temperature > 90 ? "text-red-500" : "text-white"}
              >
                {Math.round(temperature)}°C
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                style={{ width: gaugeStyle(temperature, 25, 110, 0.6).width }}
                className={
                  gaugeStyle(temperature, 25, 110, 0.6).className +
                  " h-2 rounded-full"
                }
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1 text-sm">
              <span>Fuel Level:</span>
              <span>{Math.round(fuelLevel)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                style={{ width: `${fuelLevel}%` }}
                className="h-2 rounded-full bg-blue-500"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1 text-sm">
              <span>Voltage:</span>
              <span>{Math.round(voltage)} V</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1 text-sm">
              <span>Frequency:</span>
              <span
                className={
                  Math.abs(frequency - NOMINAL_FREQUENCY) > 5
                    ? "text-yellow-500"
                    : "text-white"
                }
              >
                {frequency.toFixed(1)} Hz
              </span>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1 text-sm">
              <span>Power Output:</span>
              <span>{Math.round(powerOutput)} kW</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                style={{ width: gaugeStyle(powerOutput, 0, MAX_POWER).width }}
                className={
                  gaugeStyle(powerOutput, 0, MAX_POWER).className +
                  " h-2 rounded-full"
                }
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg col-span-2">
        <h2 className="text-lg font-bold mb-2">Power Output History</h2>
        <div className="h-48 bg-gray-900 rounded-lg p-2">
          {history.power.length > 0 && (
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <path
                d={`M ${history.power
                  .map(
                    (point, i) =>
                      `${(i / (history.power.length - 1)) * 100},${
                        100 - (point.value / MAX_POWER) * 100
                      }`
                  )
                  .join(" L ")}`}
                stroke="#10B981"
                strokeWidth="1"
                fill="none"
              />
            </svg>
          )}
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg col-span-2">
        <h2 className="text-lg font-bold mb-2">Alerts & Notifications</h2>
        <div className="max-h-32 overflow-y-auto">
          {faults.length === 0 ? (
            <p className="text-sm text-gray-400">No alerts</p>
          ) : (
            <ul className="space-y-2">
              {faults.slice(-5).map((fault) => (
                <li key={fault.id} className="text-sm text-red-400">
                  {fault.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );

  const renderDetailedView = () => (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-gray-800 p-4 rounded-lg col-span-2">
        <h2 className="text-lg font-bold mb-2">Real-time Parameters</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-700 p-3 rounded-lg">
            <div className="text-xs text-gray-400">RPM</div>
            <div className="text-xl font-bold">{Math.round(rpm)}</div>
          </div>
          <div className="bg-gray-700 p-3 rounded-lg">
            <div className="text-xs text-gray-400">Power</div>
            <div className="text-xl font-bold">
              {Math.round(powerOutput)} kW
            </div>
          </div>
          <div className="bg-gray-700 p-3 rounded-lg">
            <div className="text-xs text-gray-400">Frequency</div>
            <div className="text-xl font-bold">{frequency.toFixed(1)} Hz</div>
          </div>
          <div className="bg-gray-700 p-3 rounded-lg">
            <div className="text-xs text-gray-400">Voltage</div>
            <div className="text-xl font-bold">{Math.round(voltage)} V</div>
          </div>
          <div className="bg-gray-700 p-3 rounded-lg">
            <div className="text-xs text-gray-400">Current</div>
            <div className="text-xl font-bold">
              {Math.round(currentOutput)} A
            </div>
          </div>
          <div className="bg-gray-700 p-3 rounded-lg">
            <div className="text-xs text-gray-400">Temperature</div>
            <div className="text-xl font-bold">{Math.round(temperature)}°C</div>
          </div>
          <div className="bg-gray-700 p-3 rounded-lg">
            <div className="text-xs text-gray-400">Fuel</div>
            <div className="text-xl font-bold">{Math.round(fuelLevel)}%</div>
          </div>
          <div className="bg-gray-700 p-3 rounded-lg">
            <div className="text-xs text-gray-400">Efficiency</div>
            <div className="text-xl font-bold">
              {rpm > 0
                ? Math.round(
                    (powerOutput / (fuelLevel > 0 ? rpm / 100 : 1)) * 10
                  )
                : 0}
              %
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h2 className="text-lg font-bold mb-2">RPM vs Temperature</h2>
        <div className="h-64 bg-gray-900 rounded-lg p-2">
          {history.rpm.length > 0 && (
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {/* RPM line */}
              <path
                d={`M ${history.rpm
                  .map(
                    (point, i) =>
                      `${(i / (history.rpm.length - 1)) * 100},${
                        100 - (point.value / MAX_RPM) * 100
                      }`
                  )
                  .join(" L ")}`}
                stroke="#10B981"
                strokeWidth="1"
                fill="none"
              />

              {/* Temperature line */}
              <path
                d={`M ${history.temp
                  .map(
                    (point, i) =>
                      `${(i / (history.temp.length - 1)) * 100},${
                        100 - ((point.value - 25) / 85) * 100
                      }`
                  )
                  .join(" L ")}`}
                stroke="#EF4444"
                strokeWidth="1"
                fill="none"
              />
            </svg>
          )}
          <div className="flex justify-between text-xs mt-2">
            <span className="text-green-500">RPM</span>
            <span className="text-red-500">Temperature</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg">
        <h2 className="text-lg font-bold mb-2">Power Output vs Fuel</h2>
        <div className="h-64 bg-gray-900 rounded-lg p-2">
          {history.power.length > 0 && (
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {/* Power line */}
              <path
                d={`M ${history.power
                  .map(
                    (point, i) =>
                      `${(i / (history.power.length - 1)) * 100},${
                        100 - (point.value / MAX_POWER) * 100
                      }`
                  )
                  .join(" L ")}`}
                stroke="#10B981"
                strokeWidth="1"
                fill="none"
              />

              {/* Fuel level line */}
              <path
                d={`M ${history.fuel
                  .map(
                    (point, i) =>
                      `${(i / (history.fuel.length - 1)) * 100},${
                        100 - point.value
                      }`
                  )
                  .join(" L ")}`}
                stroke="#3B82F6"
                strokeWidth="1"
                fill="none"
              />
            </svg>
          )}
          <div className="flex justify-between text-xs mt-2">
            <span className="text-green-500">Power Output</span>
            <span className="text-blue-500">Fuel Level</span>
          </div>
        </div>
      </div>

      {/* Technical Diagram */}
      <div className="bg-gray-800 p-4 rounded-lg col-span-2">
        <h2 className="text-lg font-bold mb-2">System Diagram</h2>
        <div className="h-64 bg-gray-900 rounded-lg p-4 overflow-auto">
          <svg width="600" height="200" viewBox="0 0 600 200">
            {/* Fuel System */}
            <rect
              x="50"
              y="120"
              width="50"
              height="60"
              fill="#335"
              stroke="#fff"
              strokeWidth="1"
            />
            <text x="75" y="160" textAnchor="middle" fill="white" fontSize="10">
              Fuel Tank
            </text>

            {/* Fuel Line */}
            <line
              x1="100"
              y1="140"
              x2="140"
              y2="140"
              stroke="#yellow"
              strokeWidth="2"
            />
            <circle cx="140" cy="140" r="5" fill="#996" />
            <text x="140" y="130" textAnchor="middle" fill="white" fontSize="8">
              Injector
            </text>

            {/* Engine Block */}
            <rect
              x="150"
              y="100"
              width="100"
              height="80"
              fill="#555"
              stroke="#fff"
              strokeWidth="1"
            />
            <text
              x="200"
              y="145"
              textAnchor="middle"
              fill="white"
              fontSize="10"
            >
              Diesel Engine
            </text>

            {/* Cooling System */}
            <rect
              x="150"
              y="70"
              width="100"
              height="20"
              fill="#66a"
              stroke="#fff"
              strokeWidth="1"
            />
            <text x="200" y="85" textAnchor="middle" fill="white" fontSize="8">
              Cooling System
            </text>

            {/* Shaft */}
            <line
              x1="250"
              y1="140"
              x2="300"
              y2="140"
              stroke="#aaa"
              strokeWidth="4"
            />

            {/* Generator */}
            <rect
              x="300"
              y="100"
              width="80"
              height="80"
              fill="#449"
              stroke="#fff"
              strokeWidth="1"
            />
            <text
              x="340"
              y="145"
              textAnchor="middle"
              fill="white"
              fontSize="10"
            >
              Generator
            </text>

            {/* Electrical Output */}
            <line
              x1="380"
              y1="120"
              x2="420"
              y2="120"
              stroke="#f55"
              strokeWidth="2"
            />
            <line
              x1="380"
              y1="140"
              x2="420"
              y2="140"
              stroke="#55f"
              strokeWidth="2"
            />
            <line
              x1="380"
              y1="160"
              x2="420"
              y2="160"
              stroke="#5f5"
              strokeWidth="2"
            />

            {/* Transformer */}
            <rect
              x="420"
              y="100"
              width="60"
              height="80"
              fill="#654"
              stroke="#fff"
              strokeWidth="1"
            />
            <text
              x="450"
              y="145"
              textAnchor="middle"
              fill="white"
              fontSize="10"
            >
              Transformer
            </text>

            {/* Distribution */}
            <line
              x1="480"
              y1="140"
              x2="520"
              y2="140"
              stroke="#fff"
              strokeWidth="2"
            />
            <rect
              x="520"
              y="100"
              width="60"
              height="80"
              fill="#546"
              stroke="#fff"
              strokeWidth="1"
            />
            <text
              x="550"
              y="145"
              textAnchor="middle"
              fill="white"
              fontSize="10"
            >
              Distribution
            </text>

            {/* Status Indicators */}
            <circle
              cx="200"
              y="190"
              r="5"
              fill={engineRunning ? "#4f4" : "#f44"}
            />
            <text x="210" y="193" fill="white" fontSize="8">
              Engine
            </text>

            <circle
              cx="340"
              y="190"
              r="5"
              fill={powerOutput > 0 ? "#4f4" : "#f44"}
            />
            <text x="350" y="193" fill="white" fontSize="8">
              Generator
            </text>

            <circle
              cx="450"
              y="190"
              r="5"
              fill={powerOutput > 0 ? "#4f4" : "#f44"}
            />
            <text x="460" y="193" fill="white" fontSize="8">
              Transformer
            </text>

            <circle
              cx="550"
              y="190"
              r="5"
              fill={powerOutput > 0 ? "#4f4" : "#f44"}
            />
            <text x="560" y="193" fill="white" fontSize="8">
              Output
            </text>
          </svg>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-gray-800 p-4 rounded-lg col-span-2">
        <h2 className="text-lg font-bold mb-2">Performance Analysis</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-700 p-3 rounded-lg">
            <div className="text-xs text-gray-400">Fuel Efficiency</div>
            <div className="text-xl font-bold">
              {powerOutput > 0 && fuelLevel < 100
                ? (powerOutput / ((100 - fuelLevel) * 0.05)).toFixed(2)
                : "0.00"}{" "}
              kW/L
            </div>
          </div>
          <div className="bg-gray-700 p-3 rounded-lg">
            <div className="text-xs text-gray-400">Load Factor</div>
            <div className="text-xl font-bold">
              {((powerOutput / MAX_POWER) * 100).toFixed(1)}%
            </div>
          </div>
          <div className="bg-gray-700 p-3 rounded-lg">
            <div className="text-xs text-gray-400">Heat Rate</div>
            <div className="text-xl font-bold">
              {powerOutput > 0
                ? (((rpm / 60) * 0.1) / powerOutput).toFixed(2)
                : "0.00"}{" "}
              kJ/kWh
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderElectricalView = () => (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-gray-800 p-4 rounded-lg col-span-2">
        <h2 className="text-lg font-bold mb-2">Electrical System</h2>
        <div className="h-64 bg-gray-900 rounded-lg p-4 overflow-auto">
          <svg width="600" height="200" viewBox="0 0 600 200">
            {/* Generator */}
            <rect
              x="50"
              y="80"
              width="80"
              height="80"
              fill="#449"
              stroke="#fff"
              strokeWidth="1"
            />
            <text x="90" y="125" textAnchor="middle" fill="white" fontSize="10">
              Generator
            </text>
            <text x="90" y="140" textAnchor="middle" fill="white" fontSize="8">
              {Math.round(voltage)}V @ {frequency.toFixed(1)}Hz
            </text>

            {/* Generator Output */}
            <line
              x1="130"
              y1="100"
              x2="180"
              y2="100"
              stroke="#f55"
              strokeWidth="2"
            />
            <line
              x1="130"
              y1="120"
              x2="180"
              y2="120"
              stroke="#55f"
              strokeWidth="2"
            />
            <line
              x1="130"
              y1="140"
              x2="180"
              y2="140"
              stroke="#5f5"
              strokeWidth="2"
            />

            {/* Circuit Breaker */}
            <rect
              x="180"
              y="90"
              width="20"
              height="60"
              fill="#666"
              stroke="#fff"
              strokeWidth="1"
            />
            <line
              x1="190"
              y1="100"
              x2="190"
              y2="140"
              stroke={engineRunning ? "#5f5" : "#f55"}
              strokeWidth="2"
            />
            <text x="190" y="160" textAnchor="middle" fill="white" fontSize="8">
              CB
            </text>

            {/* Transformer */}
            <circle
              cx="240"
              cy="100"
              r="10"
              fill="none"
              stroke="#fff"
              strokeWidth="1"
            />
            <circle
              cx="240"
              cy="140"
              r="10"
              fill="none"
              stroke="#fff"
              strokeWidth="1"
            />
            <line
              x1="240"
              y1="110"
              x2="240"
              y2="130"
              stroke="#fff"
              strokeWidth="1"
            />
            <line
              x1="200"
              y1="100"
              x2="230"
              y2="100"
              stroke="#f55"
              strokeWidth="2"
            />
            <line
              x1="200"
              y1="120"
              x2="230"
              y2="120"
              stroke="#55f"
              strokeWidth="2"
            />
            <line
              x1="200"
              y1="140"
              x2="230"
              y2="140"
              stroke="#5f5"
              strokeWidth="2"
            />
            <text x="240" y="160" textAnchor="middle" fill="white" fontSize="8">
              Transformer
            </text>
            <text x="240" y="170" textAnchor="middle" fill="white" fontSize="6">
              {Math.round(voltage)}V → 440V
            </text>

            {/* Load Distribution */}
            <rect
              x="280"
              y="80"
              width="60"
              height="80"
              fill="#546"
              stroke="#fff"
              strokeWidth="1"
            />
            <text
              x="310"
              y="125"
              textAnchor="middle"
              fill="white"
              fontSize="10"
            >
              Load
            </text>
            <text x="310" y="140" textAnchor="middle" fill="white" fontSize="8">
              {Math.round(load)}%
            </text>
            <line
              x1="250"
              y1="100"
              x2="280"
              y2="100"
              stroke="#f55"
              strokeWidth="2"
            />
            <line
              x1="250"
              y1="120"
              x2="280"
              y2="120"
              stroke="#55f"
              strokeWidth="2"
            />
            <line
              x1="250"
              y1="140"
              x2="280"
              y2="140"
              stroke="#5f5"
              strokeWidth="2"
            />

            {/* Power Meters */}
            <rect
              x="380"
              y="80"
              width="100"
              height="80"
              fill="#354"
              stroke="#fff"
              strokeWidth="1"
            />
            <text
              x="430"
              y="100"
              textAnchor="middle"
              fill="white"
              fontSize="10"
            >
              Power Meters
            </text>
            <text x="410" y="120" textAnchor="middle" fill="white" fontSize="8">
              V: {Math.round(voltage)}V
            </text>
            <text x="410" y="135" textAnchor="middle" fill="white" fontSize="8">
              I: {Math.round(currentOutput)}A
            </text>
            <text x="410" y="150" textAnchor="middle" fill="white" fontSize="8">
              f: {frequency.toFixed(1)}Hz
            </text>
            <text x="450" y="120" textAnchor="middle" fill="white" fontSize="8">
              P: {Math.round(powerOutput)}kW
            </text>
            <text x="450" y="135" textAnchor="middle" fill="white" fontSize="8">
              Q: {Math.round(powerOutput * 0.2)}kVAR
            </text>
            <text x="450" y="150" textAnchor="middle" fill="white" fontSize="8">
              PF: 0.{Math.round(8 + Math.random() * 2)}
            </text>
            <line
              x1="340"
              y1="100"
              x2="380"
              y2="100"
              stroke="#f55"
              strokeWidth="2"
            />
            <line
              x1="340"
              y1="120"
              x2="380"
              y2="120"
              stroke="#55f"
              strokeWidth="2"
            />
            <line
              x1="340"
              y1="140"
              x2="380"
              y2="140"
              stroke="#5f5"
              strokeWidth="2"
            />

            {/* Distribution Bus */}
            <rect
              x="520"
              y="80"
              width="20"
              height="80"
              fill="#456"
              stroke="#fff"
              strokeWidth="1"
            />
            <text x="530" y="75" textAnchor="middle" fill="white" fontSize="8">
              Bus
            </text>
            <line
              x1="480"
              y1="100"
              x2="520"
              y2="100"
              stroke="#f55"
              strokeWidth="2"
            />
            <line
              x1="480"
              y1="120"
              x2="520"
              y2="120"
              stroke="#55f"
              strokeWidth="2"
            />
            <line
              x1="480"
              y1="140"
              x2="520"
              y2="140"
              stroke="#5f5"
              strokeWidth="2"
            />

            {/* Load 1 */}
            <rect
              x="560"
              y="50"
              width="30"
              height="30"
              fill="#555"
              stroke="#fff"
              strokeWidth="1"
            />
            <text x="575" y="70" textAnchor="middle" fill="white" fontSize="8">
              Load 1
            </text>
            <line
              x1="540"
              y1="65"
              x2="560"
              y2="65"
              stroke="#fff"
              strokeWidth="1"
            />
            <line
              x1="530"
              y1="80"
              x2="530"
              y2="65"
              stroke="#fff"
              strokeWidth="1"
            />

            {/* Load 2 */}
            <rect
              x="560"
              y="100"
              width="30"
              height="30"
              fill="#555"
              stroke="#fff"
              strokeWidth="1"
            />
            <text x="575" y="120" textAnchor="middle" fill="white" fontSize="8">
              Load 2
            </text>
            <line
              x1="540"
              y1="115"
              x2="560"
              y2="115"
              stroke="#fff"
              strokeWidth="1"
            />

            {/* Load 3 */}
            <rect
              x="560"
              y="150"
              width="30"
              height="30"
              fill="#555"
              stroke="#fff"
              strokeWidth="1"
            />
            <text x="575" y="170" textAnchor="middle" fill="white" fontSize="8">
              Load 3
            </text>
            <line
              x1="540"
              y1="165"
              x2="560"
              y2="165"
              stroke="#fff"
              strokeWidth="1"
            />
            <line
              x1="530"
              y1="140"
              x2="530"
              y2="165"
              stroke="#fff"
              strokeWidth="1"
            />

            {/* Animated current flow */}
            {powerOutput > 0 && (
              <>
                <circle
                  cx={130 + ((time * 50) % 50)}
                  cy="100"
                  r="2"
                  fill="#f55"
                />
                <circle
                  cx={130 + (((time + 0.3) * 50) % 50)}
                  cy="120"
                  r="2"
                  fill="#55f"
                />
                <circle
                  cx={130 + (((time + 0.6) * 50) % 50)}
                  cy="140"
                  r="2"
                  fill="#5f5"
                />

                <circle
                  cx={200 + ((time * 50) % 50)}
                  cy="100"
                  r="2"
                  fill="#f55"
                />
                <circle
                  cx={200 + (((time + 0.3) * 50) % 50)}
                  cy="120"
                  r="2"
                  fill="#55f"
                />
                <circle
                  cx={200 + (((time + 0.6) * 50) % 50)}
                  cy="140"
                  r="2"
                  fill="#5f5"
                />

                <circle
                  cx={250 + ((time * 50) % 50)}
                  cy="100"
                  r="2"
                  fill="#f55"
                />
                <circle
                  cx={250 + (((time + 0.3) * 50) % 50)}
                  cy="120"
                  r="2"
                  fill="#55f"
                />
                <circle
                  cx={250 + (((time + 0.6) * 50) % 50)}
                  cy="140"
                  r="2"
                  fill="#5f5"
                />

                <circle
                  cx={340 + ((time * 50) % 50)}
                  cy="100"
                  r="2"
                  fill="#f55"
                />
                <circle
                  cx={340 + (((time + 0.3) * 50) % 50)}
                  cy="120"
                  r="2"
                  fill="#55f"
                />
                <circle
                  cx={340 + (((time + 0.6) * 50) % 50)}
                  cy="140"
                  r="2"
                  fill="#5f5"
                />

                <circle
                  cx={480 + ((time * 50) % 50)}
                  cy="100"
                  r="2"
                  fill="#f55"
                />
                <circle
                  cx={480 + (((time + 0.3) * 50) % 50)}
                  cy="120"
                  r="2"
                  fill="#55f"
                />
                <circle
                  cx={480 + (((time + 0.6) * 50) % 50)}
                  cy="140"
                  r="2"
                  fill="#5f5"
                />
              </>
            )}
          </svg>
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg">
        <h2 className="text-lg font-bold mb-2">Power Quality</h2>
        <div className="h-48 bg-gray-900 rounded-lg p-4">
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {/* Sine wave for voltage (with noise when load changes) */}
            <path
              d={`M ${Array.from({ length: 50 }, (_, i) => {
                const x = i * 2;
                const loadNoise =
                  load > 70 ? ((Math.random() * 2 - 1) * (load - 70)) / 30 : 0;
                const freqNoise =
                  Math.abs(frequency - NOMINAL_FREQUENCY) > 5
                    ? ((Math.random() * 2 - 1) *
                        Math.min(10, Math.abs(frequency - NOMINAL_FREQUENCY))) /
                      10
                    : 0;
                const y =
                  50 -
                  40 * Math.sin((i / 8) * Math.PI + time * 10) +
                  loadNoise +
                  freqNoise;
                return `${x},${y}`;
              }).join(" L ")}`}
              stroke="#10B981"
              strokeWidth="1"
              fill="none"
            />
          </svg>
          <div className="text-xs text-center mt-2">Voltage Waveform</div>
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg">
        <h2 className="text-lg font-bold mb-2">Fault Analysis</h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm">Under/Over Voltage:</span>
            <span
              className={
                Math.abs(voltage - (engineRunning ? 400 : 0)) > 40
                  ? "text-red-500"
                  : "text-green-500"
              }
            >
              {Math.abs(voltage - (engineRunning ? 400 : 0)) > 40
                ? "FAULT"
                : "NORMAL"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Under/Over Frequency:</span>
            <span
              className={
                Math.abs(frequency - NOMINAL_FREQUENCY) > 5
                  ? "text-red-500"
                  : "text-green-500"
              }
            >
              {Math.abs(frequency - NOMINAL_FREQUENCY) > 5 ? "FAULT" : "NORMAL"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Overload:</span>
            <span className={load > 90 ? "text-red-500" : "text-green-500"}>
              {load > 90 ? "WARNING" : "NORMAL"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Temperature:</span>
            <span
              className={temperature > 90 ? "text-red-500" : "text-green-500"}
            >
              {temperature > 90 ? "HIGH" : "NORMAL"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Fuel Level:</span>
            <span
              className={fuelLevel < 15 ? "text-red-500" : "text-green-500"}
            >
              {fuelLevel < 15 ? "LOW" : "NORMAL"}
            </span>
          </div>
          <button
            className="px-4 py-2 bg-red-500 hover:bg-red-700 text-white font-bold rounded-lg w-full mt-4"
            onClick={() => {
              setFaults([
                ...faults,
                { id: Date.now(), message: "Manual fault test triggered" },
              ]);
            }}
          >
            SIMULATE FAULT
          </button>
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg col-span-2">
        <h2 className="text-lg font-bold mb-2">Load Distribution</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-700 p-3 rounded-lg">
            <div className="flex justify-between">
              <span className="text-sm">Lighting:</span>
              <span className="text-sm">
                {Math.round(powerOutput * 0.15)} kW
              </span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2 mt-2">
              <div
                style={{ width: `15%` }}
                className="h-2 rounded-full bg-yellow-500"
              />
            </div>
          </div>
          <div className="bg-gray-700 p-3 rounded-lg">
            <div className="flex justify-between">
              <span className="text-sm">HVAC:</span>
              <span className="text-sm">
                {Math.round(powerOutput * 0.4)} kW
              </span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2 mt-2">
              <div
                style={{ width: `40%` }}
                className="h-2 rounded-full bg-blue-500"
              />
            </div>
          </div>
          <div className="bg-gray-700 p-3 rounded-lg">
            <div className="flex justify-between">
              <span className="text-sm">Machinery:</span>
              <span className="text-sm">
                {Math.round(powerOutput * 0.45)} kW
              </span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2 mt-2">
              <div
                style={{ width: `45%` }}
                className="h-2 rounded-full bg-red-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPhysicsView = () => (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-gray-800 p-4 rounded-lg col-span-2">
        <h2 className="text-lg font-bold mb-2">Thermodynamics</h2>
        <div className="h-64 bg-gray-900 rounded-lg p-4">
          <svg width="100%" height="100%" viewBox="0 0 300 150">
            {/* Thermodynamic cycle visualization */}
            <rect
              x="40"
              y="30"
              width="220"
              height="100"
              fill="none"
              stroke="#666"
              strokeWidth="1"
            />

            {/* Axes */}
            <line
              x1="40"
              y1="130"
              x2="260"
              y2="130"
              stroke="#fff"
              strokeWidth="1"
            />
            <line
              x1="40"
              y1="30"
              x2="40"
              y2="130"
              stroke="#fff"
              strokeWidth="1"
            />
            <text
              x="150"
              y="145"
              textAnchor="middle"
              fill="white"
              fontSize="10"
            >
              Volume
            </text>
            <text
              x="25"
              y="80"
              textAnchor="middle"
              fill="white"
              fontSize="10"
              transform="rotate(-90,25,80)"
            >
              Pressure
            </text>

            {/* PV diagram - diesel cycle */}
            <path
              d={`
                M ${40 + 20} ${130 - 10} 
                L ${40 + 20} ${130 - 80 - (rpm / MAX_RPM) * 20} 
                L ${40 + 60} ${130 - 80 - (rpm / MAX_RPM) * 20} 
                L ${40 + 150} ${130 - 30 - (rpm / MAX_RPM) * 10} 
                L ${40 + 150} ${130 - 10} 
                Z
              `}
              stroke="#f55"
              strokeWidth="2"
              fill="rgba(255,80,80,0.2)"
            />

            {/* Indicators for current state */}
            <circle
              cx={40 + 20 + (rpm / MAX_RPM) * 130}
              cy={130 - 10 - (rpm / MAX_RPM) * 70 - (load / 100) * 10}
              r="4"
              fill="#ff0"
            />

            {/* Temperature color gradient visualization */}
            <defs>
              <linearGradient
                id="tempGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop
                  offset="0%"
                  style={{ stopColor: "#00f", stopOpacity: 1 }}
                />
                <stop
                  offset="50%"
                  style={{ stopColor: "#0f0", stopOpacity: 1 }}
                />
                <stop
                  offset="100%"
                  style={{ stopColor: "#f00", stopOpacity: 1 }}
                />
              </linearGradient>
            </defs>
            <rect
              x="40"
              y="10"
              width="220"
              height="10"
              fill="url(#tempGradient)"
            />
            <circle
              cx={40 + (220 * (temperature - 25)) / 85}
              cy="15"
              r="5"
              stroke="#fff"
              strokeWidth="2"
              fill="none"
            />
            <text x="40" y="25" fill="white" fontSize="8">
              25°C
            </text>
            <text x="260" y="25" textAnchor="end" fill="white" fontSize="8">
              110°C
            </text>
          </svg>
          <div className="text-xs text-center mt-2">
            Pressure-Volume Diagram
          </div>
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg">
        <h2 className="text-lg font-bold mb-2">Engine Dynamics</h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-1 text-sm">
              <span>Engine Inertia:</span>
              <span>{engineInertia} kg·m²</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1 text-sm">
              <span>Acceleration Rate:</span>
              <span>{rpmAcceleration} RPM/s</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1 text-sm">
              <span>Angular Velocity:</span>
              <span>{((rpm * 2 * Math.PI) / 60).toFixed(2)} rad/s</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1 text-sm">
              <span>Kinetic Energy:</span>
              <span>
                {(
                  0.5 *
                  engineInertia *
                  Math.pow((rpm * 2 * Math.PI) / 60, 2)
                ).toFixed(0)}{" "}
                J
              </span>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1 text-sm">
              <span>Torque:</span>
              <span>
                {((powerOutput * 9550) / (rpm > 0 ? rpm : 1)).toFixed(0)} N·m
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg">
        <h2 className="text-lg font-bold mb-2">Thermal Analysis</h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-1 text-sm">
              <span>Thermal Mass:</span>
              <span>{tempThermalMass} J/°C</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1 text-sm">
              <span>Heat Generation:</span>
              <span>
                {(
                  (rpm / MAX_RPM) *
                  (load / 100) *
                  TEMPERATURE_RISE_RATE *
                  tempThermalMass
                ).toFixed(1)}{" "}
                W
              </span>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1 text-sm">
              <span>Heat Dissipation:</span>
              <span>{(COOLING_RATE * tempThermalMass).toFixed(1)} W</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1 text-sm">
              <span>Cooling Efficiency:</span>
              <span>
                {(
                  (100 * COOLING_RATE) /
                  ((rpm / MAX_RPM) * (load / 100) * TEMPERATURE_RISE_RATE +
                    0.01)
                ).toFixed(1)}
                %
              </span>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1 text-sm">
              <span>Thermal Gradient:</span>
              <span>{(temperature - 25).toFixed(1)}°C</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg col-span-2">
        <h2 className="text-lg font-bold mb-2">Engine Animation (Physics)</h2>
        <div className="h-64 bg-gray-900 rounded-lg p-4">
          <svg width="100%" height="100%" viewBox="0 0 300 150">
            {/* Engine Cylinder */}
            <rect
              x="100"
              y="40"
              width="100"
              height="80"
              fill="#555"
              stroke="#444"
              strokeWidth="2"
            />

            {/* Piston motion - realistic kinematics */}
            <g>
              {/* Crankshaft */}
              <circle
                cx="150"
                cy="160"
                r="30"
                fill="#777"
                stroke="#666"
                strokeWidth="2"
              />

              {/* Crankpin */}
              <circle
                cx={150 + 25 * Math.cos(time * (rpm / 60) * 2 * Math.PI)}
                cy={160 + 25 * Math.sin(time * (rpm / 60) * 2 * Math.PI)}
                r="5"
                fill="#aaa"
              />

              {/* Connecting rod */}
              <line
                x1={150 + 25 * Math.cos(time * (rpm / 60) * 2 * Math.PI)}
                y1={160 + 25 * Math.sin(time * (rpm / 60) * 2 * Math.PI)}
                x2={150}
                y2={
                  90 +
                  40 * Math.sin(time * (rpm / 60) * 2 * Math.PI + Math.PI / 2)
                }
                stroke="#888"
                strokeWidth="6"
              />

              {/* Piston */}
              <rect
                x="130"
                y={
                  70 +
                  40 * Math.sin(time * (rpm / 60) * 2 * Math.PI + Math.PI / 2)
                }
                width="40"
                height="20"
                fill="#999"
                stroke="#888"
                strokeWidth="2"
              />

              {/* Combustion visualization */}
              {rpm > 0 && (
                <g>
                  <circle
                    cx="150"
                    cy="60"
                    r={
                      5 +
                      5 *
                        Math.sin(time * (rpm / 60) * 8 * Math.PI) *
                        (load / 100)
                    }
                    fill="orange"
                    opacity={
                      (0.5 + 0.5 * Math.sin(time * (rpm / 60) * 8 * Math.PI)) *
                      (load / 100)
                    }
                  />
                  <circle
                    cx="150"
                    cy="60"
                    r={
                      3 +
                      3 *
                        Math.cos(time * (rpm / 60) * 8 * Math.PI) *
                        (load / 100)
                    }
                    fill="yellow"
                    opacity={
                      (0.5 + 0.5 * Math.cos(time * (rpm / 60) * 8 * Math.PI)) *
                      (load / 100)
                    }
                  />
                </g>
              )}
            </g>

            {/* Force vectors */}
            {rpm > 0 && (
              <>
                <line
                  x1="150"
                  y1={
                    90 +
                    40 * Math.sin(time * (rpm / 60) * 2 * Math.PI + Math.PI / 2)
                  }
                  x2="150"
                  y2={
                    90 +
                    40 *
                      Math.sin(time * (rpm / 60) * 2 * Math.PI + Math.PI / 2) -
                    20 * (load / 100)
                  }
                  stroke="red"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="0"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3.5, 0 7" fill="red" />
                  </marker>
                </defs>
                <text
                  x="160"
                  y={
                    90 +
                    40 *
                      Math.sin(time * (rpm / 60) * 2 * Math.PI + Math.PI / 2) -
                    10
                  }
                  fill="white"
                  fontSize="8"
                >
                  {((powerOutput * 10) / MAX_POWER).toFixed(1)} kN
                </text>
              </>
            )}
          </svg>
        </div>
      </div>
    </div>
  );

  // View selection buttons
  const renderViewSelector = () => (
    <div className="flex space-x-2 mb-4">
      <button
        className={`px-4 py-2 rounded-lg font-bold ${
          selectedView === "main"
            ? "bg-blue-600 text-white"
            : "bg-gray-700 text-gray-300"
        }`}
        onClick={() => setSelectedView("main")}
      >
        Main Controls
      </button>
      <button
        className={`px-4 py-2 rounded-lg font-bold ${
          selectedView === "detailed"
            ? "bg-blue-600 text-white"
            : "bg-gray-700 text-gray-300"
        }`}
        onClick={() => setSelectedView("detailed")}
      >
        Detailed Stats
      </button>
      <button
        className={`px-4 py-2 rounded-lg font-bold ${
          selectedView === "electrical"
            ? "bg-blue-600 text-white"
            : "bg-gray-700 text-gray-300"
        }`}
        onClick={() => setSelectedView("electrical")}
      >
        Electrical
      </button>
      <button
        className={`px-4 py-2 rounded-lg font-bold ${
          selectedView === "physics"
            ? "bg-blue-600 text-white"
            : "bg-gray-700 text-gray-300"
        }`}
        onClick={() => setSelectedView("physics")}
      >
        Physics
      </button>
    </div>
  );

  return (
    <div className="bg-gray-900 text-white p-6 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Diesel Power Plant Simulator</h1>

      {renderViewSelector()}

      {selectedView === "main" && renderMainView()}
      {selectedView === "detailed" && renderDetailedView()}
      {selectedView === "electrical" && renderElectricalView()}
      {selectedView === "physics" && renderPhysicsView()}

      <div className="mt-4 text-xs text-gray-400 text-right">
        Simulation Time: {time.toFixed(1)}s | Engine Hours:{" "}
        {(time / 3600).toFixed(2)}h
      </div>
    </div>
  );
}
