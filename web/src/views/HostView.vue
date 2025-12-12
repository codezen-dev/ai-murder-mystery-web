<template>
  <div>
    <div class="card">
      <h2>主持人面板</h2>
      <div class="flex">
        <div class="flex-1">
          <label>房间号</label>
          <input v-model="roomId" placeholder="输入房间号" />
        </div>
        <div class="flex-1">
          <label>昵称</label>
          <input v-model="name" placeholder="主持人昵称" />
        </div>
      </div>
      <button class="btn" @click="createRoom">创建房间</button>
      <p v-if="connected">已连接房间 {{ roomId }}</p>
    </div>

    <div class="card" v-if="connected">
      <h3>剧本控制</h3>
      <div class="flex script-row">
        <div class="flex-1">
          <label>主题（可选）</label>
          <input v-model="theme" placeholder="例如：校园、科幻、密室" />
        </div>

        <div class="player-count">
          <label>人数</label>
          <select v-model.number="playerCount">
            <option :value="4">4 人本</option>
            <option :value="5">5 人本</option>
            <option :value="6">6 人本</option>
          </select>
        </div>

        <div class="btn-wrap">
          <button class="btn" :disabled="scriptLoading" @click="generateScript">
            {{ scriptLoading ? '生成中…' : '生成剧本' }}
          </button>
        </div>
      </div>

      <div v-if="script">
        <h4>{{ script.title }}</h4>
        <p>{{ script.background }}</p>
        <p>{{ script.caseIntro }}</p>
        <p><strong>真相：</strong>{{ script.truth }}</p>
        <h4>角色列表</h4>
        <ul>
          <li v-for="role in script.roles" :key="role.id" style="margin:0.4rem 0;">
            {{ role.name }} - {{ role.identity }}
            <div class="badge">{{ role.publicInfo }}</div>
          </li>
        </ul>
      </div>
    </div>

    <div class="flex" v-if="connected">
      <div class="flex-1">
        <PlayerList :players="players">
          <template #action="{ player }">
            <div v-if="script" style="margin-top:0.4rem;">
              <select v-model="assignSelections[player.id]">
                <option value="">选择角色</option>
                <option v-for="role in script.roles" :key="role.id" :value="role.id">{{ role.name }}</option>
              </select>
              <button class="btn" @click="assign(player.id)">分配</button>
            </div>
          </template>
        </PlayerList>

        <div class="card">
          <h3>阶段切换</h3>
          <div class="stage-buttons">
            <button class="btn"
              v-for="s in stages"
              :key="s"
              @click="setStage(s)"
              style="margin-right:0.5rem;"
            >
              {{ stageNameMap[s] }}
            </button>
          </div>
          <p>当前阶段：{{ stageNameMap[stage] }}</p>
        </div>
      </div>
      <div class="flex-1">
        <ChatPanel :messages="messages" @send="sendChat" sendable />
        <div class="card">
          <h3>AI 主持人</h3>
          <textarea v-model="aiPrompt" placeholder="给 AI 的提示"></textarea>
          <button class="btn" @click="askAI">让 AI 主持人发言</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue';
import { io, Socket } from 'socket.io-client';
import PlayerList from '../components/PlayerList.vue';
import ChatPanel from '../components/ChatPanel.vue';
import { PlayerSummary, ScriptConfig, ChatMessage, GameStage } from '../types';

const roomId = ref('room-1');
const name = ref('主持人');
const theme = ref('');
const playerCount = ref(5);              // 新增：默认 5 人本
const script = ref<ScriptConfig | null>(null);

const players = ref<PlayerSummary[]>([]);
const messages = ref<ChatMessage[]>([]);
const stage = ref<GameStage>('setup');
const stages: GameStage[] = ['setup', 'clue', 'debate', 'vote'];
const stageNameMap: Record<GameStage, string> = {
  setup: "发本阶段",
  clue: "线索阶段",
  debate: "讨论阶段",
  vote: "投票阶段",
};
const aiPrompt = ref('');
const assignSelections = reactive<Record<string, string>>({});
let socket: Socket | null = null;
const connected = ref(false);
const scriptLoading = ref(false); 
const createRoom = () => {
  if (!roomId.value || !name.value) return;
  if (!socket) return;
  socket.emit('join_room', { roomId: roomId.value, name: name.value, asHost: true });
};

const generateScript = () => {
  if (!socket || scriptLoading.value) return;

  scriptLoading.value = true;
  socket.emit('generate_script', {
    roomId: roomId.value,
    options: {
      theme: theme.value,
      playerCount: playerCount.value,    // 把人数传给后端
    },
  });
};


const assign = (playerId: string) => {
  if (!socket) return;
  const roleId = assignSelections[playerId];
  if (!roleId) return;
  socket.emit('assign_role', { roomId: roomId.value, playerId, roleId });
};

const setStage = (s: GameStage) => {
  if (!socket) return;
  socket.emit('change_stage', { roomId: roomId.value, stage: s });
};

const sendChat = (content: string) => {
  if (!socket) return;
  socket.emit('send_chat', { roomId: roomId.value, from: name.value, content });
};

const askAI = () => {
  if (!socket) return;
  socket.emit('ask_ai', { roomId: roomId.value, prompt: aiPrompt.value || '请继续引导游戏进程' });
  aiPrompt.value = '';
};

onMounted(() => {
  // Vite 提供的环境变量：
  // 开发模式：import.meta.env.DEV === true
  // 打包后线上：import.meta.env.DEV === false
  const isDev = import.meta.env.DEV;

let socketUrl: string;
let socketPath: string;

if (isDev) {
  // 本地开发：前端 5173，后端 3000
  socketUrl = 'http://localhost:3000';
  socketPath = '/socket.io';
} else {
  // 线上环境：通过 Nginx /murder/ 访问
  socketUrl = window.location.origin;        // 比如 https://www.join-ivr.com
  socketPath = '/murder/socket.io';         // 注意这里要带 /socket.io
}

socket = io(socketUrl, {
  path: socketPath,
});
  // socket = io('http://localhost:3000');
  socket.on('connect', () => {
    connected.value = true;
  });
  socket.on('join_success', (data) => {
    players.value = data.players;
    stage.value = data.stage;
    if (data.publicScript) {
      script.value = { ...data.publicScript, truth: '', roles: [] } as any;
    }
  });
  socket.on('player_list_update', (list) => {
    players.value = list;
  });
  socket.on('public_script_info', (info) => {
    script.value = { ...info, truth: '', roles: script.value?.roles || [] } as any;
  });
  socket.on('script_generated', (data: ScriptConfig) => {
    scriptLoading.value = false;
    script.value = data;
  });

  socket.on('your_role', () => {});
  socket.on('chat_message', (msg: ChatMessage) => {
    messages.value.push(msg);
  });
  socket.on('stage_changed', (s: GameStage) => {
    stage.value = s;
  });
});

onBeforeUnmount(() => {
  socket?.disconnect();
});
</script>
<style scoped>
  .script-row {
    align-items: flex-end;
  }
  
  .player-count {
    margin-left: 0.75rem;
  }
  
  .btn-wrap {
    margin-left: 0.75rem;
  }
</style>
  