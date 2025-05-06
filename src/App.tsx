import DieselPowerPlantSimulator1 from './Similator'
import DieselPowerPlantSimulator2 from "./Simulator2";
import DieselPowerPlantSimulator3 from "./Simulator3";

import "./App.css";
import DieselPlantSimulator from "./components/diesel-plant-simulator";

function App() {
  return (
    <>
      {/* <DieselPowerPlantSimulation /> */}

      <main className="min-h-screen bg-background !w-full text-foreground">
        <DieselPlantSimulator />

        {/* <DieselPowerPlantSimulator1 />
        <DieselPowerPlantSimulator2 />
        <DieselPowerPlantSimulator3 /> */}
      </main>
    </>
  );
}

export default App;
