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
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Slider } from "../components/ui/slider";
import {
  Settings,
  Sliders,
  FileInput,
  Save,
  Upload,
  AlertTriangle,
  Gauge,
  Thermometer,
  Droplets,
  Zap,
} from "lucide-react";

interface AdvancedControlsProps {
  onParameterChange: (parameter: string, value: number) => void;
  running: boolean;
  emergencyMode: boolean;
}

export default function AdvancedControls({
  onParameterChange,
  running,
  emergencyMode,
}: AdvancedControlsProps) {
  const [activeTab, setActiveTab] = useState("manual");
  const [customValues, setCustomValues] = useState({
    fuelInjectionRate: 50,
    load: 40,
    coolingSystemPower: 60,
    generatorExcitation: 70,
    maintenanceStatus: 100,
  });
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState([
    {
      name: "Maximum Power",
      fuelInjectionRate: 95,
      load: 90,
      coolingSystemPower: 100,
      generatorExcitation: 90,
      maintenanceStatus: 100,
    },
    {
      name: "Eco Mode",
      fuelInjectionRate: 40,
      load: 60,
      coolingSystemPower: 50,
      generatorExcitation: 60,
      maintenanceStatus: 100,
    },
    {
      name: "Maintenance Mode",
      fuelInjectionRate: 20,
      load: 20,
      coolingSystemPower: 30,
      generatorExcitation: 30,
      maintenanceStatus: 100,
    },
  ]);
  const [showWarning, setShowWarning] = useState(false);

  // Handle manual parameter changes
  const handleManualChange = (parameter: string, value: number) => {
    setCustomValues((prev) => ({
      ...prev,
      [parameter]: value,
    }));
    onParameterChange(parameter, value);
  };

  // Apply a preset configuration
  const applyPreset = (preset: any) => {
    if (
      running &&
      !confirm(
        "Applying a preset while the engine is running may cause instability. Continue?"
      )
    ) {
      return;
    }

    setCustomValues(preset);
    Object.entries(preset).forEach(([key, value]) => {
      if (key !== "name") {
        onParameterChange(key, value as number);
      }
    });
  };

  // Save current configuration as a preset
  const savePreset = () => {
    if (!presetName.trim()) {
      setShowWarning(true);
      return;
    }

    const newPreset = {
      name: presetName,
      ...customValues,
    };

    setPresets([...presets, newPreset]);
    setPresetName("");
    setShowWarning(false);
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="presets" onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 mb-4">
          {/* <TabsTrigger value="manual">Manual Control</TabsTrigger> */}
          <TabsTrigger value="presets">Presets</TabsTrigger>
          <TabsTrigger value="scenarios">Test Scenarios</TabsTrigger>
        </TabsList>

        {/* <TabsContent value="manual">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sliders className="h-4 w-4" />
                  Fine-Tune Parameters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label
                        htmlFor="custom-fuel"
                        className="flex items-center gap-1"
                      >
                        <Droplets className="h-3 w-3" /> Fuel Injection Rate
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="custom-fuel-input"
                          type="number"
                          min="0"
                          max="100"
                          value={customValues.fuelInjectionRate}
                          onChange={(e) =>
                            handleManualChange(
                              "fuelInjectionRate",
                              Number(e.target.value)
                            )
                          }
                          className="w-16 h-6 text-xs"
                          disabled={emergencyMode}
                        />
                        <span className="text-xs">%</span>
                      </div>
                    </div>
                    <Slider
                      id="custom-fuel"
                      value={[customValues.fuelInjectionRate]}
                      min={0}
                      max={100}
                      step={0.1}
                      onValueChange={(value) =>
                        handleManualChange("fuelInjectionRate", value[0])
                      }
                      disabled={emergencyMode}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label
                        htmlFor="custom-load"
                        className="flex items-center gap-1"
                      >
                        <Gauge className="h-3 w-3" /> Load Demand
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="custom-load-input"
                          type="number"
                          min="0"
                          max="100"
                          value={customValues.load}
                          onChange={(e) =>
                            handleManualChange("load", Number(e.target.value))
                          }
                          className="w-16 h-6 text-xs"
                        />
                        <span className="text-xs">%</span>
                      </div>
                    </div>
                    <Slider
                      id="custom-load"
                      value={[customValues.load]}
                      min={0}
                      max={100}
                      step={0.1}
                      onValueChange={(value) =>
                        handleManualChange("load", value[0])
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label
                        htmlFor="custom-cooling"
                        className="flex items-center gap-1"
                      >
                        <Thermometer className="h-3 w-3" /> Cooling System Power
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="custom-cooling-input"
                          type="number"
                          min="0"
                          max="100"
                          value={customValues.coolingSystemPower}
                          onChange={(e) =>
                            handleManualChange(
                              "coolingSystemPower",
                              Number(e.target.value)
                            )
                          }
                          className="w-16 h-6 text-xs"
                          disabled={emergencyMode}
                        />
                        <span className="text-xs">%</span>
                      </div>
                    </div>
                    <Slider
                      id="custom-cooling"
                      value={[customValues.coolingSystemPower]}
                      min={0}
                      max={100}
                      step={0.1}
                      onValueChange={(value) =>
                        handleManualChange("coolingSystemPower", value[0])
                      }
                      disabled={emergencyMode}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Advanced Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label
                        htmlFor="custom-excitation"
                        className="flex items-center gap-1"
                      >
                        <Zap className="h-3 w-3" /> Generator Excitation
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="custom-excitation-input"
                          type="number"
                          min="0"
                          max="100"
                          value={customValues.generatorExcitation}
                          onChange={(e) =>
                            handleManualChange(
                              "generatorExcitation",
                              Number(e.target.value)
                            )
                          }
                          className="w-16 h-6 text-xs"
                          disabled={emergencyMode}
                        />
                        <span className="text-xs">%</span>
                      </div>
                    </div>
                    <Slider
                      id="custom-excitation"
                      value={[customValues.generatorExcitation]}
                      min={0}
                      max={100}
                      step={0.1}
                      onValueChange={(value) =>
                        handleManualChange("generatorExcitation", value[0])
                      }
                      disabled={emergencyMode}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label
                        htmlFor="custom-maintenance"
                        className="flex items-center gap-1"
                      >
                        <Settings className="h-3 w-3" /> Maintenance Status
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="custom-maintenance-input"
                          type="number"
                          min="0"
                          max="100"
                          value={customValues.maintenanceStatus}
                          onChange={(e) =>
                            handleManualChange(
                              "maintenanceStatus",
                              Number(e.target.value)
                            )
                          }
                          className="w-16 h-6 text-xs"
                        />
                        <span className="text-xs">%</span>
                      </div>
                    </div>
                    <Slider
                      id="custom-maintenance"
                      value={[customValues.maintenanceStatus]}
                      min={0}
                      max={100}
                      step={0.1}
                      onValueChange={(value) =>
                        handleManualChange("maintenanceStatus", value[0])
                      }
                    />
                  </div>

                  <div className="pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        if (activeTab === "manual") {
                          setActiveTab("presets");
                        }
                      }}
                    >
                      <Save className="mr-1 h-4 w-4" />
                      Save Current Configuration
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent> */}

        <TabsContent value="presets">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {presets.map((preset, index) => (
              <Card
                key={index}
                className="hover:bg-zinc-700/50 transition-colors cursor-pointer"
                onClick={() => applyPreset(preset)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{preset.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-xs text-zinc-400">
                    <div className="flex justify-between">
                      <span>Fuel Injection:</span>
                      <span>{preset.fuelInjectionRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Load:</span>
                      <span>{preset.load}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cooling:</span>
                      <span>{preset.coolingSystemPower}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Excitation:</span>
                      <span>{preset.generatorExcitation}%</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-3">
                    Apply
                  </Button>
                </CardContent>
              </Card>
            ))}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Save New Preset</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="preset-name">Preset Name</Label>
                    <Input
                      id="preset-name"
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      placeholder="Enter preset name"
                    />
                    {showWarning && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Please enter a
                        name
                      </p>
                    )}
                  </div>
                  <Button onClick={savePreset} className="w-full">
                    <Save className="mr-1 h-4 w-4" />
                    Save Current Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="scenarios">
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Test Scenarios</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const scenario = {
                        fuelInjectionRate: 90,
                        load: 90,
                        coolingSystemPower: 50,
                        generatorExcitation: 80,
                        maintenanceStatus: 100,
                      };
                      applyPreset(scenario);
                    }}
                  >
                    High Load Test
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      const scenario = {
                        fuelInjectionRate: 80,
                        load: 70,
                        coolingSystemPower: 30,
                        generatorExcitation: 70,
                        maintenanceStatus: 100,
                      };
                      applyPreset(scenario);
                    }}
                  >
                    Cooling System Stress Test
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      const scenario = {
                        fuelInjectionRate: 60,
                        load: 80,
                        coolingSystemPower: 70,
                        generatorExcitation: 40,
                        maintenanceStatus: 100,
                      };
                      applyPreset(scenario);
                    }}
                  >
                    Low Excitation Test
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      const scenario = {
                        fuelInjectionRate: 70,
                        load: 60,
                        coolingSystemPower: 60,
                        generatorExcitation: 70,
                        maintenanceStatus: 30,
                      };
                      applyPreset(scenario);
                    }}
                  >
                    Poor Maintenance Simulation
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Import/Export Scenarios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Upload className="mr-1 h-4 w-4" />
                      Import
                    </Button>
                    <Button variant="outline" size="sm">
                      <FileInput className="mr-1 h-4 w-4" />
                      Export
                    </Button>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Import and export test scenarios to share with colleagues or
                    save for future testing.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
