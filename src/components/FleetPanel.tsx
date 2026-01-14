import React from 'react';
import type { GameState } from '../types';

interface Props {
  gameState: GameState;
  onBuildMiner: () => void;
}

const styles = {
  container: {
    position: 'absolute' as 'absolute', bottom: '20px', left: '20px', width: '220px',
    backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid #334155', borderRadius: '8px',
    padding: '12px', zIndex: 10,
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #334155', paddingBottom: '5px' },
  btn: { width: '100%', backgroundColor: '#334155', border: '1px solid #475569', color: 'white', padding: '6px', fontSize: '10px', cursor: 'pointer', borderRadius: '4px' }
};

export const FleetPanel: React.FC<Props> = ({ gameState, onBuildMiner }) => {
  const idleShips = gameState.ships.filter(s => s.status === 'idle').length;

  return (
    <div style={styles.container}>
       <div style={styles.header}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#cbd5e1' }}>FLEET COMMAND</span>
          <span style={{ fontSize: '10px', color: '#94a3b8' }}>{idleShips} IDLE</span>
       </div>
       <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '8px' }}>
           Active Units: {gameState.ships.length}
       </div>
       <button onClick={onBuildMiner} style={styles.btn}>
          BUILD MINER (-10 Fuel/Bio)
       </button>
    </div>
  );
};