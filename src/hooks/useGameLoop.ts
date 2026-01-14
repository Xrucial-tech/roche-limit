import { useState, useRef } from 'react';
import type { GameState, Planet, Star, Ship } from '../types';
import { processAI } from '../logic/aiLogic';

const MAX_TURNS = 100;
const MAX_AP = 5;
const MINER_COST = { fuel: 10, biomass: 10 };
const MINING_RATE = 10;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

const getAbsolutePos = (planet: Planet, stars: Star[]) => {
    const parent = stars.find(s => s.id === planet.parentStarId);
    if (!parent) return { x: -9999, y: -9999 };
    const rad = toRad(planet.angle);
    return {
        x: parent.position.x + planet.orbitRadius * Math.cos(rad),
        y: parent.position.y + planet.orbitRadius * Math.sin(rad)
    };
};

const isInFluxZone = (x: number, y: number, stars: Star[]) => {
    const alpha = stars[0];
    const beta = stars[1];
    const d1 = Math.hypot(x - alpha.position.x, y - alpha.position.y);
    const d2 = Math.hypot(x - beta.position.x, y - beta.position.y);
    const dist = Math.abs(beta.position.x - alpha.position.x);
    return d1 + d2 < dist * 1.15;
};

export const isPlanetMineable = (planet: Planet, stars: Star[]) => {
  return !planet.destroyed; 
};

const generatePlanets = (stars: Star[]): Planet[] => {
  const planets: Planet[] = [];
  let idCounter = 0;
  const orbits = [100, 115, 130, 145, 180, 195, 210, 225, 280, 295, 310, 325];

  stars.forEach(star => {
      orbits.forEach(radius => {
          let valid = false;
          let attempts = 0;
          let newPlanet: Planet | null = null;
          while (!valid && attempts < 10) {
              const dist = radius + (Math.random() * 4 - 2); 
              const angle = Math.random() * 360;
              const baseSpeed = 20; 
              const rawSpeed = baseSpeed / Math.sqrt(dist);
              const direction = star.id === 'alpha' ? -1 : 1;
              const speed = rawSpeed * direction;
              const typeProb = Math.random();
              let rType: any = 'fuel';
              if (typeProb > 0.4) rType = 'biomass';
              if (typeProb > 0.8) rType = 'exotic';

              const tempPlanet: Planet = {
                  id: `p-${idCounter}`,
                  parentStarId: star.id,
                  orbitRadius: dist,
                  orbitSpeed: speed,
                  angle: angle,
                  resourceType: rType,
                  isAnchored: false,
                  destroyed: false,
                  isUnstable: false,
                  isDebris: false
              };
              const pos1 = getAbsolutePos(tempPlanet, stars);
              let collision = false;
              for (const p of planets) {
                  const pos2 = getAbsolutePos(p, stars);
                  const d = Math.hypot(pos1.x - pos2.x, pos1.y - pos2.y);
                  if (d < 30) collision = true; 
              }
              if (!collision) { valid = true; newPlanet = tempPlanet; idCounter++; }
              attempts++;
          }
          if (newPlanet) planets.push(newPlanet);
      });
  });
  return planets;
};

const INITIAL_STARS = [
    { id: 'alpha', position: { x: 300, y: 400 }, radius: 60, deathRadius: 75, color: '#ef4444', rotationSpeed: -0.1, currentAngle: 0 }, 
    { id: 'beta', position: { x: 900, y: 400 }, radius: 55, deathRadius: 70, color: '#3b82f6', rotationSpeed: 0.15, currentAngle: 0 },
];

const INITIAL_STATE: GameState = {
  turn: 1,
  maxTurns: MAX_TURNS,
  phase: 'planning',
  actionPoints: MAX_AP,
  gameMessage: "Commander, counter-rotational shears detected.",
  log: ["Mission Start."],
  turnReport: null,
  isMerged: false,
  selectedPlanetId: null,
  resources: { fuel: 50, biomass: 50, exotic: 0 },
  ark: { engines: 0, lifeSupport: 0, warpCore: 0 },
  starbase: { position: {x:0, y:0}, orbitRadius: 280, angle: 135, parentStarId: 'alpha' }, 
  aiStarbase: { position: {x:0, y:0}, orbitRadius: 280, angle: 45, parentStarId: 'beta' },
  aiResources: { fuel: 50, biomass: 50, exotic: 0 },
  aiArk: { engines: 0, lifeSupport: 0, warpCore: 0 },
  ships: [
    { id: 'm-1', owner: 'player', type: 'miner', status: 'idle', location: null, travelProgress: 0 },
    { id: 'ai-1', owner: 'ai', type: 'miner', status: 'idle', location: null, travelProgress: 0 }
  ],
  stars: INITIAL_STARS,
  planets: generatePlanets(INITIAL_STARS)
};

