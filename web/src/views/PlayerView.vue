<template>
  <div>
    <div class="card">
      <h2>玩家入口</h2>
      <div class="flex">
        <div class="flex-1">
          <label>房间号</label>
          <input v-model="roomId" placeholder="输入房间号" />
        </div>
        <div class="flex-1">
          <label>昵称</label>
          <input v-model="name" placeholder="你的昵称" />
        </div>
      </div>
      <button class="btn" @click="joinRoom">加入</button>
      <p v-if="connected">已加入房间 {{ roomId }}</p>
    </div>

    <div v-if="connected" class="flex">
      <div class="flex-1">
        <div class="card">
          <h3>公共剧本信息</h3>
          <div v-if="publicScript">
            <h4>{{ publicScript.title }}</h4>
            <p>{{ publicScript.background }}</p>
            <p>{{ publicScript.caseIntro }}</p>
          </div>
          <div v-else>等待主持人生成剧本...</div>
        </div>
        <div class="card">
          <h3>角色一览</h3>
          <ul>
            <li v-for="r in publicRoles" :key="r.id">
              {{ r.name }}
            </li>
          </ul>
        </div>

        <div class="card" v-if="myRole">
          <h3>你的角色</h3>
          <RoleCard :role="myRole" />
        </div>
      </div>
      <div class="flex-1">
        <ChatPanel :messages="messages" @send="sendChat" sendable />
        <div class="card">
          <h3>阶段</h3>
          <p>当前阶段：{{ stageNameMap[stage] }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { io, Socket } from 'socket.io-client';
import ChatPanel from '../components/ChatPanel.vue';
import RoleCard from '../components/RoleCard.vue';
import { ScriptConfig, RoleCard as RoleCardType, ChatMessage, GameStage } from '../types';

const roomId = ref('room-1');
const name = ref('玩家');
const publicScript = ref<Pick<ScriptConfig, 'title' | 'background' | 'caseIntro'> | null>(null);
const myRole = ref<RoleCardType | null>(null);
const messages = ref<ChatMessage[]>([]);
const stage = ref<GameStage>('setup');
let socket: Socket | null = null;
const connected = ref(false);
const publicRoles = ref<
  Array<{ id: string; name: string; identity?: string }>
>([]);
const stageNameMap: Record<GameStage, string> = {
  setup: '发本阶段',
  clue: '线索阶段',
  debate: '讨论阶段',
  vote: '投票阶段',
};

const joinRoom = () => {
  if (!socket || !roomId.value || !name.value) return;
  socket.emit('join_room', { roomId: roomId.value, name: name.value, asHost: false });
};

const sendChat = (content: string) => {
  if (!socket) return;
  socket.emit('send_chat', { roomId: roomId.value, from: name.value, content });
};


onMounted(() => {
  socket = io('http://localhost:3000');
  socket.on('connect', () => {
    connected.value = true;
  });
  socket.on('join_success', (data) => {
    stage.value = data.stage;
    if (data.publicScript) {
      publicScript.value = data.publicScript;
    }

    // 找到“我自己”的名字，同步回来，避免一直显示“玩家”
    const me = data.players?.find((p: any) => p.id === socket?.id);
    if (me && me.name) {
      name.value = me.name;
    }
  });

  socket.on('public_script_info', (info) => {
    publicScript.value = info;
  });
  socket.on('your_role', (payload: { role: RoleCardType }) => {
    myRole.value = payload.role;
  });
  socket.on('chat_message', (msg: ChatMessage) => {
    messages.value.push(msg);
  });
  socket.on('stage_changed', (s: GameStage) => {
    stage.value = s;
  });
  socket.on("public_roles", (list) => {
    publicRoles.value = list;
  });

});

onBeforeUnmount(() => {
  socket?.disconnect();
});
</script>
