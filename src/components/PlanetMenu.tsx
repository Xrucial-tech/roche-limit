import React from 'react';
import type { GameState } from '../types';
import { isPlanetMineable } from '../hooks/useGameLoop';

interface Props {
  gameState: GameState;
  onDeploy: (id: string) => void;
  onDeployFighter: (id: string) => void;
  onWarp: (id: string, type: 'miner' | 'fighter') => void; // NEW
  onRecall: (id: string) => void;
  onAnchor: (id: string) => void;
  onClose: () => void;
}

const styles = {
  popup: { 
    position: 'absolute' as 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    backgroundColor: '#0f172a', border: '2px solid #94a3b8', padding: '20px', borderRadius: '12px',
    zIndex: 50, width: '340px', boxShadow: '0 0 50px rgba(0,0,0,1)'
  },
  btn: { 
    width: '100%', padding: '12px', margin: '8px 0', cursor: 'pointer', backgroundColor: '#1e293b',
    color: 'white', border: '1px solid #475569', borderRadius: '4px', 
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    fontWeight: 'bold' as 'bold', fontSize: '12px'
  },
  warpBtn: {
    width: '100%', padding: '12px', margin: '8px 0', cursor: 'pointer', backgroundColor: '#4c1d95',
    color: '#e9d5ff', border: '1px solid #8b5cf6', borderRadius: '4px', 
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    fontWeight: 'bold' as 'bold', fontSize: '12px'
  },
  iconBox: { display: 'flex', alignItems: 'center', gap: '10px' },
  indicator: { width: '10px', height: '10px', borderRadius: '2px', display: 'inline-block' },
  closeBtn: { background: 'none', border: 'none', color: '#64748b', fontSize: '10px', marginTop: '10px', cursor: 'pointer', width: '100%', textTransform: 'uppercase' as 'uppercase' },
  manifestItem: {
      display: 'flex', justifyContent: 'space-between', padding: '8px', 
      backgroundColor: 'rgba(0,0,0,0.3)', marginBottom: '4px', borderRadius: '4px', fontSize: '11px'
  }
};

