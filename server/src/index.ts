import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  JoinRoomPayload,
  GenerateScriptPayload,
  AssignRolePayload,
  ChangeStagePayload,
  SendChatPayload,
  AskAIPayload,
  RoomState,
} from './types.js';
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
} from './roomManager.js';
import { generateScriptFromAI, buildAIPrompt, callKimi } from './ai.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

const staticPath = path.join(__dirname, '../../web/dist');
app.use(express.static(staticPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

io.on('connection', (socket) => {
  socket.on('join_room', (payload: JoinRoomPayload) => {
    let room: RoomState | undefined;
    if (payload.asHost) {
      room = getOrCreateRoom(payload.roomId, socket.id);
    } else {
      room = getRoom(payload.roomId);
      if (!room) return;
    }

    socket.join(payload.roomId);
    addPlayer(room!, { id: socket.id, name: payload.name });

    socket.emit('join_success', {
      roomId: room!.id,
      players: getPublicPlayerList(room!),
      stage: room!.stage,
      publicScript: room!.script
        ? { title: room!.script.title, background: room!.script.background, caseIntro: room!.script.caseIntro }
        : null,
    });

    io.to(payload.roomId).emit('player_list_update', getPublicPlayerList(room!));
  });

  socket.on('generate_script', async (payload: GenerateScriptPayload) => {
    const room = getRoom(payload.roomId);
    if (!room || room.hostId !== socket.id) return;

    try {
      const script = await generateScriptFromAI(payload.options?.theme);
      setScript(room, script);
      socket.emit('script_generated', script);
      io.to(payload.roomId).emit('public_script_info', {
        title: script.title,
        background: script.background,
        caseIntro: script.caseIntro,
      });
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
    if (!room || room.hostId !== socket.id || !room.script) return;

    const role = room.script.roles.find((r) => r.id === payload.roleId);
    if (!role) return;

    assignRole(room, payload.playerId, payload.roleId);

    // 只给该玩家自己的角色卡，禁止带 truth
    io.to(payload.playerId).emit('your_role', {
      role: {
        id: role.id,
        name: role.name,
        identity: role.identity,
        publicInfo: role.publicInfo,
        secretInfo: role.secretInfo,
      },
    });

    io.to(payload.roomId).emit('player_list_update', getPublicPlayerList(room));
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
