"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Slider } from "../components/ui/slider";
import { Switch } from "../components/ui/switch";
import {
  Thermometer,
  Gauge,
  BarChart3,
  Settings,
  Target,
  LineChart,
} from "lucide-react";

interface AutomaticControlsProps {
  autoControlEnabled: {
    temperature: boolean;
    power: boolean;
    efficiency: boolean;
  };
  autoControlTargets: {
    temperature: number;
    power: number;
    efficiency: number;
  };
  updateAutoControl: (
    type: "temperature" | "power" | "efficiency",
    enabled: boolean,
    target?: number
  ) => void;
  updatePIDParameters: (
    controller: "temperature" | "power" | "efficiency",
    kp?: number,
    ki?: number,
    kd?: number
  ) => void;
  controllerOutputs: {
    cooling: number;
    fuel: number;
    excitation: number;
  };
  currentValues: {
    temperature: number;
    power: number;
    efficiency: number;
  };
  running: boolean;
  emergencyMode: boolean;
  controllerHistory: {
    temperature: any[];
    power: any[];
    efficiency: any[];
  };
  autoTunePID: (
    controller: "temperature" | "power" | "efficiency"
  ) => Promise<void>;
}

export default function AutomaticControls({
  autoControlEnabled,
  autoControlTargets,
  updateAutoControl,
  updatePIDParameters,
  controllerOutputs,
  currentValues,
  running,
  emergencyMode,
  controllerHistory,
  autoTunePID,
}: AutomaticControlsProps) {
  const [activeTab, setActiveTab] = useState("temperature");
  const [autoTuning, setAutoTuning] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // PID parameters - default values
  const [pidParams, setPidParams] = useState({
    temperature: { kp: 2.0, ki: 0.1, kd: 0.5 },
    power: { kp: 5.0, ki: 0.2, kd: 1.0 },
    efficiency: { kp: 3.0, ki: 0.15, kd: 0.8 },
  });

  // Handle PID parameter changes
  const handlePIDChange = (
    controller: "temperature" | "power" | "efficiency",
    param: "kp" | "ki" | "kd",
    value: number
  ) => {
    setPidParams((prev) => ({
      ...prev,
      [controller]: {
        ...prev[controller],
        [param]: value,
      },
    }));

    // Update the actual controller
    if (param === "kp") {
      updatePIDParameters(controller, value, undefined, undefined);
    } else if (param === "ki") {
      updatePIDParameters(controller, undefined, value, undefined);
    } else if (param === "kd") {
      updatePIDParameters(controller, undefined, undefined, value);
    }
  };

  // Calculate error for display
  const calculateError = (type: "temperature" | "power" | "efficiency") => {
    const target = autoControlTargets[type];
    const current = currentValues[type];
    return target - current;
  };

  // Handle auto-tuning
  const handleAutoTune = async (
    controller: "temperature" | "power" | "efficiency"
  ) => {
    if (!running || emergencyMode) return;

    setAutoTuning(controller);
    try {
      await autoTunePID(controller);

      // Update local PID parameters after auto-tuning
      if (controller === "temperature") {
        setPidParams((prev) => ({
          ...prev,
          temperature: { kp: 2.5, ki: 0.12, kd: 0.6 },
        }));
      } else if (controller === "power") {
        setPidParams((prev) => ({
          ...prev,
          power: { kp: 5.5, ki: 0.25, kd: 1.2 },
        }));
      } else if (controller === "efficiency") {
        setPidParams((prev) => ({
          ...prev,
          efficiency: { kp: 3.5, ki: 0.18, kd: 0.9 },
        }));
      }
    } finally {
      setAutoTuning(null);
    }
  };

  // Draw PID controller response visualization
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

    // Draw background
    ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;

    // Vertical grid lines
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * rect.width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rect.height);
      ctx.stroke();
    }

    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = (i / 4) * rect.height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 2;

    // X-axis (time)
    ctx.beginPath();
    ctx.moveTo(0, rect.height / 2);
    ctx.lineTo(rect.width, rect.height / 2);
    ctx.stroke();

    // Draw controller data
    const history =
      controllerHistory[activeTab as keyof typeof controllerHistory];
    if (history && history.length > 1) {
      const maxPoints = 100;
      const startIdx = Math.max(0, history.length - maxPoints);
      const points = history.slice(startIdx);

      // Draw setpoint line
      ctx.strokeStyle = "rgba(0, 255, 0, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();

      // Normalize the first point
      const firstSetpoint = points[0].setpoint;
      const x0 = 0;
      const y0 = rect.height / 2;
      ctx.moveTo(x0, y0);

      points.forEach((point, i) => {
        const x = (i / (points.length - 1)) * rect.width;
        // Center the setpoint line
        const y = rect.height / 2;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Draw measurement line
      ctx.strokeStyle = "rgba(255, 165, 0, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();

      points.forEach((point, i) => {
        const x = (i / (points.length - 1)) * rect.width;
        // Scale the error to fit in the canvas
        const error = point.setpoint - point.measurement;
        const maxError = 10; // Adjust based on expected error range
        const normalizedError = Math.max(-1, Math.min(1, error / maxError));
        const y = rect.height / 2 - normalizedError * (rect.height / 4);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Draw output line
      ctx.strokeStyle = "rgba(0, 191, 255, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();

      points.forEach((point, i) => {
        const x = (i / (points.length - 1)) * rect.width;
        // Scale the output to fit in the canvas
        const maxOutput = 100; // Assuming output range is 0-100
        const normalizedOutput = (point.output / maxOutput) * 2 - 1; // Scale to -1 to 1
        const y = rect.height / 2 - normalizedOutput * (rect.height / 4);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Draw legend
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.font = "12px sans-serif";

      // Setpoint
      ctx.fillStyle = "rgba(0, 255, 0, 0.8)";
      ctx.fillRect(10, 10, 20, 10);
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.fillText("Setpoint", 35, 20);

      // Measurement
      ctx.fillStyle = "rgba(255, 165, 0, 0.8)";
      ctx.fillRect(10, 30, 20, 10);
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.fillText("Error", 35, 40);

      // Output
      ctx.fillStyle = "rgba(0, 191, 255, 0.8)";
      ctx.fillRect(10, 50, 20, 10);
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.fillText("Control Output", 35, 60);
    } else {
      // No data message
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        "No controller data available. Enable auto control to see response.",
        rect.width / 2,
        rect.height / 2
      );
    }
  }, [activeTab, controllerHistory]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className={autoControlEnabled.temperature ? "border-cyan-500/50" : ""}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-red-500" />
                Temperature Control
              </div>
              <Switch
                checked={autoControlEnabled.temperature}
                onCheckedChange={(checked) =>
                  updateAutoControl("temperature", checked)
                }
                disabled={emergencyMode}
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="temp-target">Target Temperature</Label>
                  <span className="text-sm">
                    {autoControlTargets.temperature}°C
                  </span>
                </div>
                <Slider
                  id="temp-target"
                  value={[autoControlTargets.temperature]}
                  min={60}
                  max={90}
                  step={1}
                  onValueChange={(value) =>
                    updateAutoControl(
                      "temperature",
                      autoControlEnabled.temperature,
                      value[0]
                    )
                  }
                  disabled={!autoControlEnabled.temperature || emergencyMode}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-muted p-2 rounded">
                  <div className="text-muted-foreground">Current</div>
                  <div className="font-mono">
                    {currentValues.temperature.toFixed(1)}°C
                  </div>
                </div>
                <div className="bg-muted p-2 rounded">
                  <div className="text-muted-foreground">Error</div>
                  <div
                    className={`font-mono ${
                      Math.abs(calculateError("temperature")) > 5
                        ? "text-amber-500"
                        : "text-emerald-500"
                    }`}
                  >
                    {calculateError("temperature").toFixed(1)}°C
                  </div>
                </div>
                <div className="bg-muted p-2 rounded">
                  <div className="text-muted-foreground">Control Output</div>
                  <div className="font-mono">
                    {controllerOutputs.cooling.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-muted p-2 rounded">
                  <div className="text-muted-foreground">Controls</div>
                  <div className="font-mono">Cooling System</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={autoControlEnabled.power ? "border-cyan-500/50" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-amber-500" />
                Power Control
              </div>
              <Switch
                checked={autoControlEnabled.power}
                onCheckedChange={(checked) =>
                  updateAutoControl("power", checked)
                }
                disabled={emergencyMode}
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="power-target">Target Power Output</Label>
                  <span className="text-sm">{autoControlTargets.power} MW</span>
                </div>
                <Slider
                  id="power-target"
                  value={[autoControlTargets.power]}
                  min={1}
                  max={10}
                  step={0.5}
                  onValueChange={(value) =>
                    updateAutoControl(
                      "power",
                      autoControlEnabled.power,
                      value[0]
                    )
                  }
                  disabled={!autoControlEnabled.power || emergencyMode}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-muted p-2 rounded">
                  <div className="text-muted-foreground">Current</div>
                  <div className="font-mono">
                    {currentValues.power.toFixed(1)} MW
                  </div>
                </div>
                <div className="bg-muted p-2 rounded">
                  <div className="text-muted-foreground">Error</div>
                  <div
                    className={`font-mono ${
                      Math.abs(calculateError("power")) > 1
                        ? "text-amber-500"
                        : "text-emerald-500"
                    }`}
                  >
                    {calculateError("power").toFixed(1)} MW
                  </div>
                </div>
                <div className="bg-muted p-2 rounded">
                  <div className="text-muted-foreground">Control Output</div>
                  <div className="font-mono">
                    {controllerOutputs.fuel.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-muted p-2 rounded">
                  <div className="text-muted-foreground">Controls</div>
                  <div className="font-mono">Fuel Injection</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={autoControlEnabled.efficiency ? "border-cyan-500/50" : ""}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-green-500" />
                Efficiency Control
              </div>
              <Switch
                checked={autoControlEnabled.efficiency}
                onCheckedChange={(checked) =>
                  updateAutoControl("efficiency", checked)
                }
                disabled={emergencyMode}
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="efficiency-target">Target Efficiency</Label>
                  <span className="text-sm">
                    {autoControlTargets.efficiency}%
                  </span>
                </div>
                <Slider
                  id="efficiency-target"
                  value={[autoControlTargets.efficiency]}
                  min={25}
                  max={45}
                  step={1}
                  onValueChange={(value) =>
                    updateAutoControl(
                      "efficiency",
                      autoControlEnabled.efficiency,
                      value[0]
                    )
                  }
                  disabled={!autoControlEnabled.efficiency || emergencyMode}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-muted p-2 rounded">
                  <div className="text-muted-foreground">Current</div>
                  <div className="font-mono">
                    {currentValues.efficiency.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-muted p-2 rounded">
                  <div className="text-muted-foreground">Error</div>
                  <div
                    className={`font-mono ${
                      Math.abs(calculateError("efficiency")) > 5
                        ? "text-amber-500"
                        : "text-emerald-500"
                    }`}
                  >
                    {calculateError("efficiency").toFixed(1)}%
                  </div>
                </div>
                <div className="bg-muted p-2 rounded">
                  <div className="text-muted-foreground">Control Output</div>
                  <div className="font-mono">
                    {controllerOutputs.excitation.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-muted p-2 rounded">
                  <div className="text-muted-foreground">Controls</div>
                  <div className="font-mono">Generator Excitation</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            PID Controller Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="temperature" onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="temperature">Temperature</TabsTrigger>
              <TabsTrigger value="power">Power</TabsTrigger>
              <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
            </TabsList>

            <TabsContent value="temperature">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-red-500" />
                  <h4 className="font-medium">Temperature PID Controller</h4>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="temp-kp">Proportional Gain (Kp)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="temp-kp"
                        type="number"
                        min="0"
                        step="0.1"
                        value={pidParams.temperature.kp}
                        onChange={(e) =>
                          handlePIDChange(
                            "temperature",
                            "kp",
                            Number.parseFloat(e.target.value)
                          )
                        }
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="temp-ki">Integral Gain (Ki)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="temp-ki"
                        type="number"
                        min="0"
                        step="0.01"
                        value={pidParams.temperature.ki}
                        onChange={(e) =>
                          handlePIDChange(
                            "temperature",
                            "ki",
                            Number.parseFloat(e.target.value)
                          )
                        }
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="temp-kd">Derivative Gain (Kd)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="temp-kd"
                        type="number"
                        min="0"
                        step="0.1"
                        value={pidParams.temperature.kd}
                        onChange={(e) =>
                          handlePIDChange(
                            "temperature",
                            "kd",
                            Number.parseFloat(e.target.value)
                          )
                        }
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-muted p-3 rounded text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-blue-400" />
                    <span className="font-medium">Controller Information</span>
                  </div>
                  <p>
                    This PID controller regulates the cooling system power to
                    maintain the target temperature. Increase Kp for faster
                    response, Ki to eliminate steady-state error, and Kd to
                    reduce overshoot.
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="power">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-amber-500" />
                  <h4 className="font-medium">Power Output PID Controller</h4>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="power-kp">Proportional Gain (Kp)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="power-kp"
                        type="number"
                        min="0"
                        step="0.1"
                        value={pidParams.power.kp}
                        onChange={(e) =>
                          handlePIDChange(
                            "power",
                            "kp",
                            Number.parseFloat(e.target.value)
                          )
                        }
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="power-ki">Integral Gain (Ki)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="power-ki"
                        type="number"
                        min="0"
                        step="0.01"
                        value={pidParams.power.ki}
                        onChange={(e) =>
                          handlePIDChange(
                            "power",
                            "ki",
                            Number.parseFloat(e.target.value)
                          )
                        }
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="power-kd">Derivative Gain (Kd)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="power-kd"
                        type="number"
                        min="0"
                        step="0.1"
                        value={pidParams.power.kd}
                        onChange={(e) =>
                          handlePIDChange(
                            "power",
                            "kd",
                            Number.parseFloat(e.target.value)
                          )
                        }
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-muted p-3 rounded text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-blue-400" />
                    <span className="font-medium">Controller Information</span>
                  </div>
                  <p>
                    This PID controller adjusts the fuel injection rate to
                    maintain the target power output. Higher Kp values provide
                    faster response but may cause oscillations. Balance with Ki
                    and Kd for stability.
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="efficiency">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-green-500" />
                  <h4 className="font-medium">Efficiency PID Controller</h4>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="eff-kp">Proportional Gain (Kp)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="eff-kp"
                        type="number"
                        min="0"
                        step="0.1"
                        value={pidParams.efficiency.kp}
                        onChange={(e) =>
                          handlePIDChange(
                            "efficiency",
                            "kp",
                            Number.parseFloat(e.target.value)
                          )
                        }
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="eff-ki">Integral Gain (Ki)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="eff-ki"
                        type="number"
                        min="0"
                        step="0.01"
                        value={pidParams.efficiency.ki}
                        onChange={(e) =>
                          handlePIDChange(
                            "efficiency",
                            "ki",
                            Number.parseFloat(e.target.value)
                          )
                        }
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="eff-kd">Derivative Gain (Kd)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="eff-kd"
                        type="number"
                        min="0"
                        step="0.1"
                        value={pidParams.efficiency.kd}
                        onChange={(e) =>
                          handlePIDChange(
                            "efficiency",
                            "kd",
                            Number.parseFloat(e.target.value)
                          )
                        }
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-muted p-3 rounded text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-blue-400" />
                    <span className="font-medium">Controller Information</span>
                  </div>
                  <p>
                    This PID controller adjusts the generator excitation to
                    optimize efficiency. Efficiency control is more complex and
                    may require careful tuning of all three parameters.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <LineChart className="h-4 w-4" />
            Control System Response
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] bg-muted rounded-lg">
            <canvas ref={canvasRef} className="w-full h-full" />
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={!running || emergencyMode || autoTuning !== null}
              onClick={() => handleAutoTune("temperature")}
            >
              {autoTuning === "temperature" ? (
                <>
                  <span className="animate-pulse">Auto-tuning...</span>
                </>
              ) : (
                <>
                  <Target className="mr-1 h-4 w-4" />
                  Auto-tune Temperature
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!running || emergencyMode || autoTuning !== null}
              onClick={() => handleAutoTune("power")}
            >
              {autoTuning === "power" ? (
                <>
                  <span className="animate-pulse">Auto-tuning...</span>
                </>
              ) : (
                <>
                  <Target className="mr-1 h-4 w-4" />
                  Auto-tune Power
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!running || emergencyMode || autoTuning !== null}
              onClick={() => handleAutoTune("efficiency")}
            >
              {autoTuning === "efficiency" ? (
                <>
                  <span className="animate-pulse">Auto-tuning...</span>
                </>
              ) : (
                <>
                  <Target className="mr-1 h-4 w-4" />
                  Auto-tune Efficiency
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Info(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}
