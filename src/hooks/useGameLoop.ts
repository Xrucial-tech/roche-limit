import { useState, useRef } from 'react';
import type { GameState, Planet, Star } from '../types';
import { processAI } from '../logic/aiLogic';

const MAX_TURNS = 55;
const MAX_AP = 5;
const MINER_COST = { fuel: 10, biomass: 10 };
const FIGHTER_COST = { fuel: 20, exotic: 10 }; 
const WARP_COST = 50; 
const MINING_RATE = 10;
const G_CONSTANT = 0.35; 

export const isPlanetMineable = (planet: Planet) => !planet.destroyed;

const getInitialStars = (): Star[] => [
    { id: 'alpha', position: { x: 300, y: 400 }, radius: 60, deathRadius: 62, color: '#ef4444', rotationSpeed: -0.1, currentAngle: 0 }, 
    { id: 'beta', position: { x: 900, y: 400 }, radius: 55, deathRadius: 57, color: '#3b82f6', rotationSpeed: 0.15, currentAngle: 0 },
];

const generatePlanets = (stars: Star[]): Planet[] => {
  const planets: Planet[] = [];
  let idCounter = 0;
  const orbits = [100, 115, 130, 145, 180, 195, 210, 225, 280, 295, 310, 325];

  stars.forEach(star => {
      orbits.forEach(radius => {
          const angle = Math.random() * Math.PI * 2;
          const x = star.position.x + radius * Math.cos(angle);
          const y = star.position.y + radius * Math.sin(angle);
          const speed = Math.sqrt((G_CONSTANT * star.radius) / radius);
          const direction = star.id === 'alpha' ? -1 : 1;
          const vx = -(Math.sin(angle)) * speed * direction;
          const vy = (Math.cos(angle)) * speed * direction;

          planets.push({
              id: `p-${idCounter++}`,
              parentStarId: star.id,
              x, y, vx, vy,
              orbitRadius: radius,
              orbitSpeed: speed,
              angle: angle * (180 / Math.PI), 
              resourceType: Math.random() > 0.8 ? 'exotic' : (Math.random() > 0.4 ? 'biomass' : 'fuel'),
              isAnchored: false,
              destroyed: false,
              isUnstable: false,
              isDebris: false
          });
      });
  });
  return planets;
};

const getInitialState = (): GameState => {
    const stars = getInitialStars();
    return {
        turn: 1, maxTurns: MAX_TURNS, phase: 'planning', endReason: null, actionPoints: MAX_AP,
        gameMessage: "Commander, hostile signals detected.", log: ["Mission Start."], turnReport: null,
        isMerged: false, selectedPlanetId: null, resources: { fuel: 50, biomass: 50, exotic: 0 },
        ark: { engines: 0, lifeSupport: 0, warpCore: 0 },
        starbase: { position: {x:0, y:0}, orbitRadius: 280, angle: 135, parentStarId: 'alpha' }, 
        aiStarbase: { position: {x:0, y:0}, orbitRadius: 280, angle: 45, parentStarId: 'beta' },
        aiResources: { fuel: 50, biomass: 50, exotic: 0 },
        aiArk: { engines: 0, lifeSupport: 0, warpCore: 0 },
        ships: [
            { id: 'm-1', owner: 'player', type: 'miner', status: 'idle', location: null, travelProgress: 0 },
            { id: 'ai-1', owner: 'ai', type: 'miner', status: 'idle', location: null, travelProgress: 0 }
        ],
        explosions: [], stars, planets: generatePlanets(stars)
    };
};

