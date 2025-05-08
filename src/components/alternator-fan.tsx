import { useState, useEffect } from "react";

export default function Alternator({ rpmSpeed }: { rpmSpeed: number }) {
  const [rpm, setRpm] = useState(rpmSpeed);
  const [rotation, setRotation] = useState(0);
  const [isRunning, setIsRunning] = useState(true);

  // Calculate rotation speed in degrees per frame (assuming 60fps)
  // RPM = revolutions per minute
  // 1 revolution = 360 degrees
  // So RPM * 360 = degrees per minute
  // degrees per minute / 60 = degrees per second
  // degrees per second / 60 = degrees per frame (at 60fps)
  const degreesPerFrame = (rpm * 360) / (60 * 60);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setRotation((prev) => (prev + degreesPerFrame) % 360);
    }, 1000 / 60); // Targeting 60fps

    return () => clearInterval(interval);
  }, [rpm, isRunning, degreesPerFrame]);


  return (
    <div className="relative w-16 h-16">
      {/* Alternator Base */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-4 h-4 bg-gray-800 rounded-full z-10"></div>
        <div className="absolute w-6 h-6 border-2 border-gray-600 rounded-full"></div>
      </div>

      {/* Alternator Rotor */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: isRunning ? "none" : "transform 0.5s ease-out",
        }}
      >
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <div
            key={angle}
            className="absolute bg-amber-800 rounded-lg"
            style={{
              width: "3px",
              height: "28px",
              left: "calc(50% - 1.5px)",
              top: "calc(50% - 28px)",
              transformOrigin: "bottom center",
              transform: `rotate(${angle}deg)`,
            }}
          ></div>
        ))}
      </div>
    </div>
  );
}
