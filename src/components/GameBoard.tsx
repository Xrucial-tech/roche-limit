import React from 'react';
import type { GameState } from '../types';

const getPosition = (cx: number, cy: number, radius: number, angle: number) => {
  const rad = (angle * Math.PI) / 180;
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
};
const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

interface Props {
  gameState: GameState;
  onSelectPlanet: (id: string | null) => void;
}

export const GameBoard: React.FC<Props> = ({ gameState, onSelectPlanet }) => {
  const alpha = gameState.stars.find(s => s.id === 'alpha')!;
  const beta = gameState.stars.find(s => s.id === 'beta')!;
  
  const pBasePos = gameState.isMerged 
      ? getPosition(600, 400, gameState.starbase.orbitRadius, gameState.starbase.angle)
      : getPosition(alpha.position.x, alpha.position.y, gameState.starbase.orbitRadius, gameState.starbase.angle);
      
  const aiBasePos = gameState.isMerged
      ? getPosition(600, 400, gameState.aiStarbase.orbitRadius, gameState.aiStarbase.angle)
      : getPosition(beta.position.x, beta.position.y, gameState.aiStarbase.orbitRadius, gameState.aiStarbase.angle);

  const starDist = Math.abs(beta.position.x - alpha.position.x);
  const mergeFactor = Math.max(0, (400 - starDist) / 300); 
  const purpleRadius = 40 + (mergeFactor * 40);

  const lobeRadius = starDist / 2.2;
  const rochePath = `
    M ${alpha.position.x} ${alpha.position.y - lobeRadius}
    Q ${alpha.position.x + starDist/2} ${alpha.position.y - 40} ${beta.position.x} ${beta.position.y - lobeRadius}
    A ${lobeRadius} ${lobeRadius} 0 1 1 ${beta.position.x} ${beta.position.y + lobeRadius}
    Q ${alpha.position.x + starDist/2} ${alpha.position.y + 40} ${alpha.position.x} ${alpha.position.y + lobeRadius}
    A ${lobeRadius} ${lobeRadius} 0 1 1 ${alpha.position.x} ${alpha.position.y - lobeRadius}
  `;

  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, backgroundColor: '#020617' }} viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" onClick={() => onSelectPlanet(null)}>
      
      <defs>
        <radialGradient id="gravityWell" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="purpleCore" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="#d8b4fe" stopOpacity="1" />
            <stop offset="40%" stopColor="#a855f7" stopOpacity="0.8" />
            <stop offset="80%" stopColor="#581c87" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <filter id="glow">
            <feGaussianBlur stdDeviation="10" result="coloredBlur"/>
            <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        </filter>
      </defs>

      <path d={rochePath} fill="url(#gravityWell)" stroke="#6366f1" strokeWidth="2" strokeDasharray="10 10" opacity={0.3}>
          <animate attributeName="stroke-dashoffset" from="0" to="20" dur="2s" repeatCount="indefinite" />
      </path>

      {/* LAYER 1: ORBIT RINGS (Drawn FIRST so they go under stars) */}
      {gameState.planets.map(planet => {
        if (planet.destroyed && !planet.isDebris) return null;
        const parent = gameState.stars.find(s => s.id === planet.parentStarId)!;
        let cx = parent.position.x;
        let cy = parent.position.y;
        if (gameState.isMerged) { cx = 600; cy = 400; }

        return (
            <circle key={`ring-${planet.id}`} cx={cx} cy={cy} r={planet.orbitRadius} fill="none" stroke={planet.parentStarId === 'alpha' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)'} strokeWidth="1" />
        );
      })}

      {/* LAYER 2: STARS (Opaque, will cover rings) */}
      {gameState.isMerged ? (
          <g>
              <circle cx={600} cy={400} r={purpleRadius + 60} fill="url(#purpleCore)" filter="url(#glow)">
                  <animate attributeName="r" values={`${purpleRadius + 50};${purpleRadius + 70};${purpleRadius + 50}`} dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx={600} cy={400} r={40} fill="white" />
          </g>
      ) : (
          gameState.stars.map(star => (
            <g key={star.id} transform={`rotate(${star.currentAngle}, ${star.position.x}, ${star.position.y})`}>
              <circle cx={star.position.x} cy={star.position.y} r={star.deathRadius} fill={star.color} opacity="0.1" />
              <circle cx={star.position.x} cy={star.position.y} r={star.radius} fill={star.color} />
              {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
                 <line key={deg} x1={star.position.x} y1={star.position.y} x2={star.position.x + (star.radius + 15) * Math.cos(deg * Math.PI / 180)} y2={star.position.y + (star.radius + 15) * Math.sin(deg * Math.PI / 180)} stroke={star.color} strokeWidth="2" opacity="0.3" />
              ))}
            </g>
          ))
      )}

      {/* LAYER 3: BASES */}
      <circle cx={gameState.isMerged ? 600 : alpha.position.x} cy={gameState.isMerged ? 400 : alpha.position.y} r={gameState.starbase.orbitRadius} fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="10 5" opacity="0.3" />
      <g transform={`translate(${pBasePos.x}, ${pBasePos.y})`}>
          <rect x="-8" y="-8" width="16" height="16" fill="#1e293b" stroke="#94a3b8" strokeWidth="2" />
          <text x="-20" y="-15" fill="#64748b" fontSize="8">CMD</text>
      </g>
      
      <circle cx={gameState.isMerged ? 600 : beta.position.x} cy={gameState.isMerged ? 400 : beta.position.y} r={gameState.aiStarbase.orbitRadius} fill="none" stroke="#451a03" strokeWidth="1" strokeDasharray="10 5" opacity="0.3" />
      <g transform={`translate(${aiBasePos.x}, ${aiBasePos.y})`}>
          <rect x="-8" y="-8" width="16" height="16" fill="#450a0a" stroke="#ef4444" strokeWidth="2" />
          <text x="-15" y="-15" fill="#fca5a5" fontSize="8">ENEMY</text>
      </g>

      {/* LAYER 4: PLANET BODIES (Drawn ON TOP of stars) */}
      {gameState.planets.map(planet => {
        if (planet.destroyed && !planet.isDebris) return null;

        const parent = gameState.stars.find(s => s.id === planet.parentStarId)!;
        let cx = parent.position.x;
        let cy = parent.position.y;
        if (gameState.isMerged) { cx = 600; cy = 400; }
        const pos = getPosition(cx, cy, planet.orbitRadius, planet.angle);

        let color = '#fbbf24'; 
        if (planet.resourceType === 'fuel') color = '#f97316'; 
        if (planet.resourceType === 'biomass') color = '#4ade80';
        if (planet.resourceType === 'exotic') color = '#c084fc'; 

        if (planet.isDebris) {
             return (
                 <g 
                    key={planet.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={(e) => { e.stopPropagation(); onSelectPlanet(planet.id); }}
                    style={{ cursor: 'pointer' }}
                 >
                     <circle r={8} fill="#4b5563" opacity="0.8" />
                     <circle r={2} cx={-4} cy={3} fill="#9ca3af" />
                     <circle r={3} cx={4} cy={-2} fill="#6b7280" />
                     <circle r={1} cx={0} cy={5} fill="#9ca3af" />
                     {gameState.ships.map(s => {
                        if(s.location === planet.id && s.status === 'deployed') return <circle key={s.id} cx={0} cy={-8} r={2} fill={s.owner === 'player' ? '#10b981' : '#ef4444'} />
                        return null;
                    })}
                 </g>
            );
        }

        return (
          <g key={planet.id} onClick={(e) => { e.stopPropagation(); onSelectPlanet(planet.id); }} style={{ cursor: 'pointer', transition: 'all 0.5s' }}>
              {planet.isUnstable && (
                  <circle cx={pos.x} cy={pos.y} r={12} fill="none" stroke="#ef4444" strokeWidth="2" opacity="0.8">
                     <animate attributeName="r" values="12;16;12" dur="0.8s" repeatCount="indefinite" />
                     <animate attributeName="opacity" values="0.8;0;0.8" dur="0.8s" repeatCount="indefinite" />
                  </circle>
              )}
              {gameState.selectedPlanetId === planet.id && (
                  <circle cx={pos.x} cy={pos.y} r={16} fill="none" stroke="white" strokeDasharray="4 2" strokeWidth="2">
                  <animateTransform attributeName="transform" type="rotate" from={`0 ${pos.x} ${pos.y}`} to={`360 ${pos.x} ${pos.y}`} dur="6s" repeatCount="indefinite"/>
                  </circle>
              )}
              <circle cx={pos.x} cy={pos.y} r={4} fill={color} stroke={planet.isAnchored ? "cyan" : "rgba(255,255,255,0.3)"} strokeWidth={planet.isAnchored ? 2 : 0.5} />
              {gameState.ships.map(s => {
                  if(s.location === planet.id && s.status === 'deployed') {
                      return <circle key={s.id} cx={pos.x} cy={pos.y - 8} r={2} fill={s.owner === 'player' ? '#10b981' : '#ef4444'} />
                  }
                  return null;
              })}
          </g>
        );
      })}

      {/* LAYER 5: SHIPS (Travelling) */}
      {gameState.ships.map(ship => {
          if ((ship.status === 'traveling_out' || ship.status === 'traveling_back') && ship.location) {
              const planet = gameState.planets.find(p => p.id === ship.location);
              if (planet) {
                  const parent = gameState.stars.find(s => s.id === planet.parentStarId)!;
                  let startBase = ship.owner === 'player' ? pBasePos : aiBasePos;
                  let destCx = parent.position.x;
                  let destCy = parent.position.y;
                  if (gameState.isMerged) { destCx = 600; destCy = 400; }
                  const dest = getPosition(destCx, destCy, planet.orbitRadius, planet.angle);
                  const t = ship.travelProgress / 100;
                  const startX = ship.status === 'traveling_out' ? startBase.x : dest.x;
                  const startY = ship.status === 'traveling_out' ? startBase.y : dest.y;
                  const endX = ship.status === 'traveling_out' ? dest.x : startBase.x;
                  const endY = ship.status === 'traveling_out' ? dest.y : startBase.y;
                  return <circle key={ship.id} cx={lerp(startX, endX, t)} cy={lerp(startY, endY, t)} r={2} fill={ship.owner === 'player' ? 'white' : '#ef4444'} />;
              }
          }
          return null;
      })}
    </svg>
  );
};