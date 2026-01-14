import React, { useState } from 'react';
import { useGameLoop } from './hooks/useGameLoop';
import { GameBoard } from './components/GameBoard';
import { TopBar } from './components/TopBar';
import { FleetPanel } from './components/FleetPanel';
import { PlanetMenu } from './components/PlanetMenu';
import { TurnResults } from './components/TurnResults'; // <--- Import

const styles = {
  container: { width: '100vw', height: '100vh', backgroundColor: '#000', color: 'white', fontFamily: 'monospace', overflow: 'hidden', position: 'relative' as 'relative' },
  gameOverOverlay: { position: 'absolute' as 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 100, display: 'flex', flexDirection: 'column' as 'column', alignItems: 'center', justifyContent: 'center' }
};

function App() {
  const { gameState, selectPlanet, toggleAnchor, buildArkPart, commitTurn, buildMiner, deployMiner, recallMiner, restartGame, closeReport } = useGameLoop();
  const [showArk, setShowArk] = useState(false);

  // --- GAME OVER SCREEN ---
  if (gameState.phase === 'game_over' || gameState.phase === 'victory' || gameState.phase === 'defeat') {
      const isWin = gameState.phase === 'victory';
      const isDefeat = gameState.phase === 'defeat';
      let title = "SYSTEM COLLAPSE";
      let color = "#f87171";
      if (isWin) { title = "ARK LAUNCH SUCCESSFUL"; color = "#4ade80"; }
      if (isDefeat) { title = "RIVAL ARK LAUNCHED - YOU FAILED"; color = "#f87171"; }

      return (
          <div style={styles.gameOverOverlay}>
              <h1 style={{ fontSize: '48px', color: color, marginBottom: '10px' }}>{title}</h1>
              <button onClick={restartGame} style={{ marginTop: '30px', padding: '15px 40px', backgroundColor: 'white', color: 'black', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>RESTART SIMULATION</button>
          </div>
      );
  }

  return (
    <div style={styles.container}>
      <GameBoard gameState={gameState} onSelectPlanet={(id) => { selectPlanet(id); setShowArk(false); }} />
      <TopBar gameState={gameState} onCommit={commitTurn} onBuildArk={buildArkPart} showArk={showArk} setShowArk={setShowArk} />
      <FleetPanel gameState={gameState} onBuildMiner={buildMiner} />
      
      {/* Turn Synopsis Popup */}
      {gameState.phase === 'results' && (
          <TurnResults report={gameState.turnReport} onClose={closeReport} />
      )}

      {gameState.selectedPlanetId && (
        <PlanetMenu gameState={gameState} onDeploy={deployMiner} onRecall={recallMiner} onAnchor={toggleAnchor} onClose={() => selectPlanet(null)} />
      )}
    </div>
  );
}
export default App;