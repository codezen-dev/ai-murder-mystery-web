<template>
  <div class="card">
    <h3>玩家列表</h3>
    <ul>
      <li v-for="p in players" :key="p.id" style="margin:0.4rem 0;">
        {{ p.name }}
        <span class="badge" :style="{background: p.roleAssigned ? '#22c55e' : '#eab308', color:'#0b1221'}">
          {{ p.roleAssigned ? '已分配' : '待分配' }}
        </span>
        <slot name="action" :player="p"></slot>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { PlayerSummary } from '../types';

const props = defineProps<{ players: PlayerSummary[] }>();
</script>
