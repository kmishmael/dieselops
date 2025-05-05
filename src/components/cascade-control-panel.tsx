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
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Slider } from "../components/ui/slider";
import { Switch } from "../components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Thermometer,
  Gauge,
  BarChart3,
  Settings,
  LineChart,
  Layers,
} from "lucide-react";

interface CascadeControlPanelProps {
  cascadeControlEnabled: boolean;
  setCascadeControlEnabled: (enabled: boolean) => void;
  cascadeControlConfig: {
    type: string;
    primarySetpoint: number;
    primaryMeasurement: number;
    primaryOutput: number;
    secondarySetpoint: number;
    secondaryMeasurement: number;
    secondaryOutput: number;
  };
  updateCascadeSetpoint: (setpoint: number) => void;
  updateCascadeParameters: (
    controller: "primary" | "secondary",
    kp?: number,
    ki?: number,
    kd?: number
  ) => void;
  cascadeParameters: {
    primary: { kp: number; ki: number; kd: number };
    secondary: { kp: number; ki: number; kd: number };
  };
  cascadeHistory: any[];
  running: boolean;
  emergencyMode: boolean;
}

export default function CascadeControlPanel({
  cascadeControlEnabled,
  setCascadeControlEnabled,
  cascadeControlConfig,
  updateCascadeSetpoint,
  updateCascadeParameters,
  cascadeParameters,
  cascadeHistory,
  running,
  emergencyMode,
}: CascadeControlPanelProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [cascadeType, setCascadeType] = useState(
    cascadeControlConfig.type || "temperature-cooling"
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Handle cascade type change
  const handleCascadeTypeChange = (value: string) => {
    setCascadeType(value);
    // In a real implementation, this would reconfigure the cascade controller
  };

  // Draw cascade control visualization
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

    // Draw cascade control data
    if (cascadeHistory && cascadeHistory.length > 1) {
      const maxPoints = 100;
      const startIdx = Math.max(0, cascadeHistory.length - maxPoints);
      const points = cascadeHistory.slice(startIdx);

      // Draw primary setpoint
      ctx.strokeStyle = "rgba(0, 255, 0, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      points.forEach((point, i) => {
        const x = (i / (points.length - 1)) * rect.width;
        // Normalize to canvas height (assuming setpoint range 0-100)
        const y = rect.height - (point.primarySetpoint / 100) * rect.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Draw primary measurement
      ctx.strokeStyle = "rgba(255, 165, 0, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      points.forEach((point, i) => {
        const x = (i / (points.length - 1)) * rect.width;
        // Normalize to canvas height (assuming measurement range 0-100)
        const y = rect.height - (point.primaryMeasurement / 100) * rect.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Draw secondary setpoint
      ctx.strokeStyle = "rgba(0, 191, 255, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      points.forEach((point, i) => {
        const x = (i / (points.length - 1)) * rect.width;
        // Normalize to canvas height (assuming setpoint range 0-100)
        const y = rect.height - (point.secondarySetpoint / 100) * rect.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Draw secondary measurement
      ctx.strokeStyle = "rgba(255, 105, 180, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      points.forEach((point, i) => {
        const x = (i / (points.length - 1)) * rect.width;
        // Normalize to canvas height (assuming measurement range 0-100)
        const y =
          rect.height - (point.secondaryMeasurement / 100) * rect.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Draw legend
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.font = "12px sans-serif";

      // Primary setpoint
      ctx.fillStyle = "rgba(0, 255, 0, 0.8)";
      ctx.fillRect(10, 10, 20, 10);
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.fillText("Primary Setpoint", 35, 20);

      // Primary measurement
      ctx.fillStyle = "rgba(255, 165, 0, 0.8)";
      ctx.fillRect(10, 30, 20, 10);
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.fillText("Primary Measurement", 35, 40);

      // Secondary setpoint
      ctx.fillStyle = "rgba(0, 191, 255, 0.8)";
      ctx.fillRect(10, 50, 20, 10);
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.fillText("Secondary Setpoint", 35, 60);

      // Secondary measurement
      ctx.fillStyle = "rgba(255, 105, 180, 0.8)";
      ctx.fillRect(10, 70, 20, 10);
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.fillText("Secondary Measurement", 35, 80);
    } else {
      // No data message
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        "No cascade control data available. Enable cascade control to see response.",
        rect.width / 2,
        rect.height / 2
      );
    }
  }, [cascadeHistory, activeTab]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-purple-500" />
          <h3 className="text-lg font-bold">Cascade Control System</h3>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="cascade-enabled">Enable Cascade Control</Label>
          <Switch
            id="cascade-enabled"
            checked={cascadeControlEnabled}
            onCheckedChange={setCascadeControlEnabled}
            disabled={emergencyMode}
          />
        </div>
      </div>

      <Card className={cascadeControlEnabled ? "border-purple-500/50" : ""}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-500" />
              Cascade Configuration
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cascade-type">Cascade Control Type</Label>
                <Select
                  value={cascadeType}
                  onValueChange={handleCascadeTypeChange}
                  disabled={!cascadeControlEnabled || emergencyMode}
                >
                  <SelectTrigger id="cascade-type">
                    <SelectValue placeholder="Select cascade type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="temperature-cooling">
                      Temperature → Cooling System
                    </SelectItem>
                    <SelectItem value="power-fuel">
                      Power Output → Fuel Injection
                    </SelectItem>
                    <SelectItem value="efficiency-excitation">
                      Efficiency → Generator Excitation
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cascade-setpoint">Primary Setpoint</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    id="cascade-setpoint"
                    value={[cascadeControlConfig.primarySetpoint]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(value) => updateCascadeSetpoint(value[0])}
                    disabled={!cascadeControlEnabled || emergencyMode}
                  />
                  <span className="w-12 text-right">
                    {cascadeControlConfig.primarySetpoint}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div className="bg-muted p-2 rounded">
                <div className="text-muted-foreground">Primary Setpoint</div>
                <div className="font-mono">
                  {cascadeControlConfig.primarySetpoint.toFixed(1)}
                </div>
              </div>
              <div className="bg-muted p-2 rounded">
                <div className="text-muted-foreground">Primary Measurement</div>
                <div className="font-mono">
                  {cascadeControlConfig.primaryMeasurement.toFixed(1)}
                </div>
              </div>
              <div className="bg-muted p-2 rounded">
                <div className="text-muted-foreground">Primary Output</div>
                <div className="font-mono">
                  {cascadeControlConfig.primaryOutput.toFixed(1)}
                </div>
              </div>
              <div className="bg-muted p-2 rounded">
                <div className="text-muted-foreground">Secondary Setpoint</div>
                <div className="font-mono">
                  {cascadeControlConfig.secondarySetpoint.toFixed(1)}
                </div>
              </div>
              <div className="bg-muted p-2 rounded">
                <div className="text-muted-foreground">
                  Secondary Measurement
                </div>
                <div className="font-mono">
                  {cascadeControlConfig.secondaryMeasurement.toFixed(1)}
                </div>
              </div>
              <div className="bg-muted p-2 rounded">
                <div className="text-muted-foreground">Secondary Output</div>
                <div className="font-mono">
                  {cascadeControlConfig.secondaryOutput.toFixed(1)}
                </div>
              </div>
              <div className="bg-muted p-2 rounded col-span-2">
                <div className="text-muted-foreground">Control Type</div>
                <div className="font-mono">
                  {cascadeType === "temperature-cooling"
                    ? "Temperature → Cooling System"
                    : cascadeType === "power-fuel"
                    ? "Power Output → Fuel Injection"
                    : "Efficiency → Generator Excitation"}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="primary">Primary Controller</TabsTrigger>
          <TabsTrigger value="secondary">Secondary Controller</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <LineChart className="h-4 w-4" />
                Cascade Control Response
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] bg-muted rounded-lg">
                <canvas ref={canvasRef} className="w-full h-full" />
              </div>

              <div className="mt-4 bg-muted p-3 rounded text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-blue-400" />
                  <span className="font-medium">
                    Cascade Control Information
                  </span>
                </div>
                <p>
                  Cascade control uses two controllers in series, where the
                  output of the primary (master) controller sets the setpoint
                  for the secondary (slave) controller. This arrangement
                  improves disturbance rejection and handles processes with
                  multiple time constants more effectively.
                </p>
                <p className="mt-2">
                  {cascadeType === "temperature-cooling"
                    ? "In this configuration, the primary controller regulates engine temperature by adjusting the setpoint of the secondary controller, which directly controls the cooling system power."
                    : cascadeType === "power-fuel"
                    ? "In this configuration, the primary controller regulates power output by adjusting the setpoint of the secondary controller, which directly controls the fuel injection rate."
                    : "In this configuration, the primary controller regulates efficiency by adjusting the setpoint of the secondary controller, which directly controls the generator excitation."}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="primary">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Primary (Master) Controller
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {cascadeType === "temperature-cooling" ? (
                    <Thermometer className="h-4 w-4 text-red-500" />
                  ) : cascadeType === "power-fuel" ? (
                    <Gauge className="h-4 w-4 text-amber-500" />
                  ) : (
                    <BarChart3 className="h-4 w-4 text-green-500" />
                  )}
                  <h4 className="font-medium">
                    {cascadeType === "temperature-cooling"
                      ? "Temperature Controller"
                      : cascadeType === "power-fuel"
                      ? "Power Output Controller"
                      : "Efficiency Controller"}
                  </h4>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primary-kp">Proportional Gain (Kp)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="primary-kp"
                        type="number"
                        min="0"
                        step="0.1"
                        value={cascadeParameters.primary.kp}
                        onChange={(e) =>
                          updateCascadeParameters(
                            "primary",
                            Number.parseFloat(e.target.value),
                            undefined,
                            undefined
                          )
                        }
                        className="w-full"
                        disabled={!cascadeControlEnabled || emergencyMode}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="primary-ki">Integral Gain (Ki)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="primary-ki"
                        type="number"
                        min="0"
                        step="0.01"
                        value={cascadeParameters.primary.ki}
                        onChange={(e) =>
                          updateCascadeParameters(
                            "primary",
                            undefined,
                            Number.parseFloat(e.target.value),
                            undefined
                          )
                        }
                        className="w-full"
                        disabled={!cascadeControlEnabled || emergencyMode}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="primary-kd">Derivative Gain (Kd)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="primary-kd"
                        type="number"
                        min="0"
                        step="0.1"
                        value={cascadeParameters.primary.kd}
                        onChange={(e) =>
                          updateCascadeParameters(
                            "primary",
                            undefined,
                            undefined,
                            Number.parseFloat(e.target.value)
                          )
                        }
                        className="w-full"
                        disabled={!cascadeControlEnabled || emergencyMode}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-muted p-3 rounded text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-blue-400" />
                    <span className="font-medium">
                      Primary Controller Information
                    </span>
                  </div>
                  <p>
                    The primary controller is the outer loop of the cascade. It
                    measures the main process variable and outputs a setpoint
                    for the secondary controller. The primary controller should
                    be tuned to be slower than the secondary controller.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="secondary">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Secondary (Slave) Controller
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {cascadeType === "temperature-cooling" ? (
                    <Thermometer className="h-4 w-4 text-blue-500" />
                  ) : cascadeType === "power-fuel" ? (
                    <Droplets className="h-4 w-4 text-blue-500" />
                  ) : (
                    <Zap className="h-4 w-4 text-yellow-500" />
                  )}
                  <h4 className="font-medium">
                    {cascadeType === "temperature-cooling"
                      ? "Cooling System Controller"
                      : cascadeType === "power-fuel"
                      ? "Fuel Injection Controller"
                      : "Generator Excitation Controller"}
                  </h4>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="secondary-kp">Proportional Gain (Kp)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="secondary-kp"
                        type="number"
                        min="0"
                        step="0.1"
                        value={cascadeParameters.secondary.kp}
                        onChange={(e) =>
                          updateCascadeParameters(
                            "secondary",
                            Number.parseFloat(e.target.value),
                            undefined,
                            undefined
                          )
                        }
                        className="w-full"
                        disabled={!cascadeControlEnabled || emergencyMode}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondary-ki">Integral Gain (Ki)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="secondary-ki"
                        type="number"
                        min="0"
                        step="0.01"
                        value={cascadeParameters.secondary.ki}
                        onChange={(e) =>
                          updateCascadeParameters(
                            "secondary",
                            undefined,
                            Number.parseFloat(e.target.value),
                            undefined
                          )
                        }
                        className="w-full"
                        disabled={!cascadeControlEnabled || emergencyMode}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondary-kd">Derivative Gain (Kd)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="secondary-kd"
                        type="number"
                        min="0"
                        step="0.1"
                        value={cascadeParameters.secondary.kd}
                        onChange={(e) =>
                          updateCascadeParameters(
                            "secondary",
                            undefined,
                            undefined,
                            Number.parseFloat(e.target.value)
                          )
                        }
                        className="w-full"
                        disabled={!cascadeControlEnabled || emergencyMode}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-muted p-3 rounded text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-blue-400" />
                    <span className="font-medium">
                      Secondary Controller Information
                    </span>
                  </div>
                  <p>
                    The secondary controller is the inner loop of the cascade.
                    It receives its setpoint from the primary controller and
                    directly manipulates the control variable. The secondary
                    controller should be tuned to be faster than the primary
                    controller for optimal cascade performance.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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

function Droplets(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z" />
      <path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97" />
    </svg>
  );
}

function Zap(props: React.SVGProps<SVGSVGElement>) {
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
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
