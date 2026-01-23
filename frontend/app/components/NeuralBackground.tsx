'use client';

import { useEffect, useRef, useCallback } from 'react';

interface Neuron {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    energy: number; // 0 to 1, brightness
    params: {
        baseRadius: number;
    };
}

interface Pulse {
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    progress: number;
    speed: number;
    active: boolean;
}

export default function NeuralBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef({ x: 0, y: 0 });
    const neuronsRef = useRef<Neuron[]>([]);
    const pulsesRef = useRef<Pulse[]>([]);
    const animationRef = useRef<number>();

    const CONFIG = {
        neuronCount: 80,
        connectionDist: 180,
        pulseChance: 0.005, // Chance per frame to fire naturally
        mouseDist: 250,
        colors: {
            bg1: '#020617', // Slate 950
            bg2: '#0f172a', // Slate 900
            node: 'rgba(56, 189, 248, 1)', // Sky Blue
            nodeActive: 'rgba(168, 85, 247, 1)', // Purple
            line: 'rgba(99, 102, 241, 0.1)', // Indigo (dim)
            pulse: 'rgba(45, 212, 191, 0.8)', // Teal (bright)
        }
    };

    const initNetwork = useCallback((width: number, height: number) => {
        const neurons: Neuron[] = [];
        // Density based on screen size
        const count = Math.floor((width * height) / 15000);

        for (let i = 0; i < count; i++) {
            const r = Math.random() * 2 + 1.5;
            neurons.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                radius: r,
                energy: 0,
                params: { baseRadius: r }
            });
        }
        neuronsRef.current = neurons;
        pulsesRef.current = [];
    }, []);

    const drawNetwork = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const neurons = neuronsRef.current;
        const pulses = pulsesRef.current;
        const mouse = mouseRef.current;

        ctx.clearRect(0, 0, width, height);

        // Dark Bio-Tech Background
        const bgGradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width);
        bgGradient.addColorStop(0, CONFIG.colors.bg2);
        bgGradient.addColorStop(1, CONFIG.colors.bg1);
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);

        // Update Neurons
        neurons.forEach((neuron, i) => {
            // Movement
            neuron.x += neuron.vx;
            neuron.y += neuron.vy;

            // Bounce
            if (neuron.x < 0 || neuron.x > width) neuron.vx *= -1;
            if (neuron.y < 0 || neuron.y > height) neuron.vy *= -1;

            // Energy decay
            neuron.energy *= 0.95;

            // Mouse Interaction: "Excitation"
            const dx = mouse.x - neuron.x;
            const dy = mouse.y - neuron.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < CONFIG.mouseDist) {
                // Closer = more energy
                neuron.energy = Math.min(1, neuron.energy + 0.05);

                // Attraction (Synapse forming)
                const force = (CONFIG.mouseDist - dist) / CONFIG.mouseDist;
                neuron.x += dx * force * 0.01;
                neuron.y += dy * force * 0.01;

                // Chance to spawn pulse if excited
                if (Math.random() < 0.1) {
                    // Find neighbor
                    const targets = neurons.filter(n => {
                        const d = Math.hypot(n.x - neuron.x, n.y - neuron.y);
                        return d < CONFIG.connectionDist && d > 0;
                    });
                    if (targets.length > 0) {
                        const target = targets[Math.floor(Math.random() * targets.length)];
                        pulses.push({
                            x: neuron.x,
                            y: neuron.y,
                            targetX: target.x,
                            targetY: target.y,
                            progress: 0,
                            speed: 0.05 + Math.random() * 0.05,
                            active: true
                        });
                    }
                }
            }

            // Natural Pulse spawn
            if (Math.random() < CONFIG.pulseChance) {
                neuron.energy = 1; // Flash
            }

            // Draw Connections
            for (let j = i + 1; j < neurons.length; j++) {
                const other = neurons[j];
                const ddx = neuron.x - other.x;
                const ddy = neuron.y - other.y;
                const distance = Math.sqrt(ddx * ddx + ddy * ddy);

                if (distance < CONFIG.connectionDist) {
                    const opacity = (1 - distance / CONFIG.connectionDist) * 0.3;
                    ctx.beginPath();
                    ctx.moveTo(neuron.x, neuron.y);
                    ctx.lineTo(other.x, other.y);
                    ctx.strokeStyle = CONFIG.colors.line;
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    // Active connection glow if either node is energetic
                    if (neuron.energy > 0.1 || other.energy > 0.1) {
                        const activeOpacity = Math.max(neuron.energy, other.energy) * opacity;
                        ctx.strokeStyle = `rgba(168, 85, 247, ${activeOpacity})`;
                        ctx.stroke();
                    }
                }
            }
        });

        // Update and Draw Pulses (Signals)
        for (let i = pulses.length - 1; i >= 0; i--) {
            const p = pulses[i];
            p.progress += p.speed;

            if (p.progress >= 1) {
                pulses.splice(i, 1);
                continue;
            }

            const currX = p.x + (p.targetX - p.x) * p.progress;
            const currY = p.y + (p.targetY - p.y) * p.progress;

            ctx.beginPath();
            ctx.arc(currX, currY, 2, 0, Math.PI * 2);
            ctx.fillStyle = CONFIG.colors.pulse;
            ctx.shadowBlur = 8;
            ctx.shadowColor = CONFIG.colors.pulse;
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Draw Nodes last (on top)
        neurons.forEach(neuron => {
            const baseSize = neuron.params.baseRadius;
            const size = baseSize + (neuron.energy * 3); // Grow when active

            ctx.beginPath();
            ctx.arc(neuron.x, neuron.y, size, 0, Math.PI * 2);

            // Interpolate color from Blue to Purple based on energy
            if (neuron.energy > 0.5) {
                ctx.fillStyle = CONFIG.colors.nodeActive;
                ctx.shadowBlur = 15 * neuron.energy;
                ctx.shadowColor = CONFIG.colors.nodeActive;
            } else {
                ctx.fillStyle = CONFIG.colors.node;
                ctx.shadowBlur = 0;
            }

            ctx.fill();
        });

    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initNetwork(canvas.width, canvas.height);
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', handleMouseMove);

        const animate = () => {
            drawNetwork(ctx, canvas.width, canvas.height);
            animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [initNetwork, drawNetwork]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none -z-10"
        />
    );
}
