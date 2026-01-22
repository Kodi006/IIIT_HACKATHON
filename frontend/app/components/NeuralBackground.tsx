'use client';

import { useEffect, useRef, useCallback } from 'react';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    color: string;
}

export default function NeuralBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef({ x: 0, y: 0 });
    const particlesRef = useRef<Particle[]>([]);
    const animationRef = useRef<number>();

    const colors = [
        'rgba(45, 212, 191, 0.6)',   // Teal (Medical/Success)
        'rgba(56, 189, 248, 0.6)',   // Light Blue (Tech)
        'rgba(99, 102, 241, 0.6)',   // Indigo (Depth)
        'rgba(168, 85, 247, 0.5)',   // Purple (AI)
        'rgba(255, 255, 255, 0.4)',  // White (Data points)
    ];

    const initParticles = useCallback((width: number, height: number) => {
        const particleCount = Math.floor((width * height) / 10000); // Slightly more density
        const particles: Particle[] = [];

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.3, // Slower, calmer movement
                vy: (Math.random() - 0.5) * 0.3,
                radius: Math.random() * 2 + 1,
                color: colors[Math.floor(Math.random() * colors.length)],
            });
        }

        particlesRef.current = particles;
    }, []);

    const drawParticles = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const particles = particlesRef.current;
        const mouse = mouseRef.current;
        const connectionDistance = 150;
        const mouseConnectionDistance = 200;

        // Clear canvas completely to show background layers
        ctx.clearRect(0, 0, width, height);

        // Update and draw particles
        particles.forEach((particle, i) => {
            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;

            // Bounce off edges
            if (particle.x < 0 || particle.x > width) particle.vx *= -1;
            if (particle.y < 0 || particle.y > height) particle.vy *= -1;

            // Mouse interaction - particles get attracted slightly
            const dx = mouse.x - particle.x;
            const dy = mouse.y - particle.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < mouseConnectionDistance && dist > 0) {
                const force = (mouseConnectionDistance - dist) / mouseConnectionDistance;
                particle.vx += (dx / dist) * force * 0.02;
                particle.vy += (dy / dist) * force * 0.02;

                // Draw line to mouse
                ctx.beginPath();
                ctx.moveTo(particle.x, particle.y);
                ctx.lineTo(mouse.x, mouse.y);
                ctx.strokeStyle = `rgba(168, 85, 247, ${force * 0.3})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // Limit velocity
            const maxVel = 1;
            particle.vx = Math.max(-maxVel, Math.min(maxVel, particle.vx));
            particle.vy = Math.max(-maxVel, Math.min(maxVel, particle.vy));

            // Draw connections to nearby particles
            for (let j = i + 1; j < particles.length; j++) {
                const other = particles[j];
                const ddx = particle.x - other.x;
                const ddy = particle.y - other.y;
                const distance = Math.sqrt(ddx * ddx + ddy * ddy);

                if (distance < connectionDistance) {
                    const opacity = (1 - distance / connectionDistance) * 0.4;
                    ctx.beginPath();
                    ctx.moveTo(particle.x, particle.y);
                    ctx.lineTo(other.x, other.y);
                    ctx.strokeStyle = `rgba(99, 102, 241, ${opacity})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }

            // Draw particle with glow
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            ctx.fillStyle = particle.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = particle.color;
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        // Draw mouse glow
        if (mouse.x > 0 && mouse.y > 0) {
            const gradient = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 100);
            gradient.addColorStop(0, 'rgba(168, 85, 247, 0.15)');
            gradient.addColorStop(1, 'rgba(168, 85, 247, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(mouse.x, mouse.y, 100, 0, Math.PI * 2);
            ctx.fill();
        }
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initParticles(canvas.width, canvas.height);
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };

        const handleMouseLeave = () => {
            mouseRef.current = { x: 0, y: 0 };
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);

        const animate = () => {
            drawParticles(ctx, canvas.width, canvas.height);
            animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [initParticles, drawParticles]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none -z-10"
        />
    );
}
