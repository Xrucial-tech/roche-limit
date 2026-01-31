import React from 'react';
import type { GameState } from '../types';

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
    const arcHeight = 100; 
    const cx = mx + (dx / dist) * arcHeight;
    const cy = my + (dy / dist) * arcHeight;
    const oneMinusT = 1 - t;
    return {
        x: oneMinusT * oneMinusT * start.x + 2 * oneMinusT * t * cx + t * t * end.x,
        y: oneMinusT * oneMinusT * start.y + 2 * oneMinusT * t * cy + t * t * end.y
    };
};

interface Props {
  gameState: GameState;
  onSelectPlanet: (id: string | null) => void;
}

export const GameBoard: React.FC<Props> = ({ gameState, onSelectPlanet }) => {
  const alpha = gameState.stars.find(s => s.id === 'alpha')!;
  const beta = gameState.stars.find(s => s.id === 'beta')!;
  
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
  const baseLobeSize = 120; // Static size to prevent stretching
  const bridgeWidth = Math.max(20, 150 - (starDist / 4)); 

  const rochePath = `
    M ${alpha.position.x} ${alpha.position.y - baseLobeSize}
    Q ${alpha.position.x + starDist/2} ${alpha.position.y - bridgeWidth} ${beta.position.x} ${beta.position.y - baseLobeSize}
    A ${baseLobeSize} ${baseLobeSize} 0 1 1 ${beta.position.x} ${beta.position.y + baseLobeSize}
    Q ${alpha.position.x + starDist/2} ${alpha.position.y + bridgeWidth} ${alpha.position.x} ${alpha.position.y + baseLobeSize}
    A ${baseLobeSize} ${baseLobeSize} 0 1 1 ${alpha.position.x} ${alpha.position.y - baseLobeSize}
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
            <feGaussianBlur stdDeviation="12" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <path d={rochePath} fill="url(#gravityWell)" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="8 4" opacity={0.4}>
          <animate attributeName="stroke-dashoffset" from="0" to="12" dur="3s" repeatCount="indefinite" />
      </path>

      {/* STARS & COLLISION */}
      {gameState.isMerged ? (
          <g>
              <circle cx={600} cy={400} r={120} fill="url(#purpleCore)" filter="url(#glow)">
                  <animate attributeName="r" values="110;130;110" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx={600} cy={400} r={35} fill="white" filter="url(#glow)" />
          </g>
      ) : (
          gameState.stars.map(star => (
            <g key={star.id}>
              <line x1={alpha.position.x} y1={alpha.position.y} x2={beta.position.x} y2={beta.position.y} stroke="#6366f1" strokeWidth={Math.max(0, 40 - starDist/12)} opacity={0.4} filter="url(#glow)" />
              <circle cx={star.position.x} cy={star.position.y} r={star.deathRadius} fill={star.color} opacity="0.1" />
              <circle cx={star.position.x} cy={star.position.y} r={star.radius} fill={star.color} filter="url(#glow)" />
            </g>
          ))
      )}

      {/* BASES */}
      <g transform={`translate(${pBasePos.x}, ${pBasePos.y})`}>
          <rect x="-8" y="-8" width="16" height="16" fill="#1e293b" stroke="#94a3b8" strokeWidth="2" />
          <text x="-20" y="-15" fill="#64748b" fontSize="8" fontWeight="bold">CMD</text>
      </g>
      <g transform={`translate(${aiBasePos.x}, ${aiBasePos.y})`}>
          <rect x="-8" y="-8" width="16" height="16" fill="#450a0a" stroke="#ef4444" strokeWidth="2" />
          <text x="-15" y="-15" fill="#fca5a5" fontSize="8" fontWeight="bold">RIVAL</text>
      </g>

      {/* PLANETS */}
      {gameState.planets.map(planet => {
        if (planet.destroyed && !planet.isDebris) return null;
        let color = '#fbbf24'; 
        if (planet.resourceType === 'fuel') color = '#f97316'; 
        if (planet.resourceType === 'biomass') color = '#4ade80';
        if (planet.resourceType === 'exotic') color = '#c084fc'; 

        return (
          <g key={planet.id} onClick={(e) => { e.stopPropagation(); onSelectPlanet(planet.id); }} style={{ cursor: 'pointer' }}>
              {planet.isUnstable && !planet.isDebris && (
                  <circle cx={planet.x} cy={planet.y} r={12} fill="none" stroke="#ef4444" strokeWidth="2" opacity="0.8">
                     <animate attributeName="r" values="12;16;12" dur="0.8s" repeatCount="indefinite" />
                  </circle>
              )}
              {gameState.selectedPlanetId === planet.id && (
                  <circle cx={planet.x} cy={planet.y} r={16} fill="none" stroke="white" strokeDasharray="4 2" strokeWidth="2">
                    <animateTransform attributeName="transform" type="rotate" from={`0 ${planet.x} ${planet.y}`} to={`360 ${planet.x} ${planet.y}`} dur="6s" repeatCount="indefinite"/>
                  </circle>
              )}
              <circle cx={planet.x} cy={planet.y} r={planet.isDebris ? 2 : 4} fill={planet.isDebris ? '#64748b' : color} stroke={planet.isAnchored ? "#22d3ee" : "none"} strokeWidth={2} />
          </g>
        );
      })}

      {/* SHIP PATHS */}
      {gameState.ships.map(ship => {
          if ((ship.status === 'traveling_out' || ship.status === 'traveling_back') && ship.location) {
              const planet = gameState.planets.find(p => p.id === ship.location);
              if (planet) {
                  const parent = gameState.stars.find(s => s.id === planet.parentStarId)!;
                  let startBase = ship.owner === 'player' ? pBasePos : aiBasePos;
                  const t = ship.travelProgress / 100;
                  const curPos = getCurvedPos(
                      {x: ship.status === 'traveling_out' ? startBase.x : planet.x, y: ship.status === 'traveling_out' ? startBase.y : planet.y},
                      {x: ship.status === 'traveling_out' ? planet.x : startBase.x, y: ship.status === 'traveling_out' ? planet.y : startBase.y},
                      parent.position, t
                  );
                  return <circle key={ship.id} cx={curPos.x} cy={curPos.y} r={ship.type === 'fighter' ? 3 : 2} fill={ship.owner === 'player' ? (ship.type === 'fighter' ? '#c084fc' : 'white') : '#ef4444'} />;
              }
          }
          return null;
      })}

      {/* EXPLOSIONS */}
      {gameState.explosions.map(exp => (
          <circle key={exp.id} cx={exp.x} cy={exp.y} r={exp.radius} fill={exp.color} opacity={exp.opacity} filter="url(#glow)" />
      ))}
    </svg>
  );
};