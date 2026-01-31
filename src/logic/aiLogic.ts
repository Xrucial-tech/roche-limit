import type { GameState, Planet, Ship } from '../types';

const MINER_COST = { fuel: 10, biomass: 10 };
const FIGHTER_COST = { fuel: 20, exotic: 10 }; 

export const processAI = (gameState: GameState, planets: Planet[], currentShips: Ship[]) => {
    let nextShips = [...currentShips];
    let nextResources = { ...gameState.aiResources };
    let nextArk = { ...gameState.aiArk };

    const aiShips = nextShips.filter(s => s.owner === 'ai');
    const aiBasePos = { x: 900, y: 400 }; // The coordinates for the Beta Starbase area

    // --- DECISION 1: FLEET SCALING ---
    const numMiners = aiShips.filter(s => s.type === 'miner').length;
    const numFighters = aiShips.filter(s => s.type === 'fighter').length;
    
    // Scale fighters based on player fleet visibility or miner count
    if (nextResources.fuel >= FIGHTER_COST.fuel && nextResources.exotic >= FIGHTER_COST.exotic && numFighters < Math.ceil(numMiners / 2)) {
        nextResources.fuel -= FIGHTER_COST.fuel;
        nextResources.exotic -= FIGHTER_COST.exotic;
        nextShips.push({
            id: `ai-f-${Date.now()}`,
            owner: 'ai',
            type: 'fighter',
            status: 'idle',
            location: null,
            travelProgress: 0
        });
    }
    else if (nextResources.fuel >= MINER_COST.fuel && nextResources.biomass >= MINER_COST.biomass && aiShips.length < 10) {
        nextResources.fuel -= MINER_COST.fuel;
        nextResources.biomass -= MINER_COST.biomass;
        nextShips.push({
            id: `ai-m-${Date.now()}`,
            owner: 'ai',
            type: 'miner',
            status: 'idle',
            location: null,
            travelProgress: 0
        });
    }

    // --- DECISION 2: PROXIMITY-BASED MINING ---
    const idleMiners = nextShips.filter(s => s.owner === 'ai' && s.status === 'idle' && s.type === 'miner');
    idleMiners.forEach(miner => {
        // Sort planets by physical distance to AI Base, excluding destroyed or already targeted ones
        const validTargets = planets
            .filter(p => !p.destroyed && !nextShips.find(s => s.location === p.id && s.owner === 'ai'))
            .sort((a, b) => {
                const distA = Math.hypot(a.x - aiBasePos.x, a.y - aiBasePos.y);
                const distB = Math.hypot(b.x - aiBasePos.x, b.y - aiBasePos.y);
                return distA - distB;
            });

        const target = validTargets[0]; // Take the closest one
        if (target) {
            miner.status = 'traveling_out';
            miner.location = target.id;
            miner.travelProgress = 0;
        }
    });

    // --- DECISION 3: AGGRESSIVE INTERCEPTION ---
    const idleFighters = nextShips.filter(s => s.owner === 'ai' && s.status === 'idle' && s.type === 'fighter');
    idleFighters.forEach(fighter => {
        // Find player miners that are currently deployed
        const playerMiners = nextShips.filter(s => s.owner === 'player' && s.status === 'deployed' && s.type === 'miner');
        
        if (playerMiners.length > 0) {
            // Target the player miner closest to the AI's base (defensive aggression)
            playerMiners.sort((a, b) => {
                const pA = planets.find(p => p.id === a.location)!;
                const pB = planets.find(p => p.id === b.location)!;
                return Math.hypot(pA.x - aiBasePos.x, pA.y - aiBasePos.y) - Math.hypot(pB.x - aiBasePos.x, pB.y - aiBasePos.y);
            });

            fighter.status = 'traveling_out';
            fighter.location = playerMiners[0].location;
            fighter.travelProgress = 0;
        }
    });

    // --- DECISION 4: STRATEGIC ARK CONSTRUCTION ---
    const fuelCost = 20;
    const bioCost = 20;
    if (nextResources.fuel >= fuelCost && nextResources.biomass >= bioCost) {
        const parts: ('engines' | 'lifeSupport' | 'warpCore')[] = ['engines', 'lifeSupport', 'warpCore'];
        parts.sort((a, b) => nextArk[a] - nextArk[b]);
        const targetPart = parts[0];

        if (nextArk[targetPart] < 100) {
            nextArk[targetPart] += 20;
            nextResources.fuel -= fuelCost;
            nextResources.biomass -= bioCost;
        }
    }

    return { resources: nextResources, ark: nextArk, ships: nextShips };
};