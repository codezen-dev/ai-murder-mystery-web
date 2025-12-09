export type GameStage = 'setup' | 'clue' | 'debate' | 'vote';

export interface PlayerSummary {
  id: string;
  name: string;
  roleAssigned: boolean;
}

export interface RoleCard {
  id: string;
  name: string;
  identity: string;
  publicInfo: string;
  secretInfo: string;
  truth?: string;
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
