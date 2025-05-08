import { useEffect, useRef } from 'react';
import { useEngineStore } from '@/lib/Engine';

export function useEngineSimulation() {
    const animationRef = useRef<number | null>(null);
    const lastUpdateTimeRef = useRef<number>(0);

    const {
        running,
        simulationSpeed,
        updateSimulation,
    } = useEngineStore();

    useEffect(() => {
        if (!running) {
            if (animationRef.current !== null) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }
            return;
        }

        const updateLoop = (timestamp: number) => {
            if (!lastUpdateTimeRef.current) {
                lastUpdateTimeRef.current = timestamp;
            }

            const deltaTimeMs = timestamp - lastUpdateTimeRef.current;
            const deltaTime = (deltaTimeMs / 1000) * simulationSpeed; // Convert to seconds and apply speed

            updateSimulation(deltaTime);
            lastUpdateTimeRef.current = timestamp;

            animationRef.current = requestAnimationFrame(updateLoop);
        };

        animationRef.current = requestAnimationFrame(updateLoop);

        return () => {
            if (animationRef.current !== null) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }
        };
    }, [running, simulationSpeed, updateSimulation]);

    return useEngineStore();
}