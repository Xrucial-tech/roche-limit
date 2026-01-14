import type { GameState, Planet, Ship } from '../types';

// Helper to calculate cost (Same as player for now)
const MINER_COST = { fuel: 10, biomass: 10 };

/**
 * The AI Brain.
 * Analyzes the galaxy and returns updated Resources, Ark Progress, and Fleet Orders.
 */
export const processAI = (gameState: GameState, planets: Planet[], currentShips: Ship[]) => {
    // 1. Clone mutable data to avoid side-effects
    let nextShips = [...currentShips];
    let nextResources = { ...gameState.aiResources };
    let nextArk = { ...gameState.aiArk };

    // --- DECISION 1: BUILD MINERS ---
    // AI Strategy: Aggressively expand fleet up to 8 ships if resources allow
    const aiShips = nextShips.filter(s => s.owner === 'ai');
    if (nextResources.fuel >= MINER_COST.fuel && nextResources.biomass >= MINER_COST.biomass && aiShips.length < 8) {
        // Pay Cost
        nextResources.fuel -= MINER_COST.fuel;
        nextResources.biomass -= MINER_COST.biomass;
        
        // Add Ship
        nextShips.push({
            id: `ai-${Date.now()}-${Math.random()}`,
            owner: 'ai',
            type: 'miner',
            status: 'idle',
            location: null,
            travelProgress: 0
        });
    }

    // --- DECISION 2: DEPLOY FLEET ---
    // AI Strategy: Find safe, rich planets near its base (Beta Star)
    const idleMiners = nextShips.filter(s => s.owner === 'ai' && s.status === 'idle');
    
    idleMiners.forEach(miner => {
        // Find a target:
        // 1. Must be orbiting Beta (AI Home)
        // 2. Not destroyed or debris
        // 3. Not unstable (AI plays it safe)
        // 4. No other ship is already there
        const target = planets.find(p => 
            p.parentStarId === 'beta' && 
            !p.destroyed && 
            !p.isDebris && 
            !p.isUnstable && 
            !nextShips.find(s => s.location === p.id)
        );

        if (target) {
            // Deploy miner
            miner.status = 'traveling_out';
            miner.location = target.id;
            miner.travelProgress = 0;
        }
    });

    // --- DECISION 3: CONSTRUCT ARK ---
    // AI Strategy: Randomly build parts if it has excess resources (>20)
    // It prioritizes Engines first, then the rest.
    
    // Check if we can afford a build (Cost 20/20 or 10 exotic)
    if (nextResources.fuel >= 20 && nextResources.biomass >= 20) {
        const parts: ('engines' | 'lifeSupport' | 'warpCore')[] = ['engines', 'lifeSupport', 'warpCore'];
        
        // Simple heuristic: Try to build the lowest progress part
        parts.sort((a, b) => nextArk[a] - nextArk[b]);
        const targetPart = parts[0];

        if (nextArk[targetPart] < 100) {
            nextArk[targetPart] += 20;
            nextResources.fuel -= 20;
            nextResources.biomass -= 20;
        }
    }

    // Return the updated state deltas
    return {
        resources: nextResources,
        ark: nextArk,
        ships: nextShips
    };
};