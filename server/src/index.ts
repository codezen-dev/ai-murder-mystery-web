import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import {
  JoinRoomPayload,
  GenerateScriptPayload,
  AssignRolePayload,
  ChangeStagePayload,
  SendChatPayload,
  AskAIPayload,
  RoomState,
} from './types';
import {
  getOrCreateRoom,
  getRoom,
  addPlayer,
  setScript,
  assignRole,
  changeStage,
  addMessage,
  getPublicPlayerList,
  getRecentMessages,
  createScriptPlaceholder,
} from './roomManager';
import { generateScriptFromAI, buildAIPrompt, callKimi } from './ai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});
function emitPublicRoles(room: RoomState, targetSocketId?: string) {
  if (!room.script) return;

  const payload = room.script.roles.map((r) => ({
    id: r.id,
    name: r.name,
    identity: r.identity, // 如果你不想给玩家看职业，删掉这一行即可
  }));

  if (targetSocketId) {
    // 只发给某一个 socket（新加入的玩家）
    io.to(targetSocketId).emit('public_roles', payload);
  } else {
    // 发给整个房间（比如刚生成完剧本）
    io.to(room.id).emit('public_roles', payload);
  }
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

const staticPath = path.join(__dirname, '../../web/dist');
app.use(express.static(staticPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

io.on('connection', (socket) => {
  console.log('socket connected:', socket.id);

  socket.onAny((event, ...args) => {
    console.log('[socket event]', socket.id, event, args);
  });
  socket.on('join_room', (payload: JoinRoomPayload) => {
    let room: RoomState | undefined;
  
    if (payload.asHost) {
      // 主持人：创建或获取房间
      room = getOrCreateRoom(payload.roomId, socket.id);
    } else {
      // 玩家：只能加入已经存在的房间
      room = getRoom(payload.roomId);
      if (!room) return;
    }
  
    socket.join(payload.roomId);
  
    // =========================
    // 只有「玩家」才加入玩家列表
    // =========================
    if (!payload.asHost) {
      // ==== 统一处理显示名称 ==== //
      let displayName = (payload.name || '').trim();
  
      // 没填名字，一律先看作“玩家”
      if (!displayName) {
        displayName = '玩家';
      }
  
      // 如果不是房主，但名字写了“主持人”，也按玩家处理
      if (displayName === '主持人' && socket.id !== room!.hostId) {
        displayName = '玩家';
      }
  
      // “玩家”自动编号：玩家1、玩家2、玩家3…
      if (displayName === '玩家') {
        const existingPlayers = room!.players.filter((p) =>
          p.name.startsWith('玩家'),
        );
        const nextNo = existingPlayers.length + 1;
        displayName = `玩家${nextNo}`;
      }
  
      // 真正加入玩家列表
      addPlayer(room!, { id: socket.id, name: displayName });
  
      // 如果房间已有剧本，给这个新玩家推一次角色列表 + 自己的角色
      if (room!.script) {
        // 角色列表（玩家界面的“角色一览”）
        emitPublicRoles(room!, socket.id);
  
        // 如果之前就给他分配过角色（比如重连），把角色卡推给他
        const me = room!.players.find((p) => p.id === socket.id);
        if (me?.roleId) {
          const role = room!.script.roles.find((r) => r.id === me.roleId);
          if (role) {
            io.to(socket.id).emit('your_role', {
              role: {
                id: role.id,
                name: role.name,
                identity: role.identity,
                publicInfo: role.publicInfo,
                secretInfo: role.secretInfo,
              },
            });
          }
        }
      }
    }
  
    // 不管主持人还是玩家，都要回一份 join_success
    socket.emit('join_success', {
      roomId: room!.id,
      players: getPublicPlayerList(room!),
      stage: room!.stage,
      publicScript: room!.script
        ? {
            title: room!.script.title,
            background: room!.script.background,
            caseIntro: room!.script.caseIntro,
          }
        : null,
    });
  
    // 广播玩家列表（主持人不会出现在这个列表里）
    io.to(payload.roomId).emit('player_list_update', getPublicPlayerList(room!));
  });
  
  

  socket.on('generate_script', async (payload: GenerateScriptPayload) => {
    const room = getRoom(payload.roomId);
    if (!room || room.hostId !== socket.id) return;
  
    // 优先用前端选择的人数，没有就用房间当前玩家数（至少 4 人）
    const countFromClient = payload.options?.playerCount;
    const fallbackCount = Math.max(4, room.players.length || 4);
    const finalCount = countFromClient || fallbackCount;
  
    try {
      const script = await generateScriptFromAI(
        payload.options?.theme,
        finalCount,
      );
  
      // 覆盖房间剧本
      setScript(room, script);
  
      // ⭐ 生成新剧本后，把所有玩家的 roleId 清掉，需要重新分配
      for (const p of room.players) {
        p.roleId = undefined;
      }
  
      // 推给主持人完整剧本
      socket.emit('script_generated', script);
  
      // 推给所有人公共剧本信息（标题 / 背景 / 案件简介）
      io.to(payload.roomId).emit('public_script_info', {
        title: script.title,
        background: script.background,
        caseIntro: script.caseIntro,
      });
  
      // ⭐ 推送新的角色列表给所有人
      emitPublicRoles(room);
  
      // ⭐ 通知所有玩家：角色已经重置，前端把自己的角色卡清掉
      io.to(payload.roomId).emit('roles_reset');
    } catch (err) {
      const script = createScriptPlaceholder();
      setScript(room, script);
      socket.emit('script_generated', script);
      io.to(payload.roomId).emit('public_script_info', {
        title: script.title,
        background: script.background,
        caseIntro: script.caseIntro,
      });
    }
  });
  

  socket.on('assign_role', (payload: AssignRolePayload) => {
    const room = getRoom(payload.roomId);
    if (!room || room.hostId !== socket.id) return;
    if (!room.script) return;
  
    // 目标玩家
    const target = room.players.find((p) => p.id === payload.playerId);
    if (!target) return;
  
    // 1) 先把这个角色从其他玩家身上移除，保证不会有重复占用
    for (const p of room.players) {
      if (p.id !== payload.playerId && p.roleId === payload.roleId) {
        p.roleId = undefined;
      }
    }
  
    // 2) 再分配给目标玩家
    target.roleId = payload.roleId;
  
    // 3) 广播最新玩家列表
    io.to(payload.roomId).emit('player_list_update', getPublicPlayerList(room));
  
    // 4) 通知被分配的那位，把自己的角色详情同步过去
    const role = room.script.roles.find((r) => r.id === payload.roleId);
    if (role) {
      io.to(payload.playerId).emit('your_role', {
        role: {
          id: role.id,
          name: role.name,
          identity: role.identity,
          publicInfo: role.publicInfo,
          secretInfo: role.secretInfo,
        },
      });
    }
  });
  
  


  socket.on('change_stage', (payload: ChangeStagePayload) => {
    const room = getRoom(payload.roomId);
    if (!room || room.hostId !== socket.id) return;
    changeStage(room, payload.stage);
    io.to(payload.roomId).emit('stage_changed', payload.stage);
  });

  socket.on('send_chat', (payload: SendChatPayload) => {
    const room = getRoom(payload.roomId);
    if (!room) return;
    const message = { from: payload.from, content: payload.content, type: 'player', timestamp: Date.now() };
    addMessage(room, message);
    io.to(payload.roomId).emit('chat_message', message);
  });

  socket.on('ask_ai', async (payload: AskAIPayload) => {
    const room = getRoom(payload.roomId);
    if (!room || room.hostId !== socket.id) return;
    const { systemPrompt, userPrompt } = buildAIPrompt(room, payload.prompt);
    const history = getRecentMessages(room).map((m) => ({ role: m.type === 'ai' ? 'assistant' : 'user', content: `${m.from}:${m.content}` }));
    const content = await callKimi(systemPrompt, userPrompt, history);
    const message = { from: 'AI 主持人', content, type: 'ai', timestamp: Date.now() };
    addMessage(room, message);
    io.to(payload.roomId).emit('chat_message', message);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