export const useGameLoop = () => {
  const [gameState, setGameState] = useState<GameState>(getInitialState());
  const animationRef = useRef<number>(0);

  const buildArkPart = (part: 'engines' | 'lifeSupport' | 'warpCore') => setGameState(prev => { 
      if (prev.actionPoints < 1 || prev.ark[part] >= 100) return prev; 
      const costs: Record<string, {r: 'fuel' | 'biomass' | 'exotic', v: number}> = { engines: {r:'fuel', v:20}, lifeSupport: {r:'biomass', v:20}, warpCore: {r:'exotic', v:10} }; 
      const cost = costs[part]; 
      if (prev.resources[cost.r] < cost.v) return { ...prev, gameMessage: "Insufficient Resources" }; 
      const newRes = { ...prev.resources }; newRes[cost.r] -= cost.v; 
      const newArk = { ...prev.ark }; newArk[part] += 20; 
      let phase = prev.phase; 
      let reason = prev.endReason;
      if (newArk.engines >= 100 && newArk.lifeSupport >= 100 && newArk.warpCore >= 100) { phase = 'victory'; reason = 'player_victory'; }
      return { ...prev, resources: newRes, ark: newArk, phase, endReason: reason, actionPoints: prev.actionPoints - 1 }; 
  });

  const buildMiner = () => setGameState(prev => { 
      if (prev.resources.fuel < MINER_COST.fuel || prev.resources.biomass < MINER_COST.biomass) return { ...prev, gameMessage: "Insufficient resources." }; 
      return { ...prev, resources: { ...prev.resources, fuel: prev.resources.fuel - MINER_COST.fuel, biomass: prev.resources.biomass - MINER_COST.biomass }, ships: [...prev.ships, { id: `m-${Date.now()}`, owner: 'player', type: 'miner', status: 'idle', location: null, travelProgress: 0 }], gameMessage: "Miner Constructed." }; 
  });

  const buildFighter = () => setGameState(prev => {
      if (prev.resources.fuel < FIGHTER_COST.fuel || prev.resources.exotic < FIGHTER_COST.exotic) return { ...prev, gameMessage: "Insufficient resources." };
      return { ...prev, resources: { ...prev.resources, fuel: prev.resources.fuel - FIGHTER_COST.fuel, exotic: prev.resources.exotic - FIGHTER_COST.exotic }, ships: [...prev.ships, { id: `f-${Date.now()}`, owner: 'player', type: 'fighter', status: 'idle', location: null, travelProgress: 0 }], gameMessage: "Starship Constructed." };
  });

  const deployMiner = (planetId: string) => setGameState(prev => { 
      if (prev.actionPoints < 1) return { ...prev, gameMessage: "Not enough AP." }; 
      const idleShip = prev.ships.find(s => s.status === 'idle' && s.owner === 'player' && s.type === 'miner'); 
      if (!idleShip) return { ...prev, gameMessage: "No idle miners." }; 
      return { ...prev, ships: prev.ships.map(s => s.id === idleShip.id ? { ...s, status: 'traveling_out', location: planetId, travelProgress: 0 } : s), actionPoints: prev.actionPoints - 1, selectedPlanetId: null, gameMessage: `Miner launching...` }; 
  });

  const deployFighter = (planetId: string) => setGameState(prev => {
      if (prev.actionPoints < 1) return { ...prev, gameMessage: "Not enough AP." };
      const idleShip = prev.ships.find(s => s.status === 'idle' && s.owner === 'player' && s.type === 'fighter');
      if (!idleShip) return { ...prev, gameMessage: "No idle Starships." };
      return { ...prev, ships: prev.ships.map(s => s.id === idleShip.id ? { ...s, status: 'traveling_out', location: planetId, travelProgress: 0 } : s), actionPoints: prev.actionPoints - 1, selectedPlanetId: null, gameMessage: `Starship engaging...` };
  });

  const warpShip = (planetId: string, shipType: 'miner' | 'fighter') => setGameState(prev => {
      if (prev.actionPoints < 2) return { ...prev, gameMessage: "Not enough AP (Needs 2)." };
      if (prev.resources.fuel < WARP_COST) return { ...prev, gameMessage: "Insufficient Fuel." };
      const idleShip = prev.ships.find(s => s.status === 'idle' && s.owner === 'player' && s.type === shipType);
      if (!idleShip) return prev;
      return { ...prev, resources: { ...prev.resources, fuel: prev.resources.fuel - WARP_COST }, actionPoints: prev.actionPoints - 2, ships: prev.ships.map(s => s.id === idleShip.id ? { ...s, status: 'deployed', location: planetId, travelProgress: 100 } : s), selectedPlanetId: null, gameMessage: "WARP JUMP SUCCESSFUL." };
  });

  const recallMiner = (planetId: string) => setGameState(prev => { 
      if (prev.actionPoints < 1) return { ...prev, gameMessage: "Not enough AP." }; 
      const ship = prev.ships.find(s => s.location === planetId && s.status === 'deployed' && s.owner === 'player'); 
      if (!ship) return prev; 
      return { ...prev, ships: prev.ships.map(s => s.id === ship.id ? { ...s, status: 'traveling_back', location: planetId, travelProgress: 0 } : s), actionPoints: prev.actionPoints - 1, selectedPlanetId: null, gameMessage: `Ship recalled.` }; 
  });

  const selectPlanet = (id: string | null) => { if (gameState.phase !== 'resolving') setGameState(prev => ({ ...prev, selectedPlanetId: id })); };
  const toggleAnchor = (planetId: string) => setGameState(prev => { if (prev.actionPoints < 1) return prev; return { ...prev, actionPoints: prev.actionPoints - 1, planets: prev.planets.map(p => p.id === planetId ? { ...p, isAnchored: !p.isAnchored } : p) }; }); 
  const closeReport = () => setGameState(prev => ({ ...prev, phase: 'planning', turnReport: null }));

  const commitTurn = () => {
    if (gameState.phase !== 'planning') return;
    let aiState = processAI(gameState, gameState.planets, gameState.ships);
    setGameState(prev => ({ ...prev, phase: 'resolving', gameMessage: "Simulating Dynamics...", ships: aiState.ships, aiResources: aiState.resources, aiArk: aiState.ark }));

    let frames = 0;
    const maxFrames = 200;
    let turnEvents: string[] = []; 

    const animate = () => {
      setGameState(prev => {
        if (frames >= maxFrames) {
            cancelAnimationFrame(animationRef.current!);
            const finalShips = prev.ships.map(ship => {
                if (ship.status === 'traveling_out' && ship.travelProgress >= 100) return { ...ship, status: 'deployed' as const, travelProgress: 0 };
                if (ship.status === 'traveling_back' && ship.travelProgress >= 100) return { ...ship, status: 'idle' as const, location: null, travelProgress: 0 };
                return ship;
            });

            let newRes = { ...prev.resources };
            let newAiRes = { ...prev.aiResources };
            finalShips.forEach(ship => {
                if (ship.status === 'deployed' && ship.location && ship.type === 'miner') {
                    const planet = prev.planets.find(p => p.id === ship.location);
                    if (planet && !planet.destroyed) {
                        const rate = planet.isUnstable ? MINING_RATE * 2 : MINING_RATE;
                        const finalRate = planet.isDebris ? Math.floor(rate / 2) : rate;
                        if (ship.owner === 'player') newRes[planet.resourceType] += finalRate;
                        else if (ship.owner === 'ai') newAiRes[planet.resourceType] += finalRate;
                    }
                }
            });

            let nextPhase: GameState['phase'] = (prev.turn >= prev.maxTurns) ? 'game_over' : 'results';
            let nextReason: GameState['endReason'] = prev.endReason;
            if (prev.aiArk.engines >= 100 && prev.aiArk.lifeSupport >= 100 && prev.aiArk.warpCore >= 100) { nextPhase = 'defeat'; nextReason = 'ai_victory'; }

            return { ...prev, ships: finalShips, resources: newRes, aiResources: newAiRes, turnReport: turnEvents, phase: nextPhase, endReason: nextReason, turn: prev.turn + 1, actionPoints: MAX_AP, explosions: [] };
        }

        let newStars = prev.stars.map(s => ({ ...s, position: { ...s.position } }));
        let newExplosions = prev.explosions.map(e => ({ ...e, radius: e.radius + 0.5, opacity: e.opacity - 0.05 })).filter(e => e.opacity > 0);
        let isMerged = prev.isMerged;
        let newShips = prev.ships.map(s => ({ ...s }));

        newShips.forEach(ship => {
            if (ship.status === 'traveling_out' || ship.status === 'traveling_back') {
                ship.travelProgress = Math.min(ship.travelProgress + 0.5, 100);
                if (ship.status === 'traveling_out' && !isMerged) {
                    const planet = prev.planets.find(p => p.id === ship.location);
                    if (planet) {
                        const isCrossSystem = (ship.owner === 'player' && planet.parentStarId === 'beta') || (ship.owner === 'ai' && planet.parentStarId === 'alpha');
                        if (isCrossSystem && Math.random() < 0.001) {
                            ship.status = 'traveling_back';
                            ship.travelProgress = 100 - ship.travelProgress;
                            const msg = `GRAVITY SHEAR: ${ship.owner.toUpperCase()} ${ship.type} forced to retreat!`;
                            if (!turnEvents.includes(msg)) turnEvents.push(msg);
                        }
                    }
                }
                if (ship.type === 'fighter' && ship.status === 'traveling_out' && ship.travelProgress >= 100) {
                    const targets = newShips.filter(t => t.location === ship.location && t.status === 'deployed' && t.owner !== ship.owner);
                    targets.forEach(t => {
                        t.id = "DESTROYED";
                        const msg = `COMBAT: Fighter ${ship.id} destroyed ${t.owner.toUpperCase()} ${t.type}`;
                        if (!turnEvents.includes(msg)) turnEvents.push(msg);
                        const p = prev.planets.find(pl => pl.id === ship.location);
                        if (p) newExplosions.push({ id: `exp-${Math.random()}`, x: p.x, y: p.y, radius: 5, opacity: 1, color: '#ef4444' });
                    });
                }
            }
        });
        newShips = newShips.filter(s => s.id !== "DESTROYED");

        const currentDist = newStars[1].position.x - newStars[0].position.x;
        if (!isMerged) {
            if (currentDist > 40) { // Threshold for collision
                newStars[0].position.x += 0.12; 
                newStars[1].position.x -= 0.12;
            } else {
                isMerged = true;
                turnEvents.push("THE STARS HAVE COLLIDED: THE SINGULARITY FORMS!");
            }
        }

        let updatedPlanets = prev.planets.map(planet => {
            if (planet.destroyed && !planet.isDebris) return planet;
            if (planet.isAnchored) return planet;

            const dxA = newStars[0].position.x - planet.x;
            const dyA = newStars[0].position.y - planet.y;
            const dSqA = dxA*dxA + dyA*dyA;
            const distA = Math.sqrt(dSqA);

            const dxB = newStars[1].position.x - planet.x;
            const dyB = newStars[1].position.y - planet.y;
            const dSqB = dxB*dxB + dyB*dyB;
            const distB = Math.sqrt(dSqB);

            const alphaPower = 1 + (Math.sin(frames * 0.05) * 0.20);
            const betaPower = 1 + (Math.cos(frames * 0.05) * 0.20);

            const fAx = (dxA / distA) * (G_CONSTANT * newStars[0].radius * alphaPower / dSqA);
            const fAy = (dyA / distA) * (G_CONSTANT * newStars[0].radius * alphaPower / dSqA);
            const fBx = (dxB / distB) * (G_CONSTANT * newStars[1].radius * betaPower / dSqB);
            const fBy = (dyB / distB) * (G_CONSTANT * newStars[1].radius * betaPower / dSqB);

            const nVx = planet.vx + fAx + fBx;
            const nVy = planet.vy + fAy + fBy;
            const nX = planet.x + nVx;
            const nY = planet.y + nVy;

            for (const s of newStars) {
                if (Math.hypot(nX - s.position.x, nY - s.position.y) < s.deathRadius) {
                    newExplosions.push({ id: `exp-${planet.id}-${frames}`, x: nX, y: nY, radius: 10, opacity: 1, color: '#f59e0b' });
                    return { ...planet, destroyed: true, x: nX, y: nY };
                }
            }

            return { ...planet, x: nX, y: nY, vx: nVx, vy: nVy, parentStarId: distA < distB ? 'alpha' : 'beta', isUnstable: distA < 140 || distB < 140 };
        });

        for (let i = 0; i < updatedPlanets.length; i++) {
            for (let j = i + 1; j < updatedPlanets.length; j++) {
                const p1 = updatedPlanets[i]; const p2 = updatedPlanets[j];
                if (p1.destroyed || p2.destroyed) continue;
                if (Math.hypot(p1.x - p2.x, p1.y - p2.y) < 14) {
                    p1.isDebris = true; p2.isDebris = true;
                    newExplosions.push({ id: `exp-col-${i}-${j}`, x: p1.x, y: p1.y, radius: 8, opacity: 1, color: '#94a3b8' });
                }
            }
        }

        return { ...prev, stars: newStars, planets: updatedPlanets, ships: newShips, explosions: newExplosions, isMerged };
      });
      frames++;
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();
  };
  
  const restartGame = () => setGameState(getInitialState());
  return { gameState, selectPlanet, toggleAnchor, buildArkPart, commitTurn, buildMiner, buildFighter, deployMiner, deployFighter, warpShip, recallMiner, restartGame, closeReport };
};