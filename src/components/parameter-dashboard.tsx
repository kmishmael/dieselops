"use client";

import { useState } from "react";
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
import { Label } from "../components/ui/label";
import {
  LineChart,
  BarChart,
  PieChart,
  Download,
  Copy,
  RefreshCw,
} from "lucide-react";

interface ParameterDashboardProps {
  parameters: {
    powerOutput: number;
    fuelConsumption: number;
    engineTemperature: number;
    efficiency: number;
    emissions: {
      co2: number;
      nox: number;
      particulates: number;
    };
    fuelInjectionRate: number;
    load: number;
    coolingSystemPower: number;
    generatorExcitation: number;
    maintenanceStatus: number;
  };
  time: number;
}

export default function ParameterDashboard({
  parameters,
  time,
}: ParameterDashboardProps) {
  const [viewMode, setViewMode] = useState<"table" | "chart" | "export">(
    "table"
  );
  const [exportFormat, setExportFormat] = useState<"json" | "csv" | "text">(
    "json"
  );

  // Format parameters for export
  const formatExport = () => {
    const data = {
      timestamp: new Date().toISOString(),
      simulationTime: time.toFixed(2),
      parameters: {
        powerOutput: parameters.powerOutput.toFixed(2),
        fuelConsumption: parameters.fuelConsumption.toFixed(2),
        engineTemperature: parameters.engineTemperature.toFixed(2),
        efficiency: parameters.efficiency.toFixed(2),
        emissions: {
          co2: parameters.emissions.co2.toFixed(2),
          nox: parameters.emissions.nox.toFixed(2),
          particulates: parameters.emissions.particulates.toFixed(2),
        },
        controls: {
          fuelInjectionRate: parameters.fuelInjectionRate.toFixed(2),
          load: parameters.load.toFixed(2),
          coolingSystemPower: parameters.coolingSystemPower.toFixed(2),
          generatorExcitation: parameters.generatorExcitation.toFixed(2),
          maintenanceStatus: parameters.maintenanceStatus.toFixed(2),
        },
      },
    };

    switch (exportFormat) {
      case "json":
        return JSON.stringify(data, null, 2);
      case "csv":
        return `timestamp,simulationTime,powerOutput,fuelConsumption,engineTemperature,efficiency,co2,nox,particulates,fuelInjectionRate,load,coolingSystemPower,generatorExcitation,maintenanceStatus
${data.timestamp},${data.simulationTime},${data.parameters.powerOutput},${data.parameters.fuelConsumption},${data.parameters.engineTemperature},${data.parameters.efficiency},${data.parameters.emissions.co2},${data.parameters.emissions.nox},${data.parameters.emissions.particulates},${data.parameters.controls.fuelInjectionRate},${data.parameters.controls.load},${data.parameters.controls.coolingSystemPower},${data.parameters.controls.generatorExcitation},${data.parameters.controls.maintenanceStatus}`;
      case "text":
        return `Diesel Power Plant Simulation - Data Export
Timestamp: ${data.timestamp}
Simulation Time: ${data.simulationTime}s

OUTPUT PARAMETERS:
Power Output: ${data.parameters.powerOutput} MW
Fuel Consumption: ${data.parameters.fuelConsumption} L/min
Engine Temperature: ${data.parameters.engineTemperature} °C
Efficiency: ${data.parameters.efficiency} %

EMISSIONS:
CO₂: ${data.parameters.emissions.co2} kg/h
NOₓ: ${data.parameters.emissions.nox} g/kWh
Particulates: ${data.parameters.emissions.particulates} mg/m³

CONTROL SETTINGS:
Fuel Injection Rate: ${data.parameters.controls.fuelInjectionRate} %
Load: ${data.parameters.controls.load} %
Cooling System Power: ${data.parameters.controls.coolingSystemPower} %
Generator Excitation: ${data.parameters.controls.generatorExcitation} %
Maintenance Status: ${data.parameters.controls.maintenanceStatus} %`;
      default:
        return JSON.stringify(data);
    }
  };

  // Copy export data to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(formatExport());
  };

  // Download export data
  const downloadData = () => {
    const data = formatExport();
    const blob = new Blob([data], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diesel-plant-simulation-${new Date().getTime()}.${
      exportFormat === "json" ? "json" : exportFormat === "csv" ? "csv" : "txt"
    }`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
          >
            <RefreshCw className="mr-1 h-4 w-4" />
            Live Data
          </Button>
          <Button
            variant={viewMode === "chart" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("chart")}
          >
            <LineChart className="mr-1 h-4 w-4" />
            Charts
          </Button>
          <Button
            variant={viewMode === "export" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("export")}
          >
            <Download className="mr-1 h-4 w-4" />
            Export
          </Button>
        </div>
        <div className="text-sm text-zinc-400">
          Simulation Time: {Math.floor(time / 60)}m {Math.floor(time % 60)}s
        </div>
      </div>

      {viewMode === "table" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Output Parameters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 items-center">
                  <Label>Power Output:</Label>
                  <div className="font-mono bg-zinc-700 p-1 rounded text-right">
                    {parameters.powerOutput.toFixed(2)} MW
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 items-center">
                  <Label>Fuel Consumption:</Label>
                  <div className="font-mono bg-zinc-700 p-1 rounded text-right">
                    {parameters.fuelConsumption.toFixed(2)} L/min
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 items-center">
                  <Label>Engine Temperature:</Label>
                  <div className="font-mono bg-zinc-700 p-1 rounded text-right">
                    {parameters.engineTemperature.toFixed(2)} °C
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 items-center">
                  <Label>Efficiency:</Label>
                  <div className="font-mono bg-zinc-700 p-1 rounded text-right">
                    {parameters.efficiency.toFixed(2)} %
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Emissions Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 items-center">
                  <Label>CO₂ Emissions:</Label>
                  <div className="font-mono bg-zinc-700 p-1 rounded text-right">
                    {parameters.emissions.co2.toFixed(2)} kg/h
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 items-center">
                  <Label>NOₓ Emissions:</Label>
                  <div className="font-mono bg-zinc-700 p-1 rounded text-right">
                    {parameters.emissions.nox.toFixed(2)} g/kWh
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 items-center">
                  <Label>Particulate Matter:</Label>
                  <div className="font-mono bg-zinc-700 p-1 rounded text-right">
                    {parameters.emissions.particulates.toFixed(2)} mg/m³
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 items-center">
                  <Label>Environmental Score:</Label>
                  <div className="font-mono bg-zinc-700 p-1 rounded text-right">
                    {Math.round(
                      (parameters.emissions.co2 / 100) * 0.5 +
                        (parameters.emissions.nox / 100) * 0.3 +
                        (parameters.emissions.particulates / 100) * 0.2 * 100
                    )}{" "}
                    / 100
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Control Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 items-center">
                  <Label>Fuel Injection Rate:</Label>
                  <div className="font-mono bg-zinc-700 p-1 rounded text-right">
                    {parameters.fuelInjectionRate.toFixed(2)} %
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 items-center">
                  <Label>Load:</Label>
                  <div className="font-mono bg-zinc-700 p-1 rounded text-right">
                    {parameters.load.toFixed(2)} %
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 items-center">
                  <Label>Cooling System Power:</Label>
                  <div className="font-mono bg-zinc-700 p-1 rounded text-right">
                    {parameters.coolingSystemPower.toFixed(2)} %
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 items-center">
                  <Label>Generator Excitation:</Label>
                  <div className="font-mono bg-zinc-700 p-1 rounded text-right">
                    {parameters.generatorExcitation.toFixed(2)} %
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">System Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 items-center">
                  <Label>Maintenance Status:</Label>
                  <div className="font-mono bg-zinc-700 p-1 rounded text-right">
                    {parameters.maintenanceStatus.toFixed(2)} %
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 items-center">
                  <Label>Temperature Status:</Label>
                  <div
                    className={`font-mono p-1 rounded text-right ${
                      parameters.engineTemperature > 90
                        ? "bg-red-900/50 text-red-200"
                        : parameters.engineTemperature > 80
                        ? "bg-amber-900/50 text-amber-200"
                        : "bg-green-900/50 text-green-200"
                    }`}
                  >
                    {parameters.engineTemperature > 90
                      ? "CRITICAL"
                      : parameters.engineTemperature > 80
                      ? "WARNING"
                      : "NORMAL"}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 items-center">
                  <Label>Efficiency Status:</Label>
                  <div
                    className={`font-mono p-1 rounded text-right ${
                      parameters.efficiency < 25
                        ? "bg-red-900/50 text-red-200"
                        : parameters.efficiency < 35
                        ? "bg-amber-900/50 text-amber-200"
                        : "bg-green-900/50 text-green-200"
                    }`}
                  >
                    {parameters.efficiency < 25
                      ? "POOR"
                      : parameters.efficiency < 35
                      ? "AVERAGE"
                      : "GOOD"}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 items-center">
                  <Label>Overall Health:</Label>
                  <div
                    className={`font-mono p-1 rounded text-right ${
                      parameters.maintenanceStatus < 30 ||
                      parameters.engineTemperature > 95
                        ? "bg-red-900/50 text-red-200"
                        : parameters.maintenanceStatus < 60 ||
                          parameters.engineTemperature > 85
                        ? "bg-amber-900/50 text-amber-200"
                        : "bg-green-900/50 text-green-200"
                    }`}
                  >
                    {parameters.maintenanceStatus < 30 ||
                    parameters.engineTemperature > 95
                      ? "CRITICAL"
                      : parameters.maintenanceStatus < 60 ||
                        parameters.engineTemperature > 85
                      ? "WARNING"
                      : "GOOD"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {viewMode === "chart" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <LineChart className="h-4 w-4" />
                Parameter Visualization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="output">
                <TabsList className="grid grid-cols-3 mb-4">
                  <TabsTrigger value="output">Output Parameters</TabsTrigger>
                  <TabsTrigger value="emissions">Emissions</TabsTrigger>
                  <TabsTrigger value="controls">Control Settings</TabsTrigger>
                </TabsList>

                <TabsContent
                  value="output"
                  className="h-[300px] flex items-center justify-center"
                >
                  <div className="text-center text-zinc-500">
                    <BarChart className="h-16 w-16 mx-auto mb-2 opacity-50" />
                    <p>
                      Interactive charts would display here in a full
                      implementation
                    </p>
                    <p className="text-sm mt-2">
                      Current values: Power: {parameters.powerOutput.toFixed(1)}{" "}
                      MW, Temp: {parameters.engineTemperature.toFixed(1)}°C
                    </p>
                  </div>
                </TabsContent>

                <TabsContent
                  value="emissions"
                  className="h-[300px] flex items-center justify-center"
                >
                  <div className="text-center text-zinc-500">
                    <PieChart className="h-16 w-16 mx-auto mb-2 opacity-50" />
                    <p>Emissions data visualization would appear here</p>
                    <p className="text-sm mt-2">
                      CO₂: {parameters.emissions.co2.toFixed(1)} kg/h, NOₓ:{" "}
                      {parameters.emissions.nox.toFixed(1)} g/kWh
                    </p>
                  </div>
                </TabsContent>

                <TabsContent
                  value="controls"
                  className="h-[300px] flex items-center justify-center"
                >
                  <div className="text-center text-zinc-500">
                    <LineChart className="h-16 w-16 mx-auto mb-2 opacity-50" />
                    <p>
                      Control settings impact visualization would appear here
                    </p>
                    <p className="text-sm mt-2">
                      Fuel: {parameters.fuelInjectionRate}%, Load:{" "}
                      {parameters.load}%
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}

      {viewMode === "export" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export Simulation Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Label>Format:</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={exportFormat === "json" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setExportFormat("json")}
                    >
                      JSON
                    </Button>
                    <Button
                      variant={exportFormat === "csv" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setExportFormat("csv")}
                    >
                      CSV
                    </Button>
                    <Button
                      variant={exportFormat === "text" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setExportFormat("text")}
                    >
                      Text
                    </Button>
                  </div>
                </div>

                <div className="bg-zinc-900 p-4 rounded-md">
                  <pre className="text-xs overflow-auto max-h-[300px]">
                    {formatExport()}
                  </pre>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={copyToClipboard}>
                    <Copy className="mr-1 h-4 w-4" />
                    Copy
                  </Button>
                  <Button size="sm" onClick={downloadData}>
                    <Download className="mr-1 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
