import React, { useEffect, useRef } from 'react';

const FluidVisualizer = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;
        let time = 0;

        const resize = () => {
            const parent = canvas.parentElement;
            if (parent) {
                // Double resolution for retina displays
                canvas.width = parent.offsetWidth * 2;
                canvas.height = parent.offsetHeight * 2;
                canvas.style.width = `${parent.offsetWidth}px`;
                canvas.style.height = `${parent.offsetHeight}px`;
                ctx.scale(2, 2);
            }
        };

        window.addEventListener('resize', resize);
        resize();

        // "Volumetric" Ribbons Configuration
        // Using multiple layers for each color to create depth
        const waves = [
            // Electric Cyan Layer
            { color: 'rgba(0, 255, 255, 0.1)', speed: 0.02, amplitude: 50, frequency: 0.01, offset: 0, thickness: 30 },
            { color: 'rgba(0, 255, 255, 0.2)', speed: 0.02, amplitude: 40, frequency: 0.01, offset: 0.5, thickness: 15 },

            // Magenta Layer
            { color: 'rgba(255, 0, 255, 0.08)', speed: 0.03, amplitude: 45, frequency: 0.015, offset: 2, thickness: 35 },
            { color: 'rgba(255, 0, 255, 0.15)', speed: 0.03, amplitude: 35, frequency: 0.015, offset: 2.5, thickness: 18 },

            // Violet Layer
            { color: 'rgba(138, 43, 226, 0.1)', speed: 0.015, amplitude: 60, frequency: 0.008, offset: 4, thickness: 40 },
            { color: 'rgba(138, 43, 226, 0.2)', speed: 0.015, amplitude: 50, frequency: 0.008, offset: 4.5, thickness: 20 },

            // Core White/Blue Hotspot
            { color: 'rgba(200, 230, 255, 0.3)', speed: 0.04, amplitude: 20, frequency: 0.02, offset: 1, thickness: 10 },
        ];

        const particles = Array.from({ length: 60 }, () => ({
            x: Math.random() * (canvas.width / 2),
            y: Math.random() * (canvas.height / 2),
            size: Math.random() * 3, // Larger particles
            speedX: (Math.random() - 0.5) * 0.8,
            speedY: (Math.random() - 0.5) * 0.8,
            opacity: Math.random(),
            pulseSpeed: 0.02 + Math.random() * 0.05,
            color: Math.random() > 0.5 ? 'rgba(0, 255, 255,' : 'rgba(255, 0, 255,' // Cyan or Magenta particles
        }));

        const drawWave = (wave, t) => {
            ctx.beginPath();
            const width = canvas.width / 2;
            const height = canvas.height / 2;

            // Draw a smooth curve
            for (let x = 0; x <= width; x += 5) {
                const y = height / 2 +
                    Math.sin(x * wave.frequency + t * wave.speed + wave.offset) * wave.amplitude * Math.sin(t * 0.5 + wave.offset) +
                    Math.cos(x * wave.frequency * 0.5 + t * wave.speed) * (wave.amplitude * 0.5);

                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }

            // Volumetric Glow Effect
            ctx.strokeStyle = wave.color;
            ctx.lineWidth = wave.thickness;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Intense Bloom
            ctx.shadowBlur = wave.thickness * 1.5;
            ctx.shadowColor = wave.color;

            ctx.stroke();

            // Draw a thinner, brighter core for the "liquid" look
            ctx.lineWidth = wave.thickness * 0.3;
            ctx.strokeStyle = wave.color.replace('0.1', '0.5').replace('0.2', '0.6').replace('0.08', '0.4'); // Brighter core
            ctx.shadowBlur = 10;
            ctx.stroke();

            ctx.shadowBlur = 0;
        };

        const render = () => {
            time += 0.04;
            const width = canvas.width / 2;
            const height = canvas.height / 2;

            ctx.clearRect(0, 0, width, height);

            // "Lighter" blend mode creates the bioluminescent additive glow
            ctx.globalCompositeOperation = 'lighter';

            waves.forEach(wave => drawWave(wave, time));

            // Draw Magical Dust
            particles.forEach(p => {
                p.x += p.speedX;
                p.y += p.speedY;
                p.opacity += Math.sin(time * p.pulseSpeed) * 0.03;

                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;

                ctx.beginPath();
                // Dynamic opacity for twinkling
                const currentOpacity = Math.max(0, Math.min(0.8, p.opacity));
                ctx.fillStyle = `${p.color} ${currentOpacity})`;
                ctx.shadowBlur = 10;
                ctx.shadowColor = p.color + ' 1)';
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });

            ctx.globalCompositeOperation = 'source-over';
            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return <canvas ref={canvasRef} className="w-full h-full block" />;
};

export { FluidVisualizer };
