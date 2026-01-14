import React from 'react';
import type { GameState } from '../types';

interface Props {
  gameState: GameState;
  onCommit: () => void;
  onBuildArk: (part: 'engines' | 'lifeSupport' | 'warpCore') => void;
  showArk: boolean;
  setShowArk: (show: boolean) => void;
}

const ARK_COSTS = {
  engines: { resource: 'FUEL', amount: 20 },
  lifeSupport: { resource: 'BIO', amount: 20 },
  warpCore: { resource: 'EXO', amount: 10 }
};

const styles = {
  container: { 
    position: 'absolute' as 'absolute', top: 0, left: 0, width: '100%', height: '60px',
    backgroundColor: 'rgba(15, 23, 42, 0.95)', borderBottom: '1px solid #334155',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px',
    zIndex: 20, boxSizing: 'border-box' as 'border-box'
  },
  sectionLeft: { display: 'flex', gap: '20px', alignItems: 'center', height: '100%', flex: '0 0 auto' },
  sectionRight: { display: 'flex', gap: '20px', alignItems: 'center', height: '100%', flex: '0 0 auto' },
  pill: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 'bold' as 'bold', fontFamily: 'monospace' },
  dot: { width: '8px', height: '8px', borderRadius: '50%', boxShadow: '0 0 5px currentColor' },
  arkBtn: {
    backgroundColor: '#334155', border: '1px solid #475569', color: '#cbd5e1',
    padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' as 'bold',
    minWidth: '140px', textAlign: 'center' as 'center'
  },
  commitBtn: {
    backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 24px',
    borderRadius: '4px', fontWeight: 'bold' as 'bold', cursor: 'pointer', height: '36px',
    marginLeft: '15px', boxShadow: '0 0 10px rgba(37, 99, 235, 0.3)',
  },
  dropdown: {
    position: 'absolute' as 'absolute', top: '65px', left: '20px', width: '280px',
    backgroundColor: 'rgba(15, 23, 42, 0.98)', border: '1px solid #475569', borderRadius: '8px',
    padding: '15px', zIndex: 30, boxShadow: '0 10px 25px rgba(0,0,0,0.8)',
  },
  messageBox: { 
    flex: '1 1 auto', textAlign: 'center' as 'center', fontSize: '12px', color: '#facc15', 
    opacity: 0.9, whiteSpace: 'nowrap' as 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    margin: '0 20px', backgroundColor: 'rgba(0,0,0,0.3)', padding: '4px 10px',
    borderRadius: '4px', border: '1px solid rgba(250, 204, 21, 0.2)'
  }
};

export const TopBar: React.FC<Props> = ({ gameState, onCommit, onBuildArk, showArk, setShowArk }) => {
  const isResolving = gameState.phase === 'resolving';
  const playerTotal = Math.floor((gameState.ark.engines + gameState.ark.lifeSupport + gameState.ark.warpCore) / 3);
  const rivalTotal = Math.floor((gameState.aiArk.engines + gameState.aiArk.lifeSupport + gameState.aiArk.warpCore) / 3);

  return (
    <>
      <div style={styles.container}>
        <div style={styles.sectionLeft}>
             <div style={{...styles.pill, color: '#f97316'}}>
                <div style={{...styles.dot, backgroundColor: '#f97316'}}></div> FUEL {gameState.resources.fuel}
             </div>
             <div style={{...styles.pill, color: '#4ade80'}}>
                <div style={{...styles.dot, backgroundColor: '#4ade80'}}></div> BIO {gameState.resources.biomass}
             </div>
             <div style={{...styles.pill, color: '#c084fc'}}>
                <div style={{...styles.dot, backgroundColor: '#c084fc'}}></div> EXO {gameState.resources.exotic}
             </div>
             <div style={{ width: '1px', height: '20px', backgroundColor: '#475569', margin: '0 5px' }}></div>
             <button onClick={(e) => { e.stopPropagation(); setShowArk(!showArk); }} style={styles.arkBtn}>
                {showArk ? "CLOSE MENU" : `ARK PROJECT: ${playerTotal}%`}
             </button>
        </div>

        <div style={styles.messageBox}>
            {gameState.gameMessage}
        </div>

        <div style={styles.sectionRight}>
            {/* RIVAL TRACKER */}
            <div style={{...styles.pill, color: '#f87171', border: '1px solid #7f1d1d', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'rgba(127, 29, 29, 0.2)'}}>
                <div style={{...styles.dot, backgroundColor: '#f87171', boxShadow: '0 0 8px #f87171'}}></div> 
                RIVAL ARK: {rivalTotal}%
            </div>

            <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Turn {gameState.turn}/{gameState.maxTurns}</div>
                <div style={{ color: '#22d3ee', fontWeight: 'bold', fontSize: '12px' }}>AP: {gameState.actionPoints} / 5</div>
            </div>
            <button onClick={onCommit} disabled={isResolving} style={{...styles.commitBtn, opacity: isResolving ? 0.5 : 1}}>
                {isResolving ? "WORKING..." : "COMMIT TURN"}
            </button>
        </div>
      </div>

      {showArk && (
         <div style={styles.dropdown} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#94a3b8', borderBottom: '1px solid #475569', paddingBottom: '5px', textTransform: 'uppercase' }}>Construction Bay</h3>
            {['engines', 'lifeSupport', 'warpCore'].map(part => {
                 const pKey = part as keyof typeof gameState.ark;
                 const val = gameState.ark[pKey] as number;
                 const cost = ARK_COSTS[pKey as keyof typeof ARK_COSTS];
                 const canAfford = gameState.resources[cost.resource.toLowerCase() === 'bio' ? 'biomass' : cost.resource.toLowerCase() === 'exo' ? 'exotic' : 'fuel'] >= cost.amount;
                 const isMax = val >= 100;

                 return (
                    <div key={part} style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase', color: '#cbd5e1' }}>
                            <span>{part}</span>
                            <span style={{ color: val >= 100 ? '#4ade80' : 'white' }}>{val}%</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', backgroundColor: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${val}%`, backgroundColor: val >= 100 ? '#4ade80' : '#3b82f6', transition: 'width 0.3s ease' }}></div>
                        </div>
                        <button 
                            onClick={() => onBuildArk(part as any)} 
                            disabled={!canAfford || isMax || gameState.actionPoints < 1}
                            style={{ 
                                width: '100%', marginTop: '5px', 
                                background: canAfford ? 'rgba(51, 65, 85, 0.5)' : 'rgba(30, 41, 59, 0.5)', 
                                border: `1px solid ${canAfford ? '#475569' : '#334155'}`, 
                                color: canAfford ? '#94a3b8' : '#475569', 
                                fontSize: '10px', cursor: canAfford ? 'pointer' : 'not-allowed', 
                                padding: '4px', borderRadius: '2px', textTransform: 'uppercase'
                            }}
                        >
                            {isMax ? "COMPLETED" : `BUILD (-${cost.amount} ${cost.resource})`}
                        </button>
                    </div>
                 );
            })}
         </div>
      )}
    </>
  );
};