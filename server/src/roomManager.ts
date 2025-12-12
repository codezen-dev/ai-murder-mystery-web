import { v4 as uuidv4 } from 'uuid';
import { RoomState, PlayerInfo, ScriptConfig, ChatMessage, GameStage } from './types';

// Simple in-memory room store
const rooms: Map<string, RoomState> = new Map();

export function getOrCreateRoom(roomId: string, hostId: string): RoomState {
  const existing = rooms.get(roomId);
  if (existing) return existing;
  const newRoom: RoomState = {
    id: roomId,
    hostId,
    players: [],
    stage: 'setup',
    messages: [],
  };
  rooms.set(roomId, newRoom);
  return newRoom;
}

export function getRoom(roomId: string): RoomState | undefined {
  return rooms.get(roomId);
}

export function addPlayer(room: RoomState, player: PlayerInfo): PlayerInfo {
  // 如果带着 clientId 进房间，优先按 clientId 判断是不是老玩家
  if (player.clientId) {
    const exist = room.players.find(p => p.clientId === player.clientId);
    if (exist) {
      // 刷新之后 socket.id 变了，这里更新成新的连接 id
      exist.id = player.id;
      // 名字也以最新的一次为准（防止你后面加「改名」功能）
      exist.name = player.name;
      return exist;
    }
  }

  // 没有 clientId 或者找不到 ⇒ 当成新玩家插入
  room.players.push(player);
  return player;
}


export function setScript(room: RoomState, script: ScriptConfig) {
  room.script = script;
}

export function assignRole(room: RoomState, playerId: string, roleId: string) {
  const player = room.players.find((p) => p.id === playerId);
  if (player) {
    player.roleId = roleId;
  }
}

export function changeStage(room: RoomState, stage: GameStage) {
  room.stage = stage;
}

export function addMessage(room: RoomState, message: ChatMessage) {
  room.messages.push(message);
  if (room.messages.length > 100) {
    room.messages.shift();
  }
}

export function getPublicPlayerList(room: RoomState) {
  return room.players
    .filter((p) => p.id !== room.hostId)  // 主持人不出现在玩家列表
    .map((p) => ({
      id: p.id,
      name: p.name,
      roleAssigned: Boolean(p.roleId),
    }));
}


export function getRecentMessages(room: RoomState, limit = 10) {
  return room.messages.slice(-limit);
}

export function createScriptPlaceholder(): ScriptConfig {
  return {
    title: '神秘古堡谋杀案',
    background: '在一个偏僻的山间古堡，六位客人围绕一桩旧案重聚。',
    caseIntro: '晚宴中突然发生命案，每个人都有秘密。',
    truth: '真凶是管家，他为了掩盖过去的罪行而杀人。',
    roles: [
      {
        id: uuidv4(),
        name: '管家',
        identity: '古堡管家',
        publicInfo: '负责餐饮与安全，深受女主人信任。',
        secretInfo: '暗恋女主人，曾经犯下过错，对过去心怀愧疚。',
      },
      {
        id: uuidv4(),
        name: '律师',
        identity: '家族律师',
        publicInfo: '掌握遗嘱，熟悉家族秘密。',
        secretInfo: '为谋取遗产，曾勒索管家。',
      },
    ],
  };
}
