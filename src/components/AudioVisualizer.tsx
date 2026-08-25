import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../services/audioEngine';

interface AudioVisualizerProps {
  isPlaying: boolean;
  isDJSpeaking: boolean;
  color?: string;
  height?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying,
  isDJSpeaking,
  color = '#a855f7',
  height = 56,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const width = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, width, h);

      const analyser = audioEngine.getAnalyser();
      const bufferLength = analyser ? analyser.frequencyBinCount : 64;
      const dataArray = new Uint8Array(bufferLength);

      if (analyser && (isPlaying || isDJSpeaking)) {
        analyser.getByteFrequencyData(dataArray);
      }

      // Draw sleek vertical equalizer bars matching design theme
      const barCount = 28;
      const spacing = 4;
      const totalBarWidth = (width - (barCount - 1) * spacing) / barCount;
      const barWidth = Math.max(3, totalBarWidth);

      for (let i = 0; i < barCount; i++) {
        let value = 0;
        if (analyser && (isPlaying || isDJSpeaking)) {
          const sampleIdx = Math.floor((i / barCount) * (bufferLength / 2.5));
          value = dataArray[sampleIdx] || 0;
        } else {
          // Subtle gentle resting rhythm
          value = Math.sin(Date.now() * 0.003 + i * 0.4) * 8 + 12;
        }

        if (isDJSpeaking) {
          value = Math.min(255, value * 1.35 + 25);
        }

        const barHeight = Math.max(4, (value / 255) * (h - 10));
        const x = i * (barWidth + spacing);
        const y = (h - barHeight) / 2;

        // Gradient: purple to pink or bright white when DJ speaks
        if (isDJSpeaking) {
          ctx.fillStyle = '#c084fc';
        } else if (isPlaying) {
          // Purple to pink gradient per bar
          const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
          gradient.addColorStop(0, '#c084fc');
          gradient.addColorStop(1, '#ec4899');
          ctx.fillStyle = gradient;
        } else {
          ctx.fillStyle = '#64748b';
        }

        ctx.globalAlpha = isDJSpeaking ? 0.95 : isPlaying ? 0.85 : 0.4;

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
        } else {
          ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();
      }

      ctx.globalAlpha = 1.0;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, isDJSpeaking, color]);

  return (
    <div className="relative w-full h-14 flex items-center justify-center overflow-hidden rounded-xl bg-slate-950/40 px-3 py-1 border border-slate-800/80">
      <canvas
        ref={canvasRef}
        width={400}
        height={height}
        className="w-full h-full block"
      />
    </div>
  );
};