export const PlanetMenu: React.FC<Props> = ({ gameState, onDeploy, onDeployFighter, onWarp, onRecall, onAnchor, onClose }) => {
  const selectedPlanet = gameState.planets.find(p => p.id === gameState.selectedPlanetId);
  if (!selectedPlanet) return null;

  const idleMiners = gameState.ships.filter(s => s.status === 'idle' && s.type === 'miner').length;
  const idleFighters = gameState.ships.filter(s => s.status === 'idle' && s.type === 'fighter').length;
  
  const isMineable = isPlanetMineable(selectedPlanet);
  
  const shipsOnPlanet = gameState.ships.filter(s => s.location === selectedPlanet.id && s.status === 'deployed');
  const myShips = shipsOnPlanet.filter(s => s.owner === 'player');
  const enemyShips = shipsOnPlanet.filter(s => s.owner === 'ai');

  const title = selectedPlanet.isDebris ? "ASTEROID SCANNER" : selectedPlanet.id.toUpperCase();
  const subTitle = selectedPlanet.isDebris 
        ? `YIELD: 5 ${selectedPlanet.resourceType.toUpperCase()} (DEBRIS)`
        : `YIELD: 10 ${selectedPlanet.resourceType.toUpperCase()} (STABLE)`;

  return (
    <div style={styles.popup} onClick={(e) => e.stopPropagation()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
          <h2 style={{ margin: 0, color: 'white' }}>{title}</h2>
          {!selectedPlanet.isDebris && <span style={{ fontSize: '10px', color: '#64748b' }}>SPEED: {Math.abs(selectedPlanet.orbitSpeed).toFixed(1)}</span>}
      </div>
      <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '15px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
          {subTitle}
      </div>

      {shipsOnPlanet.length > 0 && (
          <div style={{ marginBottom: '15px' }}>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', marginBottom: '5px' }}>Orbital Manifest</div>
              {shipsOnPlanet.map(ship => (
                  <div key={ship.id} style={styles.manifestItem}>
                      <span style={{ 
                          color: ship.owner === 'player' ? (ship.type === 'fighter' ? '#c084fc' : '#10b981') : '#ef4444',
                          fontWeight: 'bold' 
                      }}>
                          {ship.owner === 'player' ? "PLAYER" : "ENEMY"} {ship.type.toUpperCase()}
                      </span>
                      <span style={{ color: '#94a3b8' }}>{ship.id.split('-')[1]}</span>
                  </div>
              ))}
          </div>
      )}

      {myShips.length > 0 ? (
          <button onClick={() => onRecall(selectedPlanet.id)} disabled={gameState.actionPoints < 1} style={styles.btn}>
              <div style={styles.iconBox}>
                  <div style={{ ...styles.indicator, backgroundColor: '#f59e0b' }}></div>
                  <span>RECALL FLEET</span>
              </div>
              <span>1 AP</span>
          </button>
      ) : (
          <>
            <button 
                onClick={() => onDeploy(selectedPlanet.id)} 
                disabled={gameState.actionPoints < 1 || idleMiners === 0 || !isMineable} 
                style={{...styles.btn, opacity: (gameState.actionPoints < 1 || idleMiners === 0 || !isMineable) ? 0.5 : 1}}
            >
                <div style={styles.iconBox}>
                    <div style={{ ...styles.indicator, backgroundColor: '#10b981' }}></div>
                    <span>DEPLOY MINER</span>
                </div>
                <span>1 AP</span>
            </button>

            {enemyShips.length > 0 && (
                <button 
                    onClick={() => onDeployFighter(selectedPlanet.id)} 
                    disabled={gameState.actionPoints < 1 || idleFighters === 0} 
                    style={{...styles.btn, opacity: (gameState.actionPoints < 1 || idleFighters === 0) ? 0.5 : 1, borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)'}}
                >
                    <div style={styles.iconBox}>
                        <div style={{ ...styles.indicator, backgroundColor: '#ef4444' }}></div>
                        <span>DEPLOY STARSHIP (COMBAT)</span>
                    </div>
                    <span>1 AP</span>
                </button>
            )}

            {/* EMERGENCY WARP BUTTON */}
            {gameState.resources.fuel >= 50 && (idleFighters > 0 || idleMiners > 0) && (
                <button 
                    onClick={() => onWarp(selectedPlanet.id, idleFighters > 0 ? 'fighter' : 'miner')}
                    disabled={gameState.actionPoints < 2}
                    style={{...styles.warpBtn, opacity: gameState.actionPoints < 2 ? 0.5 : 1}}
                >
                    <div style={styles.iconBox}>
                        <div style={{ ...styles.indicator, backgroundColor: '#8b5cf6', boxShadow: '0 0 5px #8b5cf6' }}></div>
                        <span>EMERGENCY WARP</span>
                    </div>
                    <span>2 AP / 50 FUEL</span>
                </button>
            )}
          </>
      )}

      {!selectedPlanet.isDebris && (
          <button onClick={() => onAnchor(selectedPlanet.id)} disabled={gameState.actionPoints < 1} style={{...styles.btn, borderColor: selectedPlanet.isAnchored ? '#22d3ee' : '#475569'}}>
              <div style={styles.iconBox}>
                   <div style={{ ...styles.indicator, backgroundColor: selectedPlanet.isAnchored ? '#22d3ee' : '#64748b' }}></div>
                   <span>{selectedPlanet.isAnchored ? "RELEASE ANCHOR" : "GRAVITY ANCHOR"}</span>
              </div>
              <span>1 AP</span>
          </button>
      )}

      <button onClick={onClose} style={styles.closeBtn}>CLOSE MENU</button>
    </div>
  );
};