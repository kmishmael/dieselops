import { useState, useEffect, useRef } from 'react';
import { Activity, AlertTriangle, BarChart2, Gauge, Zap, Thermometer, Droplets, Wind, Fuel, Info, Settings, TrendingUp, Cloud } from 'lucide-react';
import * as d3 from 'd3';

export default function DieselPowerPlantSimulation() {
  // Constants and physical parameters
  const MAX_POWER = 2500; // kW
  const NOMINAL_RPM = 1500;
  const THERMAL_CAPACITY = 15000; // J/°C - thermal mass
  const FUEL_ENERGY_DENSITY = 42000; // kJ/kg
  const AMBIENT_TEMP = 25; // °C
  
  // System state
  const [engineState, setEngineState] = useState("idle"); // idle, starting, running, stopping, fault
  const [simulationTime, setSimulationTime] = useState(0);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  
  // Animation frame ID for cleanup
  const animationFrameRef = useRef(null);
  
  // Chart data
  const [powerHistory, setPowerHistory] = useState([]);
  const [rpmHistory, setRpmHistory] = useState([]);
  const [tempHistory, setTempHistory] = useState([]);
  const [fuelHistory, setFuelHistory] = useState([]);
  
  // Control inputs
  const [fuelFlowTarget, setFuelFlowTarget] = useState(50);
  const [engineSpeedTarget, setEngineSpeedTarget] = useState(1500); // RPM
  const [loadTarget, setLoadTarget] = useState(60); // Percentage
  const [coolantFlowTarget, setCoolantFlowTarget] = useState(70); // Percentage
  const [ventilationTarget, setVentilationTarget] = useState(60); // Percentage
  
  // Actual system variables (with physics-based dynamics)
  const [fuelFlow, setFuelFlow] = useState(0);
  const [engineSpeed, setEngineSpeed] = useState(0); // RPM
  const [load, setLoad] = useState(0); // Percentage
  const [temperature, setTemperature] = useState(AMBIENT_TEMP); // Celsius
  const [coolantFlow, setCoolantFlow] = useState(0); // Percentage
  const [ventilation, setVentilation] = useState(0); // Percentage
  const [sparkPlugs, setSparkPlugs] = useState(false);
  const [fuelPumpState, setFuelPumpState] = useState(false);
  
  // Calculated outputs
  const [power, setPower] = useState(0); // kW
  const [frequency, setFrequency] = useState(0); // Hz
  const [voltage, setVoltage] = useState(0); // V
  const [current, setCurrent] = useState(0); // A
  const [fuelConsumption, setFuelConsumption] = useState(0); // L/h
  const [efficiency, setEfficiency] = useState(0); // %
  const [emissions, setEmissions] = useState({ co2: 0, nox: 0, particulates: 0 });
  const [oilPressure, setOilPressure] = useState(0); // bar
  const [vibration, setVibration] = useState(0); // mm/s
  const [exhaustTemp, setExhaustTemp] = useState(AMBIENT_TEMP); // Celsius
  const [batteryVoltage, setBatteryVoltage] = useState(24); // V
  
  // Alarms and status
  const [alarms, setAlarms] = useState([]);
  const [statusMessages, setStatusMessages] = useState(['System Ready']);
  const [faultCodes, setFaultCodes] = useState([]);
  
  // UI state
  const [activeTab, setActiveTab] = useState('main');
  const [showDetails, setShowDetails] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState(null);
  
  // Pre-start checklist
  const [preStartComplete, setPreStartComplete] = useState(false);
  const [preStartItems, setPreStartItems] = useState({
    fuelCheck: false,
    oilCheck: false,
    coolantCheck: false,
    batteryCheck: false,
    airFilterCheck: false
  });
  
  // Time constants for system dynamics (in seconds)
  const timeConstants = {
    fuelFlow: 1.2,
    engineSpeed: 3.5,
    temperature: 25,
    coolantTemp: 18,
    load: 2.0,
    exhaustTemp: 8.0,
    vibration: 0.8,
    oilPressure: 1.5
  };
  
  // Charts refs
  const powerChartRef = useRef(null);
  const temperatureChartRef = useRef(null);
  const rpmChartRef = useRef(null);
  
  // Physics-based engine system model (1st order differential equations)
  const updatePhysicsModel = (deltaTime) => {
    // Convert deltaTime from ms to seconds for physics calculations
    const dt = (deltaTime / 1000) * simulationSpeed;
    
    // Only update physics when system isn't idle
    if (engineState !== "idle") {
      // Fuel flow dynamics - first order response
      const fuelFlowDelta = (fuelFlowTarget - fuelFlow) / timeConstants.fuelFlow;
      const newFuelFlow = fuelFlow + fuelFlowDelta * dt;
      setFuelFlow(newFuelFlow);
      
      // Apply engine state conditions
      let speedTarget = 0;
      let actualFuelFlow = 0;
      
      switch(engineState) {
        case "starting":
          // During starting, engine spins up using starter motor
          speedTarget = 400;
          actualFuelFlow = newFuelFlow * 0.5; // Limited fuel during start
          setBatteryVoltage(prev => Math.max(21, prev - 0.1 * dt)); // Battery drains during start
          
          // Add random starting variations (stochastic model)
          if (Math.random() < 0.05) {
            // Occasional starting hiccup
            speedTarget *= (0.85 + Math.random() * 0.1);
            addStatusMessage("Starting hesitation detected");
          }
          
          // If we reach starting speed and conditions are right, transition to running
          if (engineSpeed > 350 && sparkPlugs && fuelPumpState) {
            setEngineState("running");
            addStatusMessage("Engine started successfully");
          }
          break;
          
        case "running":
          // Normal running mode - speed based on target and load
          speedTarget = engineSpeedTarget;
          actualFuelFlow = newFuelFlow;
          setBatteryVoltage(prev => Math.min(25.2, prev + 0.05 * dt)); // Battery charges when running
          
          // Add random operational variations (stochastic model)
          if (Math.random() < 0.01) {
            // Occasional combustion variation
            actualFuelFlow *= (0.98 + Math.random() * 0.04);
          }
          break;
          
        case "stopping":
          // During stopping, engine spins down
          speedTarget = 0;
          actualFuelFlow = 0;
          
          // If speed drops below threshold, transition to idle
          if (engineSpeed < 20) {
            setEngineState("idle");
            addStatusMessage("Engine stopped");
            setSparkPlugs(false);
            setFuelPumpState(false);
          }
          break;
          
        case "fault":
          // Fault mode - engine shuts down due to safety issue
          speedTarget = 0;
          actualFuelFlow = 0;
          break;
      }
      
      // Engine speed dynamics - consider inertia and applied torque
      // Torque is proportional to fuel flow but reduced at very low and very high RPM
      const rpmFactor = engineSpeed / 100;
      const rpmEfficiency = rpmFactor < 1 ? rpmFactor : (1 - Math.pow((engineSpeed - NOMINAL_RPM) / 1000, 2));
      const powerFactor = actualFuelFlow / 100 * Math.max(0, Math.min(1, rpmEfficiency));
      
      let targetSpeed = speedTarget;
      if (engineState === "running") {
        // In running state, load affects speed unless governor compensates
        const loadImpact = (loadTarget / 100) * 100;
        targetSpeed = speedTarget - loadImpact * (1 - powerFactor * 1.1);
        
        // Add governor response dynamics
        // Apply PID-like control algorithm for speed regulation
        const speedError = engineSpeedTarget - engineSpeed;
        const proportionalTerm = speedError * 0.5;
        const integralTerm = speedError * dt * 0.1; 
        targetSpeed += proportionalTerm + integralTerm;
      }
      
      // Apply mechanical inertia to speed changes
      const speedDelta = (targetSpeed - engineSpeed) / timeConstants.engineSpeed;
      const newSpeed = Math.max(0, engineSpeed + speedDelta * dt);
      
      // Add small random variations to simulate real-world fluctuations
      const speedNoise = (Math.random() - 0.5) * 5 * (engineSpeed / 1000);
      setEngineSpeed(newSpeed + speedNoise);
      
      // Temperature dynamics - heat production minus cooling
      // Heat produced is proportional to fuel consumption and inefficiency
      const heatProduced = actualFuelFlow * (1 - (efficiency/100)) * 10;
      
      // Cooling is proportional to coolant flow and temperature difference
      // Nonlinear cooling efficiency drops at higher temperatures
      const tempDifferential = temperature - AMBIENT_TEMP;
      const coolingEfficiency = 1 - Math.pow(tempDifferential / 150, 2);
      const cooling = (coolantFlow / 100) * tempDifferential * 0.8 * coolingEfficiency;
      
      // Thermal mass dampens temperature changes
      const tempDelta = (heatProduced - cooling) / THERMAL_CAPACITY;
      
      // Apply small random temperature fluctuations
      const tempNoise = (Math.random() - 0.5) * 0.2;
      const newTemp = Math.max(AMBIENT_TEMP, temperature + tempDelta * dt + tempNoise);
      setTemperature(newTemp);
      
      // Exhaust temperature - follows engine power with lag
      // Nonlinear relationship with fuel flow and engine speed
      const targetExhaustTemp = AMBIENT_TEMP + (actualFuelFlow * 3.5 * Math.pow(engineSpeed / NOMINAL_RPM, 1.2));
      const exhaustTempDelta = (targetExhaustTemp - exhaustTemp) / timeConstants.exhaustTemp;
      setExhaustTemp(exhaustTemp + exhaustTempDelta * dt);
      
      // Oil pressure - related to engine speed with some lag
      // Nonlinear relationship with engine speed
      const targetOilPressure = (engineSpeed / 250) * (1 + (engineSpeed / 3000));
      const oilPressureDelta = (targetOilPressure - oilPressure) / timeConstants.oilPressure;
      
      // Add random fluctuations to oil pressure
      const oilPressureNoise = (Math.random() - 0.5) * 0.1;
      setOilPressure(Math.max(0, oilPressure + oilPressureDelta * dt + oilPressureNoise));
      
      // Engine vibration - increases with speed and load imbalance
      // Higher at resonant frequencies (around 30% and 80% of max rpm)
      const baseVibration = (engineSpeed / 500);
      const resonanceEffect = 1 + 2 * Math.exp(-Math.pow((engineSpeed - 450) / 100, 2)) + 
                              3 * Math.exp(-Math.pow((engineSpeed - 1200) / 150, 2));
      
      const loadImbalance = Math.abs(load - loadTarget) / 50;
      const targetVibration = baseVibration * resonanceEffect * (1 + loadImbalance);
      const vibrationDelta = (targetVibration - vibration) / timeConstants.vibration;
      
      // Add random spikes to vibration
      const vibrationNoise = Math.random() < 0.02 ? Math.random() * 2 : 0;
      setVibration(vibration + vibrationDelta * dt + vibrationNoise);
      
      // Dynamic load response
      const targetLoad = engineState === "running" ? loadTarget : 0;
      const loadDelta = (targetLoad - load) / timeConstants.load;
      const newLoad = Math.max(0, load + loadDelta * dt);
      setLoad(newLoad);
      
      // Coolant flow follows target with simple time constant
      const coolantDelta = (coolantFlowTarget - coolantFlow) / 1.0;
      setCoolantFlow(Math.max(0, coolantFlow + coolantDelta * dt));
      
      // Ventilation follows target with simple time constant
      const ventilationDelta = (ventilationTarget - ventilation) / 0.8;
      setVentilation(Math.max(0, ventilation + ventilationDelta * dt));
      
      // Calculate actual electrical and performance outputs
      calculateOutputs(newSpeed, newLoad, actualFuelFlow, newTemp);
      
      // Update historical data for charts (keep last 100 points)
      updateHistoricalData();
    }
  };
  
  // Calculate derived outputs based on primary system variables
  const calculateOutputs = (speed, actuallLoad, actualFuelFlow, temp) => {
    if (speed < 100 || engineState !== "running") {
      // Below minimum operational speed
      setPower(0);
      setFrequency(0);
      setVoltage(0);
      setCurrent(0);
      setFuelConsumption(0);
      setEfficiency(0);
      setEmissions({ co2: 0, nox: 0, particulates: 0 });
      return;
    }
    
    // Basic power calculation based on engine speed and load
    // Consider efficiency drop at non-optimal speeds
    const speedRatio = speed / NOMINAL_RPM;
    const speedEfficiency = 1 - Math.pow(speedRatio - 1, 2) * 0.5;
    
    // Power output calculation
    const rawPower = (speedRatio * actuallLoad / 100) * MAX_POWER;
    const actualPower = rawPower * speedEfficiency;
    setPower(parseFloat(actualPower.toFixed(2)));
    
    // Calculate frequency based on engine speed
    const calculatedFrequency = (speed / NOMINAL_RPM) * 50;
    setFrequency(parseFloat(calculatedFrequency.toFixed(1)));
    
    // Calculate voltage with some variation based on speed and load
    // Voltage regulator tries to maintain nominal voltage
    const speedEffect = (speedRatio - 1) * 10;
    const loadEffect = ((actuallLoad / 100) - 0.5) * 5;
    const calculatedVoltage = 400 + speedEffect + loadEffect;
    setVoltage(parseFloat(calculatedVoltage.toFixed(1)));
    
    // Calculate current based on power and voltage
    const calculatedCurrent = actualPower > 0 ? (actualPower * 1000) / (Math.sqrt(3) * calculatedVoltage) : 0;
    setCurrent(parseFloat(calculatedCurrent.toFixed(1)));
    
    // Calculate fuel consumption from flow rate
    // Adjust for engine speed - more efficient at nominal speed
    const baseConsumption = actualFuelFlow * 5;
    const speedConsumptionFactor = 1 + Math.pow(speedRatio - 1, 2) * 0.3;
    const calculatedConsumption = baseConsumption * speedConsumptionFactor;
    setFuelConsumption(parseFloat(calculatedConsumption.toFixed(1)));
    
    // Calculate efficiency - peak at optimal load and speed
    const loadEfficiency = 1 - Math.pow((actuallLoad - 75) / 100, 2);
    const tempEfficiency = 1 - Math.pow((temp - 85) / 50, 2);
    const calculatedEfficiency = 33 + (loadEfficiency * tempEfficiency * 10);
    setEfficiency(parseFloat(calculatedEfficiency.toFixed(1)));
    
    // Calculate emissions
    // CO2 is directly related to fuel consumption
    const co2 = calculatedConsumption * 2.6;
    
    // NOx increases with temperature and is affected by load
    const noxFactor = Math.pow(temp / 80, 1.5) * (actuallLoad / 60);
    const nox = calculatedConsumption * 0.04 * noxFactor;
    
    // Particulates increase at lower efficiency and higher loads
    const particFactor = Math.pow((100 - calculatedEfficiency) / 30, 1.2) * (actuallLoad / 60);
    const particulates = calculatedConsumption * 0.005 * particFactor;
    
    setEmissions({
      co2: parseFloat(co2.toFixed(1)),
      nox: parseFloat(nox.toFixed(2)),
      particulates: parseFloat(particulates.toFixed(3))
    });
  };
  
  // Update historical data for charts
  const updateHistoricalData = () => {
    const timestamp = simulationTime;
    
    setPowerHistory(prev => {
      const newHistory = [...prev, {time: timestamp, value: power}];
      if (newHistory.length > 100) return newHistory.slice(-100);
      return newHistory;
    });
    
    setRpmHistory(prev => {
      const newHistory = [...prev, {time: timestamp, value: engineSpeed}];
      if (newHistory.length > 100) return newHistory.slice(-100);
      return newHistory;
    });
    
    setTempHistory(prev => {
      const newHistory = [...prev, {time: timestamp, value: temperature}];
      if (newHistory.length > 100) return newHistory.slice(-100);
      return newHistory;
    });
    
    setFuelHistory(prev => {
      const newHistory = [...prev, {time: timestamp, value: fuelFlow}];
      if (newHistory.length > 100) return newHistory.slice(-100);
      return newHistory;
    });
  };
  
  // Update charts
  useEffect(() => {
    if (powerHistory.length > 0 && powerChartRef.current) {
      updateChart(powerChartRef.current, powerHistory, 'steelblue', [0, MAX_POWER]);
    }
    if (tempHistory.length > 0 && temperatureChartRef.current) {
      updateChart(temperatureChartRef.current, tempHistory, 'firebrick', [AMBIENT_TEMP, 120]);
    }
    if (rpmHistory.length > 0 && rpmChartRef.current) {
      updateChart(rpmChartRef.current, rpmHistory, 'green', [0, 1800]);
    }
  }, [powerHistory, tempHistory, rpmHistory]);
  
  // Function to update D3 chart
  const updateChart = (element, data, color, yDomain) => {
    const width = element.clientWidth;
    const height = element.clientHeight;
    const margin = { top: 10, right: 30, bottom: 20, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Clear previous chart
    d3.select(element).selectAll("*").remove();
    
    const svg = d3.select(element)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // X scale based on time
    const xMin = data.length > 0 ? data[0].time : 0;
    const xMax = data.length > 0 ? data[data.length - 1].time : 100;
    
    const x = d3.scaleLinear()
      .domain([Math.max(0, xMax - 60), xMax]) // Show last 60 seconds
      .range([0, innerWidth]);
    
    // Y scale
    const y = d3.scaleLinear()
      .domain(yDomain)
      .range([innerHeight, 0]);
    
    // Define the line
    const line = d3.line()
      .x(d => x(d.time))
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX);
    
    // Add X axis
    svg.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d => `${d.toFixed(0)}s`));
    
    // Add Y axis
    svg.append("g")
      .call(d3.axisLeft(y).ticks(5));
    
    // Add the line path
    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .attr("d", line);
    
    // Add dots for data points
    svg.selectAll(".dot")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", d => x(d.time))
      .attr("cy", d => y(d.value))
      .attr("r", 2)
      .attr("fill", color);
  };
  
  // Animation loop for physics updates
  useEffect(() => {
    const animatePhysics = () => {
      const currentTime = Date.now();
      const deltaTime = currentTime - lastUpdateTime;
      
      // Update physics model
      updatePhysicsModel(deltaTime);
      
      // Update simulation time (convert ms to seconds)
      setSimulationTime(prev => prev + (deltaTime / 1000) * simulationSpeed);
      setLastUpdateTime(currentTime);
      
      // Check for alarms and faults
      checkAlarmsAndFaults();
      
      // Request next frame
      animationFrameRef.current = requestAnimationFrame(animatePhysics);
    };
    
    // Start animation loop
    animationFrameRef.current = requestAnimationFrame(animatePhysics);
    
    // Cleanup on unmount
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [lastUpdateTime, engineState, fuelFlow, engineSpeed, temperature, 
      load, coolantFlow, ventilation, timeConstants, fuelFlowTarget, 
      engineSpeedTarget, loadTarget, coolantFlowTarget, ventilationTarget,
      efficiency, simulationSpeed, sparkPlugs, fuelPumpState]);
  
  // Check for alarms and faults
  const checkAlarmsAndFaults = () => {
    const newAlarms = [];
    const newFaultCodes = [...faultCodes];
    let hasCriticalFault = false;
    
    // Temperature alarms
    if (temperature > 95 && temperature <= 105) {
      newAlarms.push("High Engine Temperature");
    } else if (temperature > 105) {
      newAlarms.push("CRITICAL: Engine Overheating");
      if (!faultCodes.includes("E001")) {
        newFaultCodes.push("E001");
        addStatusMessage("FAULT: Critical engine overheating detected");
      }
      hasCriticalFault = true;
    }
    
    // Load alarms
    if (load > 90 && load <= 95) {
      newAlarms.push("High Load Warning");
    } else if (load > 95) {
      newAlarms.push("CRITICAL: Generator Overload");
      if (!faultCodes.includes("E002")) {
        newFaultCodes.push("E002");
        addStatusMessage("FAULT: Generator overload protection activated");
      }
      hasCriticalFault = true;
    }
    
    // Coolant flow alarms
    if (coolantFlow < 40 && load > 60) {
      newAlarms.push("Low Coolant Flow");
      if (temperature > 90) {
        if (!faultCodes.includes("E003")) {
          newFaultCodes.push("E003");
          addStatusMessage("FAULT: Insufficient cooling at high temperature");
        }
        hasCriticalFault = true;
      }
    }
    
    // Speed alarms
    if (engineSpeed > 1700 && engineSpeed <= 1800) {
      newAlarms.push("Engine Overspeed Warning");
    } else if (engineSpeed > 1800) {
      newAlarms.push("CRITICAL: Engine Overspeed Protection");
      if (!faultCodes.includes("E004")) {
        newFaultCodes.push("E004");
        addStatusMessage("FAULT: Engine overspeed protection activated");
      }
      hasCriticalFault = true;
    }
    
    // Electrical alarms
    if (voltage > 440 || voltage < 380) {
      newAlarms.push("Voltage Out of Range");
    }
    
    if (frequency > 52 || frequency < 48) {
      newAlarms.push("Frequency Out of Range");
    }
    
    // Oil pressure alarm
    if (engineSpeed > 500 && oilPressure < 2) {
      newAlarms.push("CRITICAL: Low Oil Pressure");
      if (!faultCodes.includes("E005")) {
        newFaultCodes.push("E005");
        addStatusMessage("FAULT: Low oil pressure protection activated");
      }
      hasCriticalFault = true;
    }
    
    // Vibration alarm
    if (vibration > 8) {
      newAlarms.push("High Vibration Warning");
      if (vibration > 12) {
        if (!faultCodes.includes("E006")) {
          newFaultCodes.push("E006");
          addStatusMessage("FAULT: Excessive vibration detected");
        }
        hasCriticalFault = true;
      }
    }
    
    // Handle faults
    if (hasCriticalFault && engineState === "running") {
      setEngineState("fault");
      addStatusMessage("System shutting down due to critical fault");
    }
    
    setAlarms(newAlarms);
    setFaultCodes(newFaultCodes);
  };
  
  // Helper to add status messages
  const addStatusMessage = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setStatusMessages(prev => {
      const newMessages = [`${timestamp} - ${message}`, ...prev];
      return newMessages.slice(0, 50); // Keep last 50 messages
    });
  };
  
  // Engine start sequence
  const startEngine = () => {
    if (engineState !== "idle" || !preStartComplete) {
      return;
    }
    
    addStatusMessage("Initiating engine start sequence");
    setEngineState("starting");
    
    // Simulate pre-start sequence
    setTimeout(() => {
      addStatusMessage("Fuel pump engaged");
      setFuelPumpState(true);
    }, 1000);
    
    setTimeout(() => {
      addStatusMessage("Spark plugs activated");
      setSparkPlugs(true);
    }, 2000);
  };
  
  // Engine stop sequence
  const stopEngine = () => {
    if (engineState !== "running") {
      return;
    }
    
    addStatusMessage("Initiating engine shutdown sequence");
    setEngineState("stopping");
    
    // Reset target values
    setFuelFlowTarget(0);
  };
  
  // Handle emergency stop
  const emergencyStop = () => {
    if (engineState === "idle") {
      return;
    }
    
    addStatusMessage("EMERGENCY STOP ACTIVATED");
    setEngineState("stopping");
    setFuelFlowTarget(0);
    setFuelPumpState(false);
  };
  
  // Clear faults
  const clearFaults = () => {
    if (engineState === "fault") {
      setEngineState("idle");
    }
    setFaultCodes([]);
    addStatusMessage("Fault codes cleared");
  };
  
  // Complete pre-start checklist
  const completePreStart = () => {
    setPreStartComplete(true);
    addStatusMessage("Pre-start checklist completed");
  };
  
  // Check if all pre-start items are checked
  useEffect(() => {
    const allChecked = Object.values(preStartItems).every(item => item === true);
    if (allChecked) {
      setPreStartComplete(true);
    } else {
      setPreStartComplete(false);
    }
  }, [preStartItems]);
  
  // Reset simulation
  const resetSimulation = () => {
    // Stop animation loop
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Reset all state values
    setEngineState("idle");
    setSimulationTime(0);
    setLastUpdateTime(Date.now());
    
    // Reset controls
    setFuelFlowTarget(50);
    setEngineSpeedTarget(1500);
    setLoadTarget(60);
    setCoolantFlowTarget(70);
    setVentilationTarget(60);
    
    // Reset actual values
    setFuelFlow(0);
    setEngineSpeed(0);
    setLoad(0);
    setTemperature(AMBIENT_TEMP);
    setCoolantFlow(0);
    setVentilation(0);
    
    // Reset status
    setPower(0);
    setFrequency(0);
    setVoltage(0);
    setCurrent(0);
    setFuelConsumption(0);
    setEfficiency(0);
    setEmissions({ co2: 0, nox: 0, particulates: 0 });
    setOilPressure(0);
    setVibration(0);
    setExhaustTemp(AMBIENT_TEMP);
    setBatteryVoltage(24);
    
    // Reset states
    setSparkPlugs(false);
    setFuelPumpState(false);
    setPreStartComplete(false);
    setPreStartItems({
      fuelCheck: false,
      oilCheck: false,
      coolantCheck: false,
      batteryCheck: false,
      airFilterCheck: false
    });
    
    // Clear history
    setPowerHistory([]);
    setRpmHistory([]);
    setTempHistory([]);
    setFuelHistory([]);
    
    // Clear messages
    setAlarms([]);
    setFaultCodes([]);
    setStatusMessages(['System Reset']);
    
    // Restart animation loop
    animationFrameRef.current = requestAnimationFrame(() => {
      setLastUpdateTime(Date.now());
    });
    
    addStatusMessage("Simulation reset complete");
  };
  
  // Select component for detailed view
  const selectComponent = (component) => {
    setSelectedComponent(component);
    setShowDetails(true);
  };
  
  // Change simulation speed
  const changeSimulationSpeed = (speed) => {
    setSimulationSpeed(speed);
    addStatusMessage(`Simulation speed set to ${speed}x`);
  };
  
  // Toggle pre-start check item
  const togglePreStartItem = (item) => {
    setPreStartItems(prev => ({
      ...prev,
      [item]: !prev[item]
    }));
  };
  
  // Render component details
  const renderComponentDetails = () => {
    if (!selectedComponent) return null;
    
    const details = {
      engine: {
        title: "Diesel Engine",
        specs: [
          "Type: 4-stroke, turbocharged",
          "Cylinders: 6 in-line configuration",
          "Displacement: 12.5 liters",
          "Compression Ratio: 16.5:1",
          "Max Power: 2500 kW @ 1500 RPM",
          "Cooling: Water-cooled with radiator"
        ],
        parameters: [
          { name: "Engine Speed", value: `${engineSpeed.toFixed(0)} RPM` },
          { name: "Temperature", value: `${temperature.toFixed(1)} °C` },
          { name: "Oil Pressure", value: `${oilPressure.toFixed(1)} bar` },
          { name: "Exhaust Temp", value: `${exhaustTemp.toFixed(1)} °C` },
          { name: "Vibration", value: `${vibration.toFixed(2)} mm/s` }
        ]
      },
      generator: {
        title: "Synchronous Generator",
        specs: [
          "Type: 3-phase synchronous",
          "Rated Output: 2300 kVA",
          "Voltage: 400V (line-to-line)",
          "Frequency: 50 Hz",
          "Power Factor: 0.8",
          "Insulation Class: H",
          "Cooling: Air-cooled"
        ],
        parameters: [
          { name: "Power Output", value: `${power.toFixed(1)} kW` },
          { name: "Voltage", value: `${voltage.toFixed(1)} V` },
          { name: "Current", value: `${current.toFixed(1)} A` },
          { name: "Frequency", value: `${frequency.toFixed(2)} Hz` },
          { name: "Load", value: `${load.toFixed(1)}%` }
        ]
      },
      fuelSystem: {
        title: "Fuel System",
        specs: [
          "Fuel Type: Diesel",
          "Tank Capacity: 1000 liters",
          "Injection: Common rail, electronic",
          "Filtration: Dual-stage with water separator",
          "Pump Type: Electric with mechanical backup"
        ],
        parameters: [
          { name: "Fuel Flow", value: `${fuelFlow.toFixed(1)}%` },
          { name: "Consumption", value: `${fuelConsumption.toFixed(1)} L/h` },
          { name: "Pump State", value: fuelPumpState ? "On" : "Off" },
          { name: "Efficiency", value: `${efficiency.toFixed(1)}%` }
        ]
      },
      coolingSystem: {
        title: "Cooling System",
        specs: [
          "Type: Closed-loop liquid cooling",
          "Coolant Capacity: 120 liters",
          "Radiator: Dual-core aluminum",
          "Flow Control: Thermostat with bypass",
          "Pump Type: Centrifugal, belt-driven"
        ],
        parameters: [
          { name: "Coolant Flow", value: `${coolantFlow.toFixed(1)}%` },
          { name: "Temperature", value: `${temperature.toFixed(1)} °C` },
          { name: "Ambient Temp", value: `${AMBIENT_TEMP} °C` }
        ]
      },
      ventilationSystem: {
        title: "Ventilation System",
        specs: [
          "Type: Forced air circulation",
          "Capacity: 15,000 m³/h",
          "Filters: HEPA with pre-filtration",
          "Control: Variable speed with temperature feedback",
          "Power: 7.5 kW total fan capacity"
        ],
        parameters: [
          { name: "Ventilation Rate", value: `${ventilation.toFixed(1)}%` },
          { name: "Room Temperature", value: `${(AMBIENT_TEMP + (temperature-AMBIENT_TEMP)*0.2).toFixed(1)} °C` }
        ]
      },
      controlSystem: {
        title: "Control System",
        specs: [
          "Type: Digital PLC with redundancy",
          "Interface: Touchscreen HMI with remote capabilities",
          "Communication: Modbus TCP/IP, CANbus",
          "Sensors: 24 critical parameter monitors",
          "Safety Systems: Triple redundant emergency shutdown"
        ],
        parameters: [
          { name: "System State", value: engineState },
          { name: "Battery Voltage", value: `${batteryVoltage.toFixed(1)} V` },
          { name: "Active Alarms", value: alarms.length },
          { name: "Fault Codes", value: faultCodes.join(", ") || "None" }
        ]
      }
    };
    
    return (
      <div className="p-4 bg-gray-50 rounded shadow-inner">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">{details[selectedComponent].title}</h3>
          <button 
            onClick={() => setShowDetails(false)}
            className="text-sm bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
          >
            Close
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2">Specifications</h4>
            <ul className="text-sm space-y-1">
              {details[selectedComponent].specs.map((spec, i) => (
                <li key={i}>{spec}</li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">Current Parameters</h4>
            <div className="grid grid-cols-2 gap-2">
              {details[selectedComponent].parameters.map((param, i) => (
                <div key={i} className="bg-gray-100 p-2 rounded">
                  <div className="text-xs text-gray-500">{param.name}</div>
                  <div className="font-medium">{param.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Main render function
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header area with title and main controls */}
      <header className="bg-gradient-to-r from-blue-800 to-indigo-900 text-white p-4 shadow-lg">
        <div className="container mx-auto flex flex-wrap justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center">
            <Zap className="mr-2" />
            Diesel Power Plant Simulator
          </h1>
          
          <div className="flex space-x-2">
            <select
              value={simulationSpeed}
              onChange={(e) => changeSimulationSpeed(parseFloat(e.target.value))}
              className="bg-blue-900 text-white px-2 py-1 rounded border border-blue-700"
            >
              <option value="0.1">0.1x Speed</option>
              <option value="0.5">0.5x Speed</option>
              <option value="1">1x Speed</option>
              <option value="2">2x Speed</option>
              <option value="5">5x Speed</option>
            </select>
            
            <button 
              onClick={resetSimulation} 
              className="bg-blue-700 hover:bg-blue-600 text-white px-3 py-1 rounded flex items-center"
            >
              <Settings className="w-4 h-4 mr-1" />
              Reset
            </button>
            
            <button 
              onClick={emergencyStop}
              className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded flex items-center"
            >
              <AlertTriangle className="w-4 h-4 mr-1" />
              E-Stop
            </button>
          </div>
        </div>
      </header>
      
      {/* Navigation tabs */}
      <div className="bg-gray-200 border-b border-gray-300">
        <div className="container mx-auto">
          <div className="flex">
            <button 
              className={`px-4 py-2 font-medium ${activeTab === 'main' ? 'bg-white border-t-2 border-blue-500' : 'hover:bg-gray-100'}`}
              onClick={() => setActiveTab('main')}
            >
              Main Dashboard
            </button>
            <button 
              className={`px-4 py-2 font-medium ${activeTab === 'controls' ? 'bg-white border-t-2 border-blue-500' : 'hover:bg-gray-100'}`}
              onClick={() => setActiveTab('controls')}
            >
              System Controls
            </button>
            <button 
              className={`px-4 py-2 font-medium ${activeTab === 'trends' ? 'bg-white border-t-2 border-blue-500' : 'hover:bg-gray-100'}`}
              onClick={() => setActiveTab('trends')}
            >
              Trend Analysis
            </button>
            <button 
              className={`px-4 py-2 font-medium ${activeTab === 'logs' ? 'bg-white border-t-2 border-blue-500' : 'hover:bg-gray-100'}`}
              onClick={() => setActiveTab('logs')}
            >
              System Logs
            </button>
          </div>
        </div>
      </div>
      
      {/* Main content area */}
      <main className="flex-grow overflow-auto">
        <div className="container mx-auto p-4">
          {/* Main Dashboard Tab */}
          {activeTab === 'main' && (
            <div className="grid grid-cols-12 gap-4">
              {/* Engine status card */}
              <div className="col-span-12 lg:col-span-4">
                <div className="bg-white rounded-lg shadow p-4 h-full">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-800">Engine Status</h2>
                    <div className={`px-2 py-1 rounded text-sm font-semibold ${
                      engineState === 'running' ? 'bg-green-100 text-green-800' : 
                      engineState === 'starting' ? 'bg-blue-100 text-blue-800' :
                      engineState === 'stopping' ? 'bg-yellow-100 text-yellow-800' :
                      engineState === 'fault' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {engineState.toUpperCase()}
                    </div>
                  </div>
                  
                  {/* Engine animation or diagram */}
                  <div className="bg-gray-100 rounded-lg h-40 mb-4 flex justify-center items-center relative overflow-hidden">
                    {/* Engine visualization */}
                    <div className="engine-block w-32 h-20 bg-gray-700 rounded relative">
                      {/* Piston animation */}
                      <div 
                        className="absolute bg-gray-500 w-8 h-12 rounded"
                        style={{
                          left: '12px',
                          top: `${4 + Math.sin(simulationTime * 10 * (engineSpeed/1000)) * 8}px`,
                          transition: 'top 0.1s ease-in-out',
                          display: engineSpeed > 0 ? 'block' : 'none'
                        }}
                      ></div>
                      
                      {/* Flywheel animation */}
                      <div 
                        className="absolute w-16 h-16 bg-gray-600 rounded-full right-2 top-2"
                        style={{
                          transform: `rotate(${simulationTime * 30 * (engineSpeed/500)}deg)`,
                          transition: 'transform 0.1s linear'
                        }}
                      >
                        <div className="absolute w-14 h-1 bg-gray-800 left-1 top-8"></div>
                      </div>
                      
                      {/* Exhaust animation */}
                      {engineState === 'running' && (
                        <div className="absolute -top-8 left-6">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <div 
                              key={i} 
                              className="absolute bg-gray-300 rounded-full opacity-40"
                              style={{
                                width: `${6 - i * 1.5}px`,
                                height: `${6 - i * 1.5}px`,
                                top: `${i * -8}px`,
                                animation: `float 2s infinite ${i * 0.5}s`
                              }}
                            ></div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Status indicators */}
                    <div className="absolute bottom-2 right-2 flex space-x-2">
                      <div className={`w-3 h-3 rounded-full ${sparkPlugs ? 'bg-yellow-400' : 'bg-gray-400'}`}></div>
                      <div className={`w-3 h-3 rounded-full ${fuelPumpState ? 'bg-blue-400' : 'bg-gray-400'}`}></div>
                    </div>
                  </div>
                  
                  {/* Primary engine metrics */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Engine Speed</div>
                      <div className="text-2xl font-bold text-gray-800">{engineSpeed.toFixed(0)} <span className="text-sm font-normal">RPM</span></div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className={`h-2 rounded-full ${engineSpeed > 1700 ? 'bg-red-500' : engineSpeed > 1400 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${(engineSpeed / 2000) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Temperature</div>
                      <div className="text-2xl font-bold text-gray-800">{temperature.toFixed(1)} <span className="text-sm font-normal">°C</span></div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className={`h-2 rounded-full ${temperature > 95 ? 'bg-red-500' : temperature > 85 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${((temperature - 25) / 100) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Secondary engine metrics */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-xs text-gray-500">Oil Pressure</div>
                      <div className="font-semibold">{oilPressure.toFixed(1)} bar</div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-xs text-gray-500">Exhaust Temp</div>
                      <div className="font-semibold">{exhaustTemp.toFixed(0)} °C</div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-xs text-gray-500">Vibration</div>
                      <div className="font-semibold">{vibration.toFixed(1)} mm/s</div>
                    </div>
                  </div>
                  
                  {/* Engine controls */}
                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={startEngine}
                      disabled={engineState !== 'idle' || !preStartComplete}
                      className={`flex-1 py-2 px-3 rounded-md flex justify-center items-center font-medium
                        ${engineState === 'idle' && preStartComplete ? 
                          'bg-green-500 hover:bg-green-600 text-white' : 
                          'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                    >
                      Start Engine
                    </button>
                    
                    <button
                      onClick={stopEngine}
                      disabled={engineState !== 'running'}
                      className={`flex-1 py-2 px-3 rounded-md flex justify-center items-center font-medium
                        ${engineState === 'running' ? 
                          'bg-red-500 hover:bg-red-600 text-white' : 
                          'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                    >
                      Stop Engine
                    </button>
                  </div>
                  
                  {/* Pre-start checklist if engine is idle */}
                  {engineState === 'idle' && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <h3 className="text-sm font-medium text-blue-800 mb-2">Pre-Start Checklist</h3>
                      <div className="space-y-1">
                        <label className="flex items-center text-sm">
                          <input 
                            type="checkbox" 
                            checked={preStartItems.fuelCheck} 
                            onChange={() => togglePreStartItem('fuelCheck')}
                            className="mr-2"
                          />
                          Fuel level check
                        </label>
                        <label className="flex items-center text-sm">
                          <input 
                            type="checkbox" 
                            checked={preStartItems.oilCheck} 
                            onChange={() => togglePreStartItem('oilCheck')}
                            className="mr-2"
                          />
                          Oil level check
                        </label>
                        <label className="flex items-center text-sm">
                          <input 
                            type="checkbox" 
                            checked={preStartItems.coolantCheck} 
                            onChange={() => togglePreStartItem('coolantCheck')}
                            className="mr-2"
                          />
                          Coolant level check
                        </label>
                        <label className="flex items-center text-sm">
                          <input 
                            type="checkbox" 
                            checked={preStartItems.batteryCheck} 
                            onChange={() => togglePreStartItem('batteryCheck')}
                            className="mr-2"
                          />
                          Battery check
                        </label>
                        <label className="flex items-center text-sm">
                          <input 
                            type="checkbox" 
                            checked={preStartItems.airFilterCheck} 
                            onChange={() => togglePreStartItem('airFilterCheck')}
                            className="mr-2"
                          />
                          Air filter check
                        </label>
                      </div>
                    </div>
                  )}
                  
                  {/* Status message if engine is in other state */}
                  {engineState === 'fault' && (
                    <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100">
                      <div className="flex items-center text-red-800">
                        <AlertTriangle className="w-5 h-5 mr-2" />
                        <span>Fault detected. Clear faults to restart.</span>
                      </div>
                      <button
                        onClick={clearFaults}
                        className="mt-2 w-full py-1 px-3 bg-red-100 hover:bg-red-200 text-red-800 rounded text-sm font-medium"
                      >
                        Clear Faults
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Power generation card */}
              <div className="col-span-12 lg:col-span-4">
                <div className="bg-white rounded-lg shadow p-4 h-full">
                  <h2 className="text-lg font-bold text-gray-800 mb-4">Power Generation</h2>
                  
                  {/* Power chart */}
                  <div className="h-48 bg-gray-50 rounded-lg mb-4" ref={powerChartRef}></div>
                  
                  {/* Primary power metrics */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Power Output</div>
                      <div className="text-2xl font-bold text-blue-600">{power} <span className="text-sm font-normal">kW</span></div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="h-2 rounded-full bg-blue-500"
                          style={{ width: `${(power / MAX_POWER) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Generator Load</div>
                      <div className="text-2xl font-bold text-gray-800">{load.toFixed(0)} <span className="text-sm font-normal">%</span></div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className={`h-2 rounded-full ${load > 90 ? 'bg-red-500' : load > 75 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${load}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Electrical parameters */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-blue-50 p-3 rounded">
                      <div className="text-xs text-blue-800">Voltage</div>
                      <div className="font-semibold text-blue-900">{voltage.toFixed(1)} V</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded">
                      <div className="text-xs text-blue-800">Current</div>
                      <div className="font-semibold text-blue-900">{current.toFixed(1)} A</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded">
                      <div className="text-xs text-blue-800">Frequency</div>
                      <div className="font-semibold text-blue-900">{frequency.toFixed(2)} Hz</div>
                    </div>
                  </div>
                  
                  {/* Power system interactive diagram */}
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Power System</h3>
                    <div className="relative h-40 bg-gray-100 rounded-lg p-2">
                      {/* Engine block */}
                      <div 
                        className="absolute left-4 top-12 w-20 h-16 bg-gray-700 rounded cursor-pointer hover:bg-gray-600"
                        onClick={() => selectComponent('engine')}
                      >
                        <div className="text-xs text-center text-white mt-6">Engine</div>
                      </div>
                      
                      {/* Connection shaft - animated based on engine speed */}
                      <div className="absolute left-24 top-20 w-16 h-2 bg-gray-400">
                        {engineSpeed > 0 && (
                          <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
                            <div 
                              className="h-full bg-gray-600"
                              style={{ 
                                backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 4px, #374151 4px, #374151 8px)',
                                animation: `moveStripes ${10/engineSpeed}s linear infinite`,
                                width: '200%'
                              }}
                            ></div>
                          </div>
                        )}
                      </div>
                      
                      {/* Generator */}
                      <div 
                        className="absolute left-40 top-10 w-24 h-20 bg-blue-600 rounded cursor-pointer hover:bg-blue-500"
                        onClick={() => selectComponent('generator')}
                      >
                        <div className="text-xs text-center text-white mt-8">Generator</div>
                      </div>
                      
                      {/* Power lines */}
                      <div className="absolute left-64 top-18 w-24 h-2 bg-yellow-400"></div>
                      
                      {/* Load/distribution */}
                      <div 
                        className="absolute right-4 top-10 w-20 h-20 bg-green-600 rounded cursor-pointer hover:bg-green-500"
                        onClick={() => selectComponent('controlSystem')}
                      >
                        <div className="text-xs text-center text-white mt-8">Distribution</div>
                      </div>
                      
                      {/* Active power indicator - pulsing when generating */}
                      {power > 0 && (
                        <div 
                          className="absolute left-72 top-14 w-6 h-6 bg-yellow-300 rounded-full animate-pulse opacity-75"
                        ></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Efficiency and system monitoring */}
              <div className="col-span-12 lg:col-span-4">
                <div className="bg-white rounded-lg shadow p-4 h-full">
                  <h2 className="text-lg font-bold text-gray-800 mb-4">System Monitoring</h2>
                  
                  {/* Efficiency metrics */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm text-gray-500">System Efficiency</div>
                    <div className="text-xl font-bold">{efficiency}%</div>
                  </div>
                  
                  <div className="w-full bg-gray-200 h-4 rounded-full mb-6">
                    <div 
                      className="h-4 rounded-full bg-gradient-to-r from-green-500 to-green-300 relative"
                      style={{ width: `${efficiency}%` }}
                    >
                      <div 
                        className="absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-white rounded-full border-2 border-green-500 shadow-sm"
                      ></div>
                    </div>
                  </div>
                  
                  {/* Key monitoring metrics grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="flex justify-between items-center">
                        <div className="text-xs text-gray-500">Fuel Consumption</div>
                        <Fuel className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="font-semibold">{fuelConsumption.toFixed(1)} L/h</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="flex justify-between items-center">
                        <div className="text-xs text-gray-500">Coolant Flow</div>
                        <Droplets className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="font-semibold">{coolantFlow.toFixed(0)}%</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="flex justify-between items-center">
                        <div className="text-xs text-gray-500">Ventilation</div>
                        <Wind className="w-4 h-4 text-teal-500" />
                      </div>
                      <div className="font-semibold">{ventilation.toFixed(0)}%</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="flex justify-between items-center">
                        <div className="text-xs text-gray-500">Battery</div>
                        <div className={`w-4 h-4 rounded-sm ${batteryVoltage > 24 ? 'bg-green-500' : batteryVoltage > 22 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                      </div>
                      <div className="font-semibold">{batteryVoltage.toFixed(1)} V</div>
                    </div>
                  </div>
                  
                  {/* Emissions monitoring */}
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Emissions</h3>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1">CO₂</div>
                        <div className="text-sm font-medium">{emissions.co2} kg/h</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1">NOₓ</div>
                        <div className="text-sm font-medium">{emissions.nox} g/h</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1">PM</div>
                        <div className="text-sm font-medium">{emissions.particulates} g/h</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Alarm status */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Alarms & Status</h3>
                    <div className={`p-3 rounded-lg ${
                      alarms.length > 0 ? 'bg-red-50' : 'bg-green-50'
                    }`}>
                      {alarms.length === 0 ? (
                        <div className="flex items-center text-green-800">
                          <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                          <span className="text-sm">All systems normal</span>
                        </div>
                      ) : (
                        <div className="space-y-1 max-h-24 overflow-y-auto">
                          {alarms.map((alarm, index) => (
                            <div key={index} className="flex items-center text-red-800">
                              <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                              <span className="text-sm">{alarm}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Status messages and logs */}
              <div className="col-span-12">
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold text-gray-800">System Status</h2>
                    <div className="text-sm text-gray-500">Simulation Time: {simulationTime.toFixed(1)}s</div>
                  </div>
                  <div className="bg-gray-100 p-3 rounded-lg h-24 overflow-y-auto text-sm font-mono">
                    {statusMessages.map((msg, index) => (
                      <div key={index} className="pb-1">{msg}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Controls Tab */}
          {activeTab === 'controls' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* System controls */}
              <div className="bg-white rounded-lg shadow p-4 h-full">
                <h2 className="text-lg font-bold text-gray-800 mb-4">System Controls</h2>
                
                {/* Engine speed control */}
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700">Engine Speed (RPM)</label>
                    <span className="text-sm">{engineSpeedTarget}</span>
                  </div>
                  <input
                    type="range"
                    min="800"
                    max="1800"
                    step="10"
                    value={engineSpeedTarget}
                    onChange={(e) => setEngineSpeedTarget(parseInt(e.target.value))}
                    disabled={engineState !== 'running'}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>800</span>
                    <span>1800</span>
                  </div>
                </div>
                
                {/* Load control */}
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700">Generator Load (%)</label>
                    <span className="text-sm">{loadTarget}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={loadTarget}
                    onChange={(e) => setLoadTarget(parseInt(e.target.value))}
                    disabled={engineState !== 'running'}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>
                
                {/* Fuel flow control */}
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700">Fuel Flow Control (%)</label>
                    <span className="text-sm">{fuelFlowTarget}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={fuelFlowTarget}
                    onChange={(e) => setFuelFlowTarget(parseInt(e.target.value))}
                    disabled={engineState !== 'running'}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>
                
                {/* Coolant flow control */}
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700">Coolant Flow (%)</label>
                    <span className="text-sm">{coolantFlowTarget}</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    value={coolantFlowTarget}
                    onChange={(e) => setCoolantFlowTarget(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>20%</span>
                    <span>100%</span>
                  </div>
                </div>
                
                {/* Ventilation control */}
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700">Ventilation Rate (%)</label>
                    <span className="text-sm">{ventilationTarget}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={ventilationTarget}
                    onChange={(e) => setVentilationTarget(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
              
              {/* Component details */}
              <div className="bg-white rounded-lg shadow p-4 h-full">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Component Selector</h2>
                
                {/* Interactive system components */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <button
                    onClick={() => selectComponent('engine')}
                    className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg flex flex-col items-center justify-center"
                  >
                    <Gauge className="w-6 h-6 text-gray-700 mb-1" />
                    <span className="text-sm">Engine</span>
                  </button>
                  
                  <button
                    onClick={() => selectComponent('generator')}
                    className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg flex flex-col items-center justify-center"
                  >
                    <Zap className="w-6 h-6 text-blue-600 mb-1" />
                    <span className="text-sm">Generator</span>
                  </button>
                  
                  <button
                    onClick={() => selectComponent('fuelSystem')}
                    className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg flex flex-col items-center justify-center"
                  >
                    <Fuel className="w-6 h-6 text-yellow-600 mb-1" />
                    <span className="text-sm">Fuel System</span>
                  </button>
                  
                  <button
                    onClick={() => selectComponent('coolingSystem')}
                    className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg flex flex-col items-center justify-center"
                  >
                    <Thermometer className="w-6 h-6 text-blue-600 mb-1" />
                    <span className="text-sm">Cooling</span>
                  </button>
                  
                  <button
                    onClick={() => selectComponent('ventilationSystem')}
                    className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg flex flex-col items-center justify-center"
                  >
                    <Wind className="w-6 h-6 text-teal-600 mb-1" />
                    <span className="text-sm">Ventilation</span>
                  </button>
                  
                  <button
                    onClick={() => selectComponent('controlSystem')}
                    className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg flex flex-col items-center justify-center"
                  >
                    <Settings className="w-6 h-6 text-indigo-600 mb-1" />
                    <span className="text-sm">Controls</span>
                  </button>
                </div>
                
                {/* Component details display */}
                {showDetails ? (
                  renderComponentDetails()
                ) : (
                  <div className="bg-gray-100 p-6 rounded-lg text-center text-gray-500">
                    <Info className="w-8 h-8 mx-auto mb-2" />
                    <p>Select a component to view details</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Trend Analysis Tab */}
          {activeTab === 'trends' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* RPM trend */}
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-bold text-gray-800 mb-2">Engine Speed Trend</h2>
                <div className="h-64 bg-gray-50 rounded-lg" ref={rpmChartRef}></div>
              </div>
              
              {/* Temperature trend */}
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-bold text-gray-800 mb-2">Temperature Trend</h2>
                <div className="h-64 bg-gray-50 rounded-lg" ref={temperatureChartRef}></div>
              </div>
              
              {/* Power vs Efficiency */}
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-bold text-gray-800 mb-2">Power vs Efficiency</h2>
                <div className="h-64 bg-gray-50 rounded-lg">
                  <div className="flex h-full items-center justify-center text-gray-400">
                    Advanced chart visualization will render here
                  </div>
                </div>
                <div className="flex justify-between mt-2 text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
                    <span>Power</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                    <span>Efficiency</span>
                  </div>
                </div>
              </div>
              
              {/* Fuel consumption */}
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-bold text-gray-800 mb-2">Fuel Consumption Analysis</h2>
                <div className="h-64 bg-gray-50 rounded-lg">
                  <div className="flex h-full items-center justify-center text-gray-400">
                    Fuel trend chart will render here
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* System Logs Tab */}
          {activeTab === 'logs' && (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800">System Logs</h2>
                <div className="space-x-2">
                  <button className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-sm rounded">
                    Export
                  </button>
                  <button 
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-sm rounded"
                    onClick={() => setStatusMessages(['System logs cleared'])}
                  >
                    Clear
                  </button>
                </div>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Event
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {statusMessages.map((message, index) => {
                      // Extract timestamp if message has one
                      const parts = message.split(' - ');
                      const timestamp = parts.length > 1 ? parts[0] : "—";
                      const content = parts.length > 1 ? parts[1] : message;
                      const isFault = content.includes('FAULT') || content.includes('EMERGENCY');
                      const isWarning = content.includes('Warning') || content.includes('warning');
                      
                      return (
                        <tr key={index}>
                          <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">
                            {timestamp}
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                            {content}
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                              ${isFault ? 'bg-red-100 text-red-800' : 
                                isWarning ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}
                            >
                              {isFault ? 'Error' : isWarning ? 'Warning' : 'Info'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Fault codes section */}
              {faultCodes.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-medium text-gray-700 mb-2">Active Fault Codes</h3>
                  <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                    <ul className="list-disc pl-5 space-y-1">
                      {faultCodes.map((code, index) => (
                        <li key={index} className="text-sm text-red-800">
                          <span className="font-mono">{code}</span> - {getFaultDescription(code)}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={clearFaults}
                      className="mt-2 w-full py-1.5 bg-white text-red-700 border border-red-300 rounded text-sm font-medium hover:bg-red-50"
                    >
                      Reset Fault Codes
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      
      {/* Footer area */}
      <footer className="bg-gray-800 text-gray-300 py-2 px-4 text-center text-sm">
        Diesel Power Plant Simulator &copy; {new Date().getFullYear()} | Simulation Time: {simulationTime.toFixed(1)}s | Engine Status: {engineState.toUpperCase()}
      </footer>
      
      {/* Global CSS for animations */}
      <style jsx global>{`
        @keyframes float {
          0% { transform: translateY(0px); opacity: 0.8; }
          100% { transform: translateY(-20px); opacity: 0; }
        }
        
        @keyframes moveStripes {
          0% { transform: translateX(0); }
          100% { transform: translateX(-8px); }
        }
      `}</style>
    </div>
  );
  
  // Helper function to get fault descriptions
  function getFaultDescription(code: string) {
      const descriptions = {
        'E001': 'Critical engine overheating',
        'E002': 'Generator overload protection',
        'E003': 'Insufficient cooling flow',
        'E004': 'Engine overspeed protection',
        'E005': 'Low oil pressure protection',
        'E006': 'Excessive vibration detected',
      };
      
      return descriptions[code as any] || 'Unknown fault';
  }
}

