<template>
  <div class="card">
    <h3>公共聊天</h3>
    <div class="chat-box">
      <div v-for="msg in messages" :key="msg.timestamp" style="margin-bottom:0.4rem;">
        <strong>{{ msg.from }}</strong>
        <span v-if="msg.type === 'ai'" class="badge">AI</span>
        ：{{ msg.content }}
      </div>
    </div>
    <div style="margin-top:0.6rem;" v-if="sendable">
      <input v-model="chatInput" placeholder="输入内容" @keyup.enter="handleSend" />
      <button class="btn" @click="handleSend">发送</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { ChatMessage } from '../types';

const props = defineProps<{ messages: ChatMessage[]; sendable?: boolean }>();
const emits = defineEmits<{ (e: 'send', content: string): void }>();
const chatInput = ref('');

const handleSend = () => {
  if (!chatInput.value.trim()) return;
  emits('send', chatInput.value.trim());
  chatInput.value = '';
};

watch(
  () => props.messages.length,
  () => {
    const box = document.querySelector('.chat-box');
    box?.scrollTo(0, box.scrollHeight);
  }
);
</script>
