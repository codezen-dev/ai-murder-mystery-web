export type GameStage = 'setup' | 'clue' | 'debate' | 'vote';

export interface PlayerInfo {
  id: string;
  name: string;
  roleId?: string;
  clientId?: string; 
}

export interface RoleCard {
  id: string;
  name: string;
  identity: string;
  publicInfo: string;
  secretInfo: string;
}

export interface ScriptConfig {
  title: string;
  background: string;
  caseIntro: string;
  truth: string;
  roles: RoleCard[];
}

export interface ChatMessage {
  from: string;
  content: string;
  type?: 'player' | 'ai';
  timestamp: number;
}

export interface RoomState {
  id: string;
  hostId: string;
  players: PlayerInfo[];
  script?: ScriptConfig;
  stage: GameStage;
  messages: ChatMessage[];
}

export interface JoinRoomPayload {
  roomId: string;
  name: string;
  asHost: boolean;
  clientId?: string;
}

export interface GenerateScriptOptions {
  theme?: string;
  playerCount?: number;
}

export interface GenerateScriptPayload {
  roomId: string;
  options?: GenerateScriptOptions;
}


export interface AssignRolePayload {
  roomId: string;
  playerId: string;
  roleId: string;
}

export interface ChangeStagePayload {
  roomId: string;
  stage: GameStage;
}

export interface SendChatPayload {
  roomId: string;
  from: string;
  content: string;
}

export interface AskAIPayload {
  roomId: string;
  prompt: string;
}
