//import DieselPowerPlantSimulator from './Similator'
//import DieselPowerPlantSimulation from "./Simulator3";
import "./App.css";
import DieselPlantSimulator from "./components/diesel-plant-simulator";

function App() {
  return (
    <>
      {/* <DieselPowerPlantSimulation /> */}

      <main className="min-h-screen bg-background !w-full text-foreground">
        <DieselPlantSimulator />
      </main>
    </>
  );
}

export default App;
