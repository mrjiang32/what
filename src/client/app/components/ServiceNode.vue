<script setup lang="ts">
import { Handle, Position, type NodeProps } from '@vue-flow/core'

type ServiceData = {
  name: string
  image: string
  port: string
  status: 'running' | 'stopped'
  tone: string
  mark: string
  description: string
}

defineProps<NodeProps<ServiceData>>()
</script>

<template>
  <div class="service-node" :class="[data.tone, { selected }]">
    <Handle type="target" :position="Position.Left" />
    <div class="node-head">
      <span class="node-mark">{{ data.mark }}</span>
      <span class="node-title"><strong>{{ data.name }}</strong><small>{{ data.image }}</small></span>
      <span class="node-status" :class="data.status" />
    </div>
    <div class="node-port"><UIcon name="i-lucide-waypoints" /><span>{{ data.port }}</span></div>
    <div class="node-foot"><span><i :class="data.status" />{{ data.status === 'running' ? '运行中' : '已停止' }}</span><span>Docker</span></div>
    <Handle type="source" :position="Position.Right" />
  </div>
</template>

<style scoped>
.service-node { position: relative; width: 190px; padding: 11px 11px 8px; border: 1px solid #e1e7e0; border-top: 2px solid #55a17a; border-radius: 7px; background: #fff; box-shadow: 0 3px 12px #2438290b; transition: border-color 150ms, box-shadow 150ms; }
.service-node.coral { border-top-color: #e27b60; }
.service-node.blue { border-top-color: #6e93b5; }
.service-node.amber { border-top-color: #d5a849; }
.service-node.selected { border-color: #80aa8f; box-shadow: 0 0 0 2px #dcece0, 0 5px 16px #24382912; }
.node-head { display: flex; align-items: center; gap: 8px; }
.node-mark { display: grid; place-items: center; width: 29px; height: 29px; flex: 0 0 auto; border-radius: 6px; color: #318664; background: #e4f3eb; font-size: 9px; font-weight: 800; }
.coral .node-mark { color: #c6644c; background: #fbeae4; }
.blue .node-mark { color: #4e79a3; background: #e8eff7; }
.amber .node-mark { color: #a67a25; background: #f8f0dc; }
.node-title { display: grid; gap: 3px; min-width: 0; flex: 1; }
.node-title strong { overflow: hidden; color: #354039; font: 700 11px 'JetBrains Mono', Consolas, monospace; text-overflow: ellipsis; }
.node-title small { overflow: hidden; color: #89938b; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.node-status { width: 7px; height: 7px; flex: 0 0 auto; border-radius: 50%; }
.node-status.running { background: #51a575; box-shadow: 0 0 0 3px #e8f4eb; }
.node-status.stopped { background: #c4c9c5; box-shadow: 0 0 0 3px #eff1ef; }
.node-port { display: flex; align-items: center; gap: 7px; margin-top: 10px; padding: 6px 7px; border-radius: 4px; color: #67756a; background: #f6f8f5; font: 9px 'JetBrains Mono', Consolas, monospace; }
.node-port :deep(svg) { color: #99a39a; font-size: 12px; }
.node-foot { display: flex; justify-content: space-between; margin-top: 8px; color: #a0a8a1; font-size: 8px; }
.node-foot > span:first-child { display: flex; align-items: center; gap: 5px; }
.node-foot i { width: 5px; height: 5px; border-radius: 50%; background: #53a878; }
.node-foot i.stopped { background: #c4c9c5; }
.service-node :deep(.vue-flow__handle) { width: 8px; height: 8px; border: 2px solid #fff; background: #4e9875; box-shadow: 0 0 0 1px #80aa91; }
</style>