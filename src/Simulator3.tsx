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

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Diesel Power Plant Simulation</h1>
          <div className="flex justify-between items-center mt-2">
            <div className="text-sm text-gray-600">
              Simulation Time: {simulationTime.toFixed(1)}s | Speed: {simulationSpeed}x
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={() => changeSimulationSpeed(1)}
                className={`px-2 py-1 text-sm rounded ${simulationSpeed === 1 ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                1x
              </button>
              <button 
                onClick={() => changeSimulationSpeed(2)}
                className={`px-2 py-1 text-sm rounded ${simulationSpeed === 2 ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                2x
              </button>
              <button 
                onClick={() => changeSimulationSpeed(5)}
                className={`px-2 py-1 text-sm rounded ${simulationSpeed === 5 ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                5x
              </button>
              <button 
                onClick={resetSimulation}
                className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
              >
                Reset
              </button>
            </div>
          </div>
        </header>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Controls and status */}
          <div className="space-y-6">
            {/* Engine control panel */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Activity className="mr-2" /> Engine Control
              </h2>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-500">Engine State</div>
                  <div className="text-lg font-bold capitalize">{engineState}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-500">Battery Voltage</div>
                  <div className="text-lg font-bold">{batteryVoltage.toFixed(1)} V</div>
                </div>
              </div>
              
              <div className="space-y-3">
                {engineState === "idle" && (
                  <button
                    onClick={startEngine}
                    disabled={!preStartComplete}
                    className={`w-full py-2 rounded font-medium ${preStartComplete ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                  >
                    {preStartComplete ? "Start Engine" : "Complete Pre-Start Checklist"}
                  </button>
                )}
                
                {engineState === "running" && (
                  <button
                    onClick={stopEngine}
                    className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded font-medium"
                  >
                    Normal Shutdown
                  </button>
                )}
                
                {(engineState === "starting" || engineState === "running" || engineState === "fault") && (
                  <button
                    onClick={emergencyStop}
                    className="w-full py-2 bg-red-500 hover:bg-red-600 text-white rounded font-medium"
                  >
                    Emergency Stop
                  </button>
                )}
                
                {engineState === "fault" && (
                  <button
                    onClick={clearFaults}
                    className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium"
                  >
                    Clear Faults
                  </button>
                )}
              </div>
            </div>

            {/* Pre-start checklist */}
            {engineState === "idle" && (
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <Info className="mr-2" /> Pre-Start Checklist
                </h2>
                
                <div className="space-y-2">
                  {Object.entries(preStartItems).map(([key, value]) => (
                    <div key={key} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={() => togglePreStartItem(key)}
                        id={key}
                        className="mr-2 h-4 w-4"
                      />
                      <label htmlFor={key} className="capitalize">
                        {key.replace('Check', '')}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* System parameters */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Settings className="mr-2" /> System Parameters
              </h2>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Flow</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={fuelFlowTarget}
                    onChange={(e) => setFuelFlowTarget(parseInt(e.target.value))}
                    disabled={engineState !== "running"}
                    className="w-full"
                  />
                  <div className="text-right text-sm">{fuelFlowTarget}%</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Engine Speed</label>
                  <input
                    type="range"
                    min="1200"
                    max="1800"
                    step="10"
                    value={engineSpeedTarget}
                    onChange={(e) => setEngineSpeedTarget(parseInt(e.target.value))}
                    disabled={engineState !== "running"}
                    className="w-full"
                  />
                  <div className="text-right text-sm">{engineSpeedTarget} RPM</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Generator Load</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={loadTarget}
                    onChange={(e) => setLoadTarget(parseInt(e.target.value))}
                    disabled={engineState !== "running"}
                    className="w-full"
                  />
                  <div className="text-right text-sm">{loadTarget}%</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Coolant Flow</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={coolantFlowTarget}
                    onChange={(e) => setCoolantFlowTarget(parseInt(e.target.value))}
                    disabled={engineState === "idle"}
                    className="w-full"
                  />
                  <div className="text-right text-sm">{coolantFlowTarget}%</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ventilation</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={ventilationTarget}
                    onChange={(e) => setVentilationTarget(parseInt(e.target.value))}
                    disabled={engineState === "idle"}
                    className="w-full"
                  />
                  <div className="text-right text-sm">{ventilationTarget}%</div>
                </div>
              </div>
            </div>
          </div>

          {/* Middle column - Main indicators and charts */}
          <div className="space-y-6">
            {/* System overview */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Gauge className="mr-2" /> System Overview
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div 
                  className="bg-gray-50 p-3 rounded cursor-pointer hover:bg-gray-100"
                  onClick={() => selectComponent('engine')}
                >
                  <div className="text-sm text-gray-500">Engine Speed</div>
                  <div className="text-xl font-bold">{engineSpeed.toFixed(0)} RPM</div>
                </div>
                
                <div 
                  className="bg-gray-50 p-3 rounded cursor-pointer hover:bg-gray-100"
                  onClick={() => selectComponent('generator')}
                >
                  <div className="text-sm text-gray-500">Power Output</div>
                  <div className="text-xl font-bold">{power.toFixed(1)} kW</div>
                </div>
                
                <div 
                  className="bg-gray-50 p-3 rounded cursor-pointer hover:bg-gray-100"
                  onClick={() => selectComponent('generator')}
                >
                  <div className="text-sm text-gray-500">Generator Load</div>
                  <div className="text-xl font-bold">{load.toFixed(1)}%</div>
                </div>
                
                <div 
                  className="bg-gray-50 p-3 rounded cursor-pointer hover:bg-gray-100"
                  onClick={() => selectComponent('engine')}
                >
                  <div className="text-sm text-gray-500">Temperature</div>
                  <div className="text-xl font-bold">{temperature.toFixed(1)} °C</div>
                </div>
                
                <div 
                  className="bg-gray-50 p-3 rounded cursor-pointer hover:bg-gray-100"
                  onClick={() => selectComponent('fuelSystem')}
                >
                  <div className="text-sm text-gray-500">Fuel Consumption</div>
                  <div className="text-xl font-bold">{fuelConsumption.toFixed(1)} L/h</div>
                </div>
                
                <div 
                  className="bg-gray-50 p-3 rounded cursor-pointer hover:bg-gray-100"
                  onClick={() => selectComponent('generator')}
                >
                  <div className="text-sm text-gray-500">Efficiency</div>
                  <div className="text-xl font-bold">{efficiency.toFixed(1)}%</div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <BarChart2 className="mr-2" /> Performance Trends
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-1">Power Output (kW)</h3>
                  <div ref={powerChartRef} className="h-40 w-full"></div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-1">Engine Speed (RPM)</h3>
                  <div ref={rpmChartRef} className="h-40 w-full"></div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-1">Temperature (°C)</h3>
                  <div ref={temperatureChartRef} className="h-40 w-full"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Right column - Alarms and status */}
          <div className="space-y-6">
            {/* Alarms */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <AlertTriangle className="mr-2" /> Alarms
              </h2>
              
              {alarms.length > 0 ? (
                <ul className="space-y-2">
                  {alarms.map((alarm, i) => (
                    <li key={i} className="text-sm p-2 bg-red-50 text-red-700 rounded">
                      {alarm}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-gray-500 p-2 bg-green-50 text-green-700 rounded">
                  No active alarms
                </div>
              )}
            </div>

            {/* Status messages */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Info className="mr-2" /> Status Messages
              </h2>
              
              <div className="h-64 overflow-y-auto">
                {statusMessages.map((message, i) => (
                  <div key={i} className="text-sm p-1 border-b border-gray-100">
                    {message}
                  </div>
                ))}
              </div>
            </div>

            {/* Emissions */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Cloud className="mr-2" /> Emissions
              </h2>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-50 p-2 rounded">
                  <div className="text-xs text-gray-500">CO₂</div>
                  <div className="font-medium">{emissions.co2} kg/h</div>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <div className="text-xs text-gray-500">NOx</div>
                  <div className="font-medium">{emissions.nox} kg/h</div>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <div className="text-xs text-gray-500">Particulates</div>
                  <div className="font-medium">{emissions.particulates} kg/h</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Component details modal */}
        {showDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              {renderComponentDetails()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

