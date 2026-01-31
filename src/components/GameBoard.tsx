import React from 'react';
import type { GameState } from '../types';

// Logic for curved ship travel paths
const getCurvedPos = (
    start: {x:number, y:number}, 
    end: {x:number, y:number}, 
    starCenter: {x:number, y:number}, 
    t: number
) => {
    const mx = (start.x + end.x) / 2;
    const my = (start.y + end.y) / 2;
    const dx = mx - starCenter.x;
    const dy = my - starCenter.y;
    const dist = Math.sqrt(dx*dx + dy*dy) || 1;
    const arcHeight = 100; // Visual height of the orbital arc
    
    const cx = mx + (dx / dist) * arcHeight;
    const cy = my + (dy / dist) * arcHeight;

    const oneMinusT = 1 - t;
    const x = oneMinusT * oneMinusT * start.x + 2 * oneMinusT * t * cx + t * t * end.x;
    const y = oneMinusT * oneMinusT * start.y + 2 * oneMinusT * t * cy + t * t * end.y;
    
    return { x, y };
};

interface Props {
  gameState: GameState;
  onSelectPlanet: (id: string | null) => void;
}

export const GameBoard: React.FC<Props> = ({ gameState, onSelectPlanet }) => {
  const alpha = gameState.stars.find(s => s.id === 'alpha')!;
  const beta = gameState.stars.find(s => s.id === 'beta')!;
  
  // Helper for static base positioning
  const getBasePos = (cx: number, cy: number, radius: number, angle: number) => {
      const rad = (angle * Math.PI) / 180;
      return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  const pBasePos = gameState.isMerged 
      ? getBasePos(600, 400, gameState.starbase.orbitRadius, gameState.starbase.angle)
      : getBasePos(alpha.position.x, alpha.position.y, gameState.starbase.orbitRadius, gameState.starbase.angle);
      
  const aiBasePos = gameState.isMerged
      ? getBasePos(600, 400, gameState.aiStarbase.orbitRadius, gameState.aiStarbase.angle)
      : getBasePos(beta.position.x, beta.position.y, gameState.aiStarbase.orbitRadius, gameState.aiStarbase.angle);

  const starDist = Math.abs(beta.position.x - alpha.position.x);
  const lobeRadius = starDist / 2.2;
  const rochePath = `
    M ${alpha.position.x} ${alpha.position.y - lobeRadius}
    Q ${alpha.position.x + starDist/2} ${alpha.position.y - 40} ${beta.position.x} ${beta.position.y - lobeRadius}
    A ${lobeRadius} ${lobeRadius} 0 1 1 ${beta.position.x} ${beta.position.y + lobeRadius}
    Q ${alpha.position.x + starDist/2} ${alpha.position.y + 40} ${alpha.position.x} ${alpha.position.y + lobeRadius}
    A ${lobeRadius} ${lobeRadius} 0 1 1 ${alpha.position.x} ${alpha.position.y - lobeRadius}
  `;

  return (
    <svg 
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, backgroundColor: '#020617' }} 
      viewBox="0 0 1200 800" 
      preserveAspectRatio="xMidYMid slice" 
      onClick={() => onSelectPlanet(null)}
    >
      <defs>
        <radialGradient id="gravityWell" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.15" />
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

      {/* Gravity Field Visualization */}
      <path d={rochePath} fill="url(#gravityWell)" stroke="#6366f1" strokeWidth="2" strokeDasharray="10 10" opacity={0.3}>
          <animate attributeName="stroke-dashoffset" from="0" to="20" dur="2s" repeatCount="indefinite" />
      </path>

      {/* Stars */}
      {gameState.stars.map(star => (
        <g key={star.id}>
          <circle cx={star.position.x} cy={star.position.y} r={star.deathRadius} fill={star.color} opacity="0.1" />
          <circle cx={star.position.x} cy={star.position.y} r={star.radius} fill={star.color} filter="url(#glow)" />
        </g>
      ))}

      {/* Bases */}
      <g transform={`translate(${pBasePos.x}, ${pBasePos.y})`}>
          <rect x="-8" y="-8" width="16" height="16" fill="#1e293b" stroke="#94a3b8" strokeWidth="2" />
          <text x="-20" y="-15" fill="#64748b" fontSize="8" fontWeight="bold">CMD</text>
      </g>
      <g transform={`translate(${aiBasePos.x}, ${aiBasePos.y})`}>
          <rect x="-8" y="-8" width="16" height="16" fill="#450a0a" stroke="#ef4444" strokeWidth="2" />
          <text x="-15" y="-15" fill="#fca5a5" fontSize="8" fontWeight="bold">RIVAL</text>
      </g>

      {/* Planets - Using Direct X/Y Coordinates */}
      {gameState.planets.map(planet => {
        if (planet.destroyed && !planet.isDebris) return null;

        let color = '#fbbf24'; 
        if (planet.resourceType === 'fuel') color = '#f97316'; 
        if (planet.resourceType === 'biomass') color = '#4ade80';
        if (planet.resourceType === 'exotic') color = '#c084fc'; 

        return (
          <g key={planet.id} onClick={(e) => { e.stopPropagation(); onSelectPlanet(planet.id); }} style={{ cursor: 'pointer' }}>
              {/* Unstable Indicator */}
              {planet.isUnstable && !planet.isDebris && (
                  <circle cx={planet.x} cy={planet.y} r={12} fill="none" stroke="#ef4444" strokeWidth="2" opacity="0.8">
                     <animate attributeName="r" values="12;16;12" dur="0.8s" repeatCount="indefinite" />
                     <animate attributeName="opacity" values="0.8;0;0.8" dur="0.8s" repeatCount="indefinite" />
                  </circle>
              )}
              {/* Selection Ring */}
              {gameState.selectedPlanetId === planet.id && (
                  <circle cx={planet.x} cy={planet.y} r={16} fill="none" stroke="white" strokeDasharray="4 2" strokeWidth="2">
                    <animateTransform attributeName="transform" type="rotate" from={`0 ${planet.x} ${planet.y}`} to={`360 ${planet.x} ${planet.y}`} dur="6s" repeatCount="indefinite"/>
                  </circle>
              )}
              {/* Planet Body */}
              <circle 
                cx={planet.x} 
                cy={planet.y} 
                r={planet.isDebris ? 2 : 4} 
                fill={planet.isDebris ? '#64748b' : color} 
                stroke={planet.isAnchored ? "#22d3ee" : "none"} 
                strokeWidth={2} 
              />
          </g>
        );
      })}

      {/* Ship Flight Paths */}
      {gameState.ships.map(ship => {
          if ((ship.status === 'traveling_out' || ship.status === 'traveling_back') && ship.location) {
              const planet = gameState.planets.find(p => p.id === ship.location);
              if (planet) {
                  const parent = gameState.stars.find(s => s.id === planet.parentStarId)!;
                  let startBase = ship.owner === 'player' ? pBasePos : aiBasePos;
                  
                  const t = ship.travelProgress / 100;
                  const startX = ship.status === 'traveling_out' ? startBase.x : planet.x;
                  const startY = ship.status === 'traveling_out' ? startBase.y : planet.y;
                  const endX = ship.status === 'traveling_out' ? planet.x : startBase.x;
                  const endY = ship.status === 'traveling_out' ? planet.y : startBase.y;
                  
                  const curPos = getCurvedPos({x: startX, y: startY}, {x: endX, y: endY}, parent.position, t);

                  return (
                    <circle 
                        key={ship.id} 
                        cx={curPos.x} 
                        cy={curPos.y} 
                        r={ship.type === 'fighter' ? 3 : 2} 
                        fill={ship.owner === 'player' ? (ship.type === 'fighter' ? '#c084fc' : 'white') : '#ef4444'} 
                    />
                  );
              }
          }
          return null;
      })}

      {/* Explosions */}
      {gameState.explosions.map(exp => (
          <circle key={exp.id} cx={exp.x} cy={exp.y} r={exp.radius} fill={exp.color} opacity={exp.opacity} />
      ))}
    </svg>
  );
};