export const useGameLoop = () => {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const animationRef = useRef<number>();

  // Actions
  const buildMiner = () => setGameState(prev => { if (prev.resources.fuel < MINER_COST.fuel || prev.resources.biomass < MINER_COST.biomass) return { ...prev, gameMessage: "Insufficient resources." }; return { ...prev, resources: { ...prev.resources, fuel: prev.resources.fuel - MINER_COST.fuel, biomass: prev.resources.biomass - MINER_COST.biomass }, ships: [...prev.ships, { id: `m-${Date.now()}`, owner: 'player', type: 'miner', status: 'idle', location: null, travelProgress: 0 }], gameMessage: "Miner Constructed." }; });
  const deployMiner = (planetId: string) => setGameState(prev => { if (prev.actionPoints < 1) return { ...prev, gameMessage: "Not enough AP." }; const idleShip = prev.ships.find(s => s.status === 'idle' && s.owner === 'player'); if (!idleShip) return { ...prev, gameMessage: "No idle miners." }; return { ...prev, ships: prev.ships.map(s => s.id === idleShip.id ? { ...s, status: 'traveling_out', location: planetId, travelProgress: 0 } : s), actionPoints: prev.actionPoints - 1, selectedPlanetId: null, gameMessage: `Miner ${idleShip.id} launching...` }; });
  const recallMiner = (planetId: string) => setGameState(prev => { if (prev.actionPoints < 1) return { ...prev, gameMessage: "Not enough AP." }; const ship = prev.ships.find(s => s.location === planetId && s.status === 'deployed' && s.owner === 'player'); if (!ship) return prev; return { ...prev, ships: prev.ships.map(s => s.id === ship.id ? { ...s, status: 'traveling_back', location: planetId, travelProgress: 0 } : s), actionPoints: prev.actionPoints - 1, selectedPlanetId: null, gameMessage: `Miner ${ship.id} recalled.` }; });
  const selectPlanet = (id: string | null) => { if (gameState.phase !== 'resolving') setGameState(prev => ({ ...prev, selectedPlanetId: id })); };
  const toggleAnchor = (planetId: string) => setGameState(prev => { if (prev.actionPoints < 1) return prev; return { ...prev, actionPoints: prev.actionPoints - 1, planets: prev.planets.map(p => p.id === planetId ? { ...p, isAnchored: !p.isAnchored } : p) }; }); 
  const closeReport = () => setGameState(prev => ({ ...prev, phase: 'planning', turnReport: null }));
  const buildArkPart = (part: 'engines' | 'lifeSupport' | 'warpCore') => setGameState(prev => { if (prev.actionPoints < 1 || prev.ark[part] >= 100) return prev; const costs = { engines: {r:'fuel', v:20}, lifeSupport: {r:'biomass', v:20}, warpCore: {r:'exotic', v:10} }; const cost = costs[part]; /* @ts-ignore */ if (prev.resources[cost.r] < cost.v) return { ...prev, gameMessage: "Insufficient Resources" }; const newRes = { ...prev.resources }; /* @ts-ignore */ newRes[cost.r] -= cost.v; const newArk = { ...prev.ark }; newArk[part] += 20; let phase = prev.phase; if (newArk.engines >= 100 && newArk.lifeSupport >= 100 && newArk.warpCore >= 100) phase = 'victory'; return { ...prev, resources: newRes, ark: newArk, phase: phase, actionPoints: prev.actionPoints - 1 }; });

  const commitTurn = () => {
    if (gameState.phase !== 'planning') return;
    let aiState = processAI(gameState, gameState.planets, gameState.ships);
    setGameState(prev => ({ ...prev, phase: 'resolving', gameMessage: "Simulating...", ships: aiState.ships, aiResources: aiState.resources, aiArk: aiState.ark }));

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
                if (ship.status === 'deployed' && ship.location) {
                    const planet = prev.planets.find(p => p.id === ship.location);
                    if (planet && !planet.destroyed) {
                        const rate = planet.isUnstable ? MINING_RATE * 2 : MINING_RATE;
                        const finalRate = planet.isDebris ? Math.floor(rate / 2) : rate;
                        if (ship.owner === 'player') {
                            newRes[planet.resourceType] += finalRate;
                            const typeLabel = planet.isDebris ? "DEBRIS" : planet.resourceType.toUpperCase();
                            if (!turnEvents.includes(`Extracted ${finalRate} ${typeLabel}`)) turnEvents.push(`Miner ${ship.id} extracted ${finalRate} ${typeLabel}`);
                        }
                        else if (ship.owner === 'ai') newAiRes[planet.resourceType] += finalRate;
                    }
                }
            });
            let nextPhase: any = 'results'; 
            if (prev.turn >= prev.maxTurns) nextPhase = 'game_over';
            if (prev.aiArk.engines >= 100 && prev.aiArk.lifeSupport >= 100 && prev.aiArk.warpCore >= 100) nextPhase = 'defeat';
            return { ...prev, ships: finalShips, resources: newRes, aiResources: newAiRes, turnReport: turnEvents, phase: nextPhase, turn: prev.turn + 1, actionPoints: MAX_AP, selectedPlanetId: null, gameMessage: "Turn Complete." };
        }

        let newStars = [...prev.stars];
        let newShips = [...prev.ships];
        let newPlanets = [...prev.planets];
        
        const currentDist = newStars[1].position.x - newStars[0].position.x;
        let isMerged = prev.isMerged;

        // MERGER LOGIC
        if (!isMerged) {
            if (currentDist > 20) {
                const moveSpeed = 0.01; 
                newStars[0].position.x += moveSpeed;
                newStars[1].position.x -= moveSpeed;
            } else {
                isMerged = true;
                turnEvents.push("SINGULARITY FORMED: GRAVITY IS DESTABILIZED!");
            }
        }
        
        newStars[0].currentAngle = (newStars[0].currentAngle + newStars[0].rotationSpeed) % 360;
        newStars[1].currentAngle = (newStars[1].currentAngle + newStars[1].rotationSpeed) % 360;

        newShips = newShips.map(ship => {
            if (ship.status === 'traveling_out' || ship.status === 'traveling_back') return { ...ship, travelProgress: Math.min(ship.travelProgress + 0.5, 100) };
            return ship;
        });

        // PLANET PHYSICS
        newPlanets = newPlanets.map(planet => {
          if (planet.destroyed && !planet.isDebris) return planet;
          let parent = newStars.find(s => s.id === planet.parentStarId)!;
          const rad = toRad(planet.angle);
          const absX = isMerged 
                ? 600 + planet.orbitRadius * Math.cos(rad) 
                : parent.position.x + planet.orbitRadius * Math.cos(rad);
          const absY = isMerged 
                ? 400 + planet.orbitRadius * Math.sin(rad)
                : parent.position.y + planet.orbitRadius * Math.sin(rad);

          // 1. Move
          let nextAngle = planet.angle;
          const speedMult = planet.isDebris ? 0.2 : 1;
          let chaosMod = 1;
          if (isMerged && !planet.isAnchored) chaosMod = 1 + (Math.random() * 0.8 - 0.4); 
          if (!planet.isAnchored) nextAngle = (planet.angle + (planet.orbitSpeed * 0.1 * speedMult * chaosMod)) % 360;

          let finalParentId = planet.parentStarId;
          let finalOrbitRadius = planet.orbitRadius;
          let finalOrbitSpeed = planet.orbitSpeed;
          let finalAngle = nextAngle;

          if (isMerged && !planet.isAnchored) finalOrbitRadius -= 0.05; 

          if (!isMerged) {
              const otherStar = newStars.find(s => s.id !== planet.parentStarId)!;
              const distToOther = Math.hypot(absX - otherStar.position.x, absY - otherStar.position.y);
              const inFlux = isInFluxZone(absX, absY, newStars);

              if (inFlux && !planet.isDebris && !planet.isAnchored) {
                  if (distToOther > 280 && distToOther < 330) {
                      if (Math.random() < 0.2) {
                          finalParentId = otherStar.id;
                          finalOrbitRadius = distToOther; 
                          const dx = absX - otherStar.position.x;
                          const dy = absY - otherStar.position.y;
                          finalAngle = toDeg(Math.atan2(dy, dx)); 
                          const newDir = otherStar.id === 'alpha' ? -1 : 1;
                          finalOrbitSpeed = Math.abs(planet.orbitSpeed) * newDir;
                          const msg = `ORBITAL SHIFT: ${planet.id} captured by ${otherStar.id.toUpperCase()}`;
                          if (!turnEvents.includes(msg)) turnEvents.push(msg);
                      }
                  }
              }
          }

          // 3. CHECK COLLISION WITH STARS (UPDATED FOR LOGGING)
          const effectiveParent = newStars.find(s => s.id === finalParentId)!;
          const finalRad = toRad(finalAngle);
          // Recalculate exact position after all movement logic
          const finalX = isMerged 
                ? 600 + finalOrbitRadius * Math.cos(finalRad)
                : effectiveParent.position.x + finalOrbitRadius * Math.cos(finalRad);
          const finalY = isMerged
                ? 400 + finalOrbitRadius * Math.sin(finalRad)
                : effectiveParent.position.y + finalOrbitRadius * Math.sin(finalRad);

          let isVaporized = false;
          let deathMsg = "";

          if (isMerged) {
              // SINGULARITY DEATH
              const distToCenter = Math.hypot(finalX - 600, finalY - 400);
              if (distToCenter < 100) { // Purple Star Radius
                  isVaporized = true;
                  deathMsg = `CATASTROPHIC: ${planet.id} consumed by Singularity!`;
              }
          } else {
              // NORMAL STAR DEATH
              for (const star of newStars) {
                  const distToStar = Math.hypot(finalX - star.position.x, finalY - star.position.y);
                  if (distToStar < star.deathRadius) {
                      isVaporized = true;
                      const starName = star.id === 'alpha' ? "RED STAR" : "BLUE STAR";
                      deathMsg = `CATASTROPHIC: ${planet.id} consumed by ${starName}!`;
                      break;
                  }
              }
          }

          if (isVaporized) {
             if (!planet.destroyed) turnEvents.push(deathMsg);
             newShips = newShips.filter(s => s.location !== planet.id);
             return { ...planet, destroyed: true, isDebris: false }; 
          }

          return { 
              ...planet, 
              angle: finalAngle, 
              parentStarId: finalParentId,
              orbitRadius: finalOrbitRadius,
              orbitSpeed: finalOrbitSpeed,
              isUnstable: (isMerged || (isInFluxZone(absX, absY, newStars))) && !planet.isDebris 
          };
        });

        // OBJECT COLLISIONS
        for (let i = 0; i < newPlanets.length; i++) {
            for (let j = i + 1; j < newPlanets.length; j++) {
                const p1 = newPlanets[i];
                const p2 = newPlanets[j];
                if ((p1.destroyed && !p1.isDebris) || (p2.destroyed && !p2.isDebris)) continue;
                const pos1 = getAbsolutePos(p1, newStars, isMerged);
                const pos2 = getAbsolutePos(p2, newStars, isMerged);
                if (Math.hypot(pos1.x - pos2.x, pos1.y - pos2.y) < 14) {
                    if (!p1.isDebris || !p2.isDebris) {
                        const msg = `IMPACT: ${p1.id} hit ${p2.id}`;
                        if (!turnEvents.includes(msg)) turnEvents.push(msg);
                    }
                    newShips = newShips.filter(s => s.location !== p1.id && s.location !== p2.id);
                    p1.isDebris = true; p1.destroyed = false;
                    p2.isDebris = true; p2.destroyed = false; 
                }
            }
        }
        return { ...prev, stars: newStars, planets: newPlanets, ships: newShips, isMerged };
      });
      frames++;
      if (frames < maxFrames) animationRef.current = requestAnimationFrame(animate);
    };
    animate();
  };
  const restartGame = () => setGameState(INITIAL_STATE);
  return { gameState, selectPlanet, toggleAnchor, buildArkPart, commitTurn, buildMiner, deployMiner, recallMiner, restartGame, closeReport };
};