import React from 'react';
import type { GameState } from '../types';
import { isPlanetMineable } from '../hooks/useGameLoop';

interface Props {
  gameState: GameState;
  onDeploy: (id: string) => void;
  onDeployFighter: (id: string) => void; // NEW
  onRecall: (id: string) => void;
  onAnchor: (id: string) => void;
  onClose: () => void;
}

const styles = {
  popup: { 
    position: 'absolute' as 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    backgroundColor: '#0f172a', border: '2px solid #94a3b8', padding: '20px', borderRadius: '12px',
    zIndex: 50, width: '320px', boxShadow: '0 0 50px rgba(0,0,0,1)'
  },
  btn: { 
    width: '100%', padding: '12px', margin: '8px 0', cursor: 'pointer', backgroundColor: '#1e293b',
    color: 'white', border: '1px solid #475569', borderRadius: '4px', 
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    fontWeight: 'bold' as 'bold', fontSize: '12px'
  },
  iconBox: { display: 'flex', alignItems: 'center', gap: '10px' },
  indicator: { width: '10px', height: '10px', borderRadius: '2px', display: 'inline-block' },
  closeBtn: { background: 'none', border: 'none', color: '#64748b', fontSize: '10px', marginTop: '10px', cursor: 'pointer', width: '100%', textTransform: 'uppercase' as 'uppercase' }
};

export const PlanetMenu: React.FC<Props> = ({ gameState, onDeploy, onDeployFighter, onRecall, onAnchor, onClose }) => {
  const selectedPlanet = gameState.planets.find(p => p.id === gameState.selectedPlanetId);
  if (!selectedPlanet) return null;

  const idleMiners = gameState.ships.filter(s => s.status === 'idle' && s.type === 'miner').length;
  const idleFighters = gameState.ships.filter(s => s.status === 'idle' && s.type === 'fighter').length;
  
  const isMineable = isPlanetMineable(selectedPlanet);
  const shipHere = gameState.ships.find(s => s.location === selectedPlanet.id && s.status === 'deployed' && s.owner === 'player');
  const enemyHere = gameState.ships.find(s => s.location === selectedPlanet.id && s.status === 'deployed' && s.owner === 'ai');

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
      <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
          {subTitle}
      </div>

      {shipHere ? (
          <button onClick={() => onRecall(selectedPlanet.id)} disabled={gameState.actionPoints < 1} style={styles.btn}>
              <div style={styles.iconBox}>
                  <div style={{ ...styles.indicator, backgroundColor: '#f59e0b' }}></div>
                  <span>RECALL SHIP</span>
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

            {enemyHere && (
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