<template>
  <div class="card">
    <h3>{{ role.name }} <small style="color:#94a3b8;">{{ role.identity }}</small></h3>
    <p><strong>公开信息：</strong>{{ role.publicInfo }}</p>
    <p v-if="role.secretInfo"><strong>秘密信息：</strong>{{ role.secretInfo }}</p>
    <p v-if="role.truth"><strong>真相：</strong>{{ role.truth }}</p>
  </div>
</template>

<script setup lang="ts">
import { RoleCard } from '../types';

const props = defineProps<{ role: RoleCard }>();
</script>
