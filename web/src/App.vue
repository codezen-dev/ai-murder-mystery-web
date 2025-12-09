<template>
  <div class="container">
    <header class="card" style="display:flex;align-items:center;justify-content:space-between;gap:1rem;">
      <div>
        <h1>AI 剧本杀平台</h1>
        <p>主持人创建房间，玩家扫码/访问加入，AI 驱动流程</p>
      </div>
      <nav style="display:flex;gap:0.6rem;">
        <router-link class="btn" to="/host">主持人</router-link>
        <router-link class="btn" to="/player">玩家</router-link>
      </nav>
    </header>
    <router-view />
  </div>
</template>

<script setup lang="ts"></script>
