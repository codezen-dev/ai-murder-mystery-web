"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrCreateRoom = getOrCreateRoom;
exports.getRoom = getRoom;
exports.addPlayer = addPlayer;
exports.setScript = setScript;
exports.assignRole = assignRole;
exports.changeStage = changeStage;
exports.addMessage = addMessage;
exports.getPublicPlayerList = getPublicPlayerList;
exports.getRecentMessages = getRecentMessages;
exports.createScriptPlaceholder = createScriptPlaceholder;
const uuid_1 = require("uuid");
// Simple in-memory room store
const rooms = new Map();
function getOrCreateRoom(roomId, hostId) {
    const existing = rooms.get(roomId);
    if (existing)
        return existing;
    const newRoom = {
        id: roomId,
        hostId,
        players: [],
        stage: 'setup',
        messages: [],
    };
    rooms.set(roomId, newRoom);
    return newRoom;
}
function getRoom(roomId) {
    return rooms.get(roomId);
}
function addPlayer(room, player) {
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
function setScript(room, script) {
    room.script = script;
}
function assignRole(room, playerId, roleId) {
    const player = room.players.find((p) => p.id === playerId);
    if (player) {
        player.roleId = roleId;
    }
}
function changeStage(room, stage) {
    room.stage = stage;
}
function addMessage(room, message) {
    room.messages.push(message);
    if (room.messages.length > 100) {
        room.messages.shift();
    }
}
function getPublicPlayerList(room) {
    return room.players
        .filter((p) => p.id !== room.hostId) // 主持人不出现在玩家列表
        .map((p) => ({
        id: p.id,
        name: p.name,
        roleAssigned: Boolean(p.roleId),
    }));
}
function getRecentMessages(room, limit = 10) {
    return room.messages.slice(-limit);
}
function createScriptPlaceholder() {
    return {
        title: '神秘古堡谋杀案',
        background: '在一个偏僻的山间古堡，六位客人围绕一桩旧案重聚。',
        caseIntro: '晚宴中突然发生命案，每个人都有秘密。',
        truth: '真凶是管家，他为了掩盖过去的罪行而杀人。',
        roles: [
            {
                id: (0, uuid_1.v4)(),
                name: '管家',
                identity: '古堡管家',
                publicInfo: '负责餐饮与安全，深受女主人信任。',
                secretInfo: '暗恋女主人，曾经犯下过错，对过去心怀愧疚。',
            },
            {
                id: (0, uuid_1.v4)(),
                name: '律师',
                identity: '家族律师',
                publicInfo: '掌握遗嘱，熟悉家族秘密。',
                secretInfo: '为谋取遗产，曾勒索管家。',
            },
        ],
    };
}
