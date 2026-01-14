export interface Point { x: number; y: number; }

export interface Star {
  id: string;
  position: Point;
  radius: number;
  deathRadius: number;
  color: string;
  rotationSpeed: number; 
  currentAngle: number;
}

export interface Planet {
  id: string;
  orbitRadius: number;
  orbitSpeed: number;
  angle: number;
  parentStarId: string;
  resourceType: 'fuel' | 'biomass' | 'exotic';
  isAnchored: boolean;
  destroyed: boolean;
  isUnstable: boolean;
  isDebris: boolean; 
}

export interface Ship {
  id: string;
  owner: 'player' | 'ai'; 
  type: 'miner';
  status: 'idle' | 'traveling_out' | 'deployed' | 'traveling_back';
  location: string | null;
  travelProgress: number; 
}

export interface GameState {
  turn: number;
  maxTurns: number;
  phase: 'planning' | 'resolving' | 'results' | 'game_over' | 'victory' | 'defeat';
  actionPoints: number;
  stars: Star[];
  planets: Planet[];
  ships: Ship[];
  starbase: { position: Point; orbitRadius: number; angle: number; parentStarId: string }; 
  aiStarbase: { position: Point; orbitRadius: number; angle: number; parentStarId: string };
  
  resources: { fuel: number; biomass: number; exotic: number; };
  ark: { engines: number; lifeSupport: number; warpCore: number; };
  
  aiResources: { fuel: number; biomass: number; exotic: number; };
  aiArk: { engines: number; lifeSupport: number; warpCore: number; };

  selectedPlanetId: string | null;
  gameMessage: string;
  log: string[];
  turnReport: string[] | null;
  
  // NEW: Tracks if the Singularity has formed
  isMerged: boolean; 
}