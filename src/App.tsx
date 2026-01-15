import { useState } from 'react';
import { GameBoard } from './components/GameBoard';
import { TopBar } from './components/TopBar';
import { PlanetMenu } from './components/PlanetMenu';
import { useGameLoop } from './hooks/useGameLoop';

function App() {
  const { 
    gameState, selectPlanet, toggleAnchor, buildArkPart, commitTurn, 
    deployMiner, recallMiner, restartGame, closeReport 
  } = useGameLoop();

  const [showArkMenu, setShowArkMenu] = useState(false);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#000', position: 'relative' }}>
      <TopBar 
        gameState={gameState} 
        onCommit={commitTurn} 
        onBuildArk={buildArkPart}
        showArk={showArkMenu}
        setShowArk={setShowArkMenu}
      />
      
      <GameBoard gameState={gameState} onSelectPlanet={selectPlanet} />

      {gameState.selectedPlanetId && (
        <PlanetMenu 
            gameState={gameState}
            onDeploy={deployMiner}
            onRecall={recallMiner}
            onAnchor={toggleAnchor}
            onClose={() => selectPlanet(null)}
        />
      )}

      {/* Turn Report Overlay */}
      {gameState.turnReport && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid #475569', padding: '30px',
          borderRadius: '12px', color: '#e2e8f0', width: '400px', zIndex: 100,
          boxShadow: '0 0 50px rgba(0,0,0,0.8)'
        }}>
          <h2 style={{ marginTop: 0, color: '#facc15' }}>TURN {gameState.turn - 1} REPORT</h2>
          <ul style={{ maxHeight: '300px', overflowY: 'auto', paddingLeft: '20px' }}>
             {gameState.turnReport.map((line, i) => <li key={i} style={{ marginBottom: '5px', fontSize: '14px' }}>{line}</li>)}
          </ul>
          <button onClick={closeReport} style={{
             width: '100%', padding: '10px', marginTop: '20px', backgroundColor: '#2563eb',
             color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
          }}>ACKNOWLEDGE</button>
        </div>
      )}

      {/* Victory/Defeat Overlay */}
      {(gameState.phase === 'victory' || gameState.phase === 'defeat' || gameState.phase === 'game_over') && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center', zIndex: 200, color: 'white'
        }}>
            <h1 style={{ fontSize: '60px', color: gameState.phase === 'victory' ? '#4ade80' : '#ef4444', margin: 0 }}>
              {gameState.phase === 'victory' ? "MISSION ACCOMPLISHED" : "MISSION FAILED"}
            </h1>
            <p style={{ fontSize: '20px', color: '#94a3b8' }}>
              {gameState.phase === 'victory' ? "The Ark has successfully launched." : "The Singularity has consumed us."}
            </p>
            <button onClick={restartGame} style={{
              marginTop: '20px', padding: '15px 40px', fontSize: '18px', backgroundColor: 'white',
              color: 'black', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
            }}>RESTART SIMULATION</button>
        </div>
      )}
    </div>
  );
}

export default App;