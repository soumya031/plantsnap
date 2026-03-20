import React, { useEffect, useRef } from 'react';
import Matter from 'matter-js';
import { Leaf, Flower2, Sprout, Camera, ArrowRight } from 'lucide-react';

interface AntiGravityLandingProps {
  onStart: () => void;
}

const AntiGravityLanding: React.FC<AntiGravityLandingProps> = ({ onStart }) => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);

  useEffect(() => {
    if (!sceneRef.current) return;

    const { Engine, Render, Runner, World, Bodies, Mouse, MouseConstraint, Events } = Matter;

    const engine = Engine.create();
    engineRef.current = engine;
    engine.gravity.y = 0; // Zero gravity

    const render = Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: window.innerWidth,
        height: window.innerHeight,
        wireframes: false,
        background: 'transparent',
      },
    });

    const runner = Runner.create();
    Runner.run(runner, engine);
    Render.run(render);

    // Create boundaries
    const offset = 50;
    const walls = [
      Bodies.rectangle(window.innerWidth / 2, -offset, window.innerWidth, offset, { isStatic: true }),
      Bodies.rectangle(window.innerWidth / 2, window.innerHeight + offset, window.innerWidth, offset, { isStatic: true }),
      Bodies.rectangle(-offset, window.innerHeight / 2, offset, window.innerHeight, { isStatic: true }),
      Bodies.rectangle(window.innerWidth + offset, window.innerHeight / 2, offset, window.innerHeight, { isStatic: true }),
    ];
    World.add(engine.world, walls);

    // Add floating elements
    const elements: Matter.Body[] = [];
    const colors = ['#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534'];

    for (let i = 0; i < 15; i++) {
      const x = Math.random() * window.innerWidth;
      const y = Math.random() * window.innerHeight;
      const radius = 20 + Math.random() * 30;
      
      const body = Bodies.circle(x, y, radius, {
        restitution: 0.8,
        frictionAir: 0.02,
        render: {
          fillStyle: colors[Math.floor(Math.random() * colors.length)],
          opacity: 0.6,
        },
      });
      
      // Initial drift
      Matter.Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
      });
      
      elements.push(body);
    }
    World.add(engine.world, elements);

    // Mouse interaction
    const mouse = Mouse.create(render.canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: { visible: false },
      },
    });
    World.add(engine.world, mouseConstraint);

    // Ambient drift force
    Events.on(engine, 'beforeUpdate', () => {
      elements.forEach((body) => {
        Matter.Body.applyForce(body, body.position, {
          x: (Math.random() - 0.5) * 0.0001,
          y: (Math.random() - 0.5) * 0.0001,
        });
      });
    });

    const handleResize = () => {
      render.canvas.width = window.innerWidth;
      render.canvas.height = window.innerHeight;
      
      // Update wall positions
      Matter.Body.setPosition(walls[0], { x: window.innerWidth / 2, y: -offset });
      Matter.Body.setPosition(walls[1], { x: window.innerWidth / 2, y: window.innerHeight + offset });
      Matter.Body.setPosition(walls[2], { x: -offset, y: window.innerHeight / 2 });
      Matter.Body.setPosition(walls[3], { x: window.innerWidth + offset, y: window.innerHeight / 2 });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      Render.stop(render);
      Runner.stop(runner);
      World.clear(engine.world, false);
      Engine.clear(engine);
      render.canvas.remove();
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-100">
      <div ref={sceneRef} className="absolute inset-0 z-0" />
      
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 text-center pointer-events-none">
        <div className="p-6 bg-white/30 backdrop-blur-md rounded-3xl border border-white/40 shadow-2xl pointer-events-auto transform hover:scale-105 transition-transform duration-500">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sprout className="w-12 h-12 text-emerald-600 animate-bounce" />
            <h1 className="text-5xl md:text-7xl font-bold text-emerald-900 tracking-tighter">
              PlantSnap
            </h1>
          </div>
          
          <p className="text-xl md:text-2xl text-emerald-800/80 mb-8 max-w-md mx-auto font-medium">
            AI-Powered Plant Identifier & Care Assistant. 
            <span className="italic block mt-2 text-lg">Your garden, in zero gravity.</span>
          </p>

          <button
            onClick={onStart}
            className="group relative flex items-center gap-3 px-8 py-4 bg-emerald-600 text-white rounded-full text-xl font-bold shadow-lg hover:bg-emerald-700 transition-all active:scale-95 pointer-events-auto"
          >
            <Camera className="w-6 h-6 group-hover:rotate-12 transition-transform" />
            Start Identifying
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-8 text-emerald-700/40 pointer-events-none">
          <Leaf className="w-8 h-8 animate-pulse" />
          <Flower2 className="w-8 h-8 animate-bounce delay-100" />
          <Sprout className="w-8 h-8 animate-pulse delay-200" />
        </div>
      </div>
    </div>
  );
};

export default AntiGravityLanding;
