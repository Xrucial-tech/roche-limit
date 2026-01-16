import type { GameState, Planet, Ship } from '../types';

const MINER_COST = { fuel: 10, biomass: 10 };
const FIGHTER_COST = { fuel: 20, exotic: 10 }; // Expensive but deadly

export const processAI = (gameState: GameState, planets: Planet[], currentShips: Ship[]) => {
    let nextShips = [...currentShips];
    let nextResources = { ...gameState.aiResources };
    let nextArk = { ...gameState.aiArk };

    // --- DECISION 1: BUILD SHIPS (Mixed Fleet) ---
    const aiShips = nextShips.filter(s => s.owner === 'ai');
    
    // Strategy: Maintain a ratio of 1 Fighter for every 3 Miners
    const numMiners = aiShips.filter(s => s.type === 'miner').length;
    const numFighters = aiShips.filter(s => s.type === 'fighter').length;
    
    // 1a. Build Fighter if we have resources and need protection
    if (nextResources.fuel >= FIGHTER_COST.fuel && nextResources.exotic >= FIGHTER_COST.exotic && numFighters < Math.ceil(numMiners / 3)) {
        nextResources.fuel -= FIGHTER_COST.fuel;
        nextResources.exotic -= FIGHTER_COST.exotic;
        nextShips.push({
            id: `ai-f-${Date.now()}-${Math.random()}`,
            owner: 'ai',
            type: 'fighter',
            status: 'idle',
            location: null,
            travelProgress: 0
        });
    }
    // 1b. Build Miner if we are low on fleet
    else if (nextResources.fuel >= MINER_COST.fuel && nextResources.biomass >= MINER_COST.biomass && aiShips.length < 8) {
        nextResources.fuel -= MINER_COST.fuel;
        nextResources.biomass -= MINER_COST.biomass;
        nextShips.push({
            id: `ai-m-${Date.now()}-${Math.random()}`,
            owner: 'ai',
            type: 'miner',
            status: 'idle',
            location: null,
            travelProgress: 0
        });
    }

    // --- DECISION 2: DEPLOY MINERS ---
    const idleMiners = nextShips.filter(s => s.owner === 'ai' && s.status === 'idle' && s.type === 'miner');
    idleMiners.forEach(miner => {
        const target = planets.find(p => 
            p.parentStarId === 'beta' && !p.destroyed && !p.isDebris && !p.isUnstable && 
            !nextShips.find(s => s.location === p.id && s.owner === 'ai')
        );
        if (target) {
            miner.status = 'traveling_out';
            miner.location = target.id;
            miner.travelProgress = 0;
        }
    });

    // --- DECISION 3: DEPLOY FIGHTERS (HUNTER KILLER) ---
    const idleFighters = nextShips.filter(s => s.owner === 'ai' && s.status === 'idle' && s.type === 'fighter');
    idleFighters.forEach(fighter => {
        // Find a planet where the PLAYER has a ship
        const target = planets.find(p => 
            !p.destroyed && 
            nextShips.some(s => s.location === p.id && s.owner === 'player' && s.status === 'deployed')
        );

        if (target) {
            fighter.status = 'traveling_out';
            fighter.location = target.id;
            fighter.travelProgress = 0;
        }
    });

    // --- DECISION 4: CONSTRUCT ARK ---
    if (nextResources.fuel >= 20 && nextResources.biomass >= 20) {
        const parts: ('engines' | 'lifeSupport' | 'warpCore')[] = ['engines', 'lifeSupport', 'warpCore'];
        parts.sort((a, b) => nextArk[a] - nextArk[b]);
        const targetPart = parts[0];

        if (nextArk[targetPart] < 100) {
            nextArk[targetPart] += 20;
            nextResources.fuel -= 20;
            nextResources.biomass -= 20;
        }
    }

    return { resources: nextResources, ark: nextArk, ships: nextShips };
};