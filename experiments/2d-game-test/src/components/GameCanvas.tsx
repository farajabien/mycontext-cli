"use client"

import React, { useEffect, useRef, useState } from 'react';
import { INITIAL_STATE, GameState } from '../lib/game-state';
import { GameEngine } from '../lib/game-engine';

export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<GameState>(INITIAL_STATE);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize Bricks
    const bricks = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 8; c++) {
        bricks.push({
          pos: { x: c * 95 + 20, y: r * 30 + 50 },
          width: 80,
          height: 20,
          active: true
        });
      }
    }
    setState(s => ({ ...s, bricks }));

    let animationFrameId: number;

    const render = () => {
      // Logic Update
      setState(prevState => {
        const nextState = GameEngine.update(prevState, canvas.width, canvas.height);
        
        // Drawing
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw Paddle
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(nextState.paddle.pos.x, nextState.paddle.pos.y, nextState.paddle.width, nextState.paddle.height);

        // Draw Ball
        ctx.beginPath();
        ctx.arc(nextState.ball.pos.x, nextState.ball.pos.y, nextState.ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.closePath();

        // Draw Bricks
        nextState.bricks.forEach(brick => {
          if (brick.active) {
            ctx.fillStyle = '#10b981';
            ctx.fillRect(brick.pos.x, brick.pos.y, brick.width, brick.height);
          }
        });

        return nextState;
      });

      animationFrameId = window.requestAnimationFrame(render);
    };

    render();

    return () => window.cancelAnimationFrame(animationFrameId);
  }, []);

  // Simple Mouse Controls
  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setState(s => ({
      ...s,
      paddle: { ...s.paddle, pos: { ...s.paddle.pos, x: x - s.paddle.width / 2 } }
    }));
  };

  return (
    <div className="flex flex-col items-center gap-4 p-8 bg-slate-900 min-h-screen text-white">
      <h1 className="text-4xl font-bold">Brick Breaker</h1>
      <div className="text-xl">Score: {state.score}</div>
      <canvas 
        ref={canvasRef}
        width={800}
        height={600}
        onMouseMove={handleMouseMove}
        className="border-4 border-slate-700 bg-black rounded-lg shadow-2xl"
      />
      {state.isGameOver && <div className="text-4xl text-red-500 font-bold animate-pulse">GAME OVER</div>}
      {state.isWin && <div className="text-4xl text-green-500 font-bold animate-bounce">YOU WIN!</div>}
    </div>
  );
};
