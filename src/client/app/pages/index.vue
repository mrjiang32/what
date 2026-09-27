<script setup lang="ts">
import { Background } from '@vue-flow/background'
import { VueFlow, useVueFlow, type Connection, type Edge, type Node } from '@vue-flow/core'
import { Controls } from '@vue-flow/controls'
import ServiceNode from '~/components/ServiceNode.vue'

type ServiceData = {
  name: string
  image: string
  port: string
  status: 'running' | 'stopped'
  tone: string
  mark: string
  description: string
}

const nodes = shallowRef<Node<ServiceData>[]>([
  { id: 'proxy', type: 'service', position: { x: 90, y: 170 }, data: { name: 'proxy', image: 'nginx:alpine', port: '8080:80', status: 'running', tone: 'mint', mark: 'N', description: '入口网关' } },
  { id: 'api', type: 'service', position: { x: 360, y: 170 }, data: { name: 'api', image: 'node:22-alpine', port: '3000:3000', status: 'running', tone: 'coral', mark: 'JS', description: '应用服务' } },
  { id: 'postgres', type: 'service', position: { x: 650, y: 70 }, data: { name: 'postgres', image: 'postgres:16', port: '5432:5432', status: 'running', tone: 'blue', mark: 'PG', description: '关系数据库' } },
  { id: 'redis', type: 'service', position: { x: 650, y: 310 }, data: { name: 'redis', image: 'redis:7-alpine', port: '6379:6379', status: 'stopped', tone: 'amber', mark: 'R', description: '内存缓存' } }
])

const edges = shallowRef<Edge[]>([
  { id: 'e-proxy-api', source: 'proxy', target: 'api', animated: true, label: 'HTTP' },
  { id: 'e-api-postgres', source: 'api', target: 'postgres', label: 'SQL' },
  { id: 'e-api-redis', source: 'api', target: 'redis', label: 'CACHE' }
])

const selectedId = ref('api')
const activeView = ref<'canvas' | 'yaml'>('canvas')
const search = ref('')
const copied = ref(false)
const { fitView } = useVueFlow()

const services = [
  { name: 'Nginx', image: 'nginx:alpine', mark: 'N', tone: 'mint', description: '反向代理与 Web 服务' },
  { name: 'Node.js', image: 'node:22-alpine', mark: 'JS', tone: 'coral', description: 'JavaScript 应用运行时' },
  { name: 'PostgreSQL', image: 'postgres:16', mark: 'PG', tone: 'blue', description: '关系型数据库' },
  { name: 'Redis', image: 'redis:7-alpine', mark: 'R', tone: 'amber', description: '缓存与消息队列' },
  { name: 'MySQL', image: 'mysql:8', mark: 'MY', tone: 'blue', description: '关系型数据库' },
  { name: 'MinIO', image: 'minio/minio:latest', mark: 'S3', tone: 'coral', description: '对象存储服务' }
]

const filteredServices = computed(() => services.filter(service => `${service.name} ${service.image}`.toLowerCase().includes(search.value.toLowerCase())))
const selectedNode = computed(() => nodes.value.find(node => node.id === selectedId.value))
const selectedData = computed(() => selectedNode.value?.data)
const composeYaml = computed(() => {
  const serviceYaml = nodes.value.map((node) => {
    const dependencies = edges.value.filter(edge => edge.source === node.id).map(edge => edge.target)
    const data = node.data!
    const lines = [`  ${data.name}:`, `    image: ${data.image}`, '    ports:', `      - "${data.port}"`]
    if (dependencies.length) lines.push('    depends_on:', ...dependencies.map(dependency => `      - ${nodes.value.find(item => item.id === dependency)?.data?.name ?? dependency}`))
    if (node.id === 'postgres') lines.push('    volumes:', '      - postgres_data:/var/lib/postgresql/data')
    return lines.join('\n')
  })
  return ['services:', ...serviceYaml, '', 'volumes:', '  postgres_data:'].join('\n')
})

function addService(service: typeof services[number]) {
  const id = service.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const uniqueId = nodes.value.some(node => node.id === id) ? `${id}-${nodes.value.length + 1}` : id
  nodes.value.push({
    id: uniqueId,
    type: 'service',
    position: { x: 190 + (nodes.value.length % 3) * 210, y: 110 + Math.floor(nodes.value.length / 3) * 180 },
    data: { name: uniqueId, image: service.image, port: '8080:80', status: 'stopped', tone: service.tone, mark: service.mark, description: service.description }
  })
  selectedId.value = uniqueId
}

function connect(connection: Connection) {
  if (!connection.source || !connection.target || connection.source === connection.target) return
  if (edges.value.some(edge => edge.source === connection.source && edge.target === connection.target)) return
  edges.value.push({ id: `e-${connection.source}-${connection.target}`, source: connection.source, target: connection.target, animated: true, label: '依赖' })
}

function updateSelected(field: 'name' | 'image' | 'port', value: string) {
  if (!selectedNode.value) return
  selectedNode.value.data![field] = value
}

function setStatus(status: ServiceData['status']) {
  if (selectedNode.value?.data) selectedNode.value.data.status = status
}

function removeSelected() {
  if (!selectedNode.value) return
  const removedId = selectedNode.value.id
  nodes.value = nodes.value.filter(node => node.id !== removedId)
  edges.value = edges.value.filter(edge => edge.source !== removedId && edge.target !== removedId)
  selectedId.value = nodes.value[0]?.id ?? ''
}

async function copyYaml() {
  await navigator.clipboard.writeText(composeYaml.value)
  copied.value = true
  window.setTimeout(() => copied.value = false, 1600)
}
</script>

<template>
  <main class="studio">
    <header class="topbar">
      <NuxtLink to="/" class="brand"><span class="brand-mark"><UIcon name="i-lucide-boxes" /></span><span>what<span class="brand-dot">.</span></span></NuxtLink>
      <span class="topbar-divider" />
      <div class="project-name"><span class="project-icon"><UIcon name="i-lucide-layers-2" /></span><span>my-first-stack</span><UIcon name="i-lucide-chevron-down" class="muted-icon" /></div>
      <div class="topbar-spacer" />
      <div class="save-state"><span />已保存</div>
      <button class="top-icon" title="画布适配" aria-label="画布适配" @click="fitView({ padding: 0.25, duration: 350 })"><UIcon name="i-lucide-scan" /></button>
      <button class="deploy-button" @click="activeView = activeView === 'canvas' ? 'yaml' : 'canvas'"><UIcon :name="activeView === 'canvas' ? 'i-lucide-file-code-2' : 'i-lucide-workflow'" />{{ activeView === 'canvas' ? '查看 Compose' : '返回画布' }}</button>
    </header>

    <div class="workspace">
      <aside class="palette panel">
        <div class="panel-heading"><div><p class="eyebrow">组件库</p><h1>搭建服务</h1></div><button class="square-button" title="服务组件" aria-label="服务组件"><UIcon name="i-lucide-layout-grid" /></button></div>
        <label class="search-box"><UIcon name="i-lucide-search" /><input v-model="search" placeholder="搜索镜像或服务" aria-label="搜索服务"></label>
        <div class="palette-section"><span class="section-label">常用服务</span><span class="section-count">{{ filteredServices.length }}</span></div>
        <button v-for="service in filteredServices" :key="service.name" class="service-option" @click="addService(service)">
          <span class="service-mark" :class="service.tone">{{ service.mark }}</span>
          <span class="service-option-copy"><strong>{{ service.name }}</strong><small>{{ service.description }}</small></span>
          <UIcon name="i-lucide-plus" class="add-icon" />
        </button>
        <div class="palette-foot"><span class="foot-icon"><UIcon name="i-lucide-lightbulb" /></span><span>点选积木添加服务<br><b>拖动节点，连接依赖</b></span></div>
      </aside>

      <section class="editor panel">
        <div class="canvas-toolbar">
          <div class="canvas-title"><span class="live-dot" /><div><strong>服务拓扑</strong><small>{{ nodes.length }} 个服务 · {{ edges.length }} 条连接</small></div></div>
          <div class="view-tabs"><button :class="{ active: activeView === 'canvas' }" @click="activeView = 'canvas'"><UIcon name="i-lucide-workflow" />画布</button><button :class="{ active: activeView === 'yaml' }" @click="activeView = 'yaml'"><UIcon name="i-lucide-braces" />YAML</button></div>
          <div class="canvas-actions"><span class="canvas-hint"><UIcon name="i-lucide-mouse-pointer-2" />拖拽画布 · 连线依赖</span><button class="square-button" title="画布适配" aria-label="画布适配" @click="fitView({ padding: 0.25, duration: 350 })"><UIcon name="i-lucide-maximize-2" /></button></div>
        </div>
        <div v-if="activeView === 'canvas'" class="flow-wrap">
          <VueFlow v-model:nodes="nodes" v-model:edges="edges" :node-types="{ service: ServiceNode }" fit-view-on-init @connect="connect" @node-click="selectedId = $event.node.id" @pane-click="selectedId = ''">
            <Background pattern-color="#d8ded9" :gap="22" :size="1.2" />
            <Controls position="bottom-left" />
            <div class="canvas-legend"><span><i class="legend-line" />服务依赖</span><span><i class="legend-status" />运行中</span></div>
          </VueFlow>
        </div>
        <div v-else class="yaml-view"><div class="yaml-toolbar"><span><span class="yaml-dot" />docker-compose.yml</span><button class="copy-button" @click="copyYaml"><UIcon :name="copied ? 'i-lucide-check' : 'i-lucide-copy'" />{{ copied ? '已复制' : '复制 YAML' }}</button></div><pre><code>{{ composeYaml }}</code></pre></div>
        <footer class="canvas-footer"><div class="footer-left"><span><UIcon name="i-lucide-git-branch" />main</span><span><UIcon name="i-lucide-clock-3" />刚刚编辑</span></div><span class="footer-right">Compose 规范 <b>v3.9</b></span></footer>
      </section>

      <aside class="inspector panel">
        <template v-if="selectedNode && selectedData">
          <div class="inspector-heading"><div><p class="eyebrow">服务配置</p><h2>属性</h2></div><button class="square-button" title="删除服务" aria-label="删除服务" @click="removeSelected"><UIcon name="i-lucide-trash-2" /></button></div>
          <div class="selected-service"><span class="service-mark large" :class="selectedData.tone">{{ selectedData.mark }}</span><div><strong>{{ selectedData.name }}</strong><small>{{ selectedData.description }}</small></div><span class="status-indicator" :class="selectedData.status" :title="selectedData.status === 'running' ? '运行中' : '已停止'" /></div>
          <div class="field-group"><label for="service-name">服务名称</label><div class="input-shell"><UIcon name="i-lucide-box" /><input id="service-name" :value="selectedData.name" @input="updateSelected('name', ($event.target as HTMLInputElement).value)"></div></div>
          <div class="field-group"><label for="service-image">镜像</label><div class="input-shell"><UIcon name="i-lucide-boxes" /><input id="service-image" :value="selectedData.image" @input="updateSelected('image', ($event.target as HTMLInputElement).value)"></div><small class="field-help">支持 Docker Hub 镜像与标签</small></div>
          <div class="field-group"><label for="service-port">端口映射</label><div class="input-shell"><UIcon name="i-lucide-waypoints" /><input id="service-port" :value="selectedData.port" placeholder="主机端口:容器端口" @input="updateSelected('port', ($event.target as HTMLInputElement).value)"></div></div>
          <div class="field-group"><label>运行状态</label><div class="status-select"><button :class="{ chosen: selectedData.status === 'running' }" @click="setStatus('running')"><span class="status-indicator running" />运行中</button><button :class="{ chosen: selectedData.status === 'stopped' }" @click="setStatus('stopped')"><span class="status-indicator stopped" />已停止</button></div></div>
          <div class="field-group"><label>网络</label><div class="network-chip"><span /><span>default</span><UIcon name="i-lucide-chevron-down" /></div></div>
          <div class="inspector-note"><UIcon name="i-lucide-info" /><span>拖动节点上的连接点，即可建立服务依赖。</span></div>
        </template>
        <div v-else class="empty-inspector"><span><UIcon name="i-lucide-mouse-pointer-2" /></span><strong>选择一个服务</strong><small>点击画布中的服务块查看和编辑属性</small></div>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.studio {
  --ink: #202622;
  --muted: #87918a;
  --line: #e8ebe7;
  --soft: #f7f8f5;
  display: flex;
  flex-direction: column;
  height: 100dvh;
  min-height: 560px;
  overflow: hidden;
  color: var(--ink);
  background: #f2f4f0;
  font-family: 'DM Sans', 'Noto Sans SC', sans-serif;
}

.topbar { display: flex; align-items: center; gap: 18px; height: 62px; padding: 0 22px; background: #fff; border-bottom: 1px solid var(--line); flex: 0 0 auto; }
.brand { display: inline-flex; align-items: center; gap: 9px; color: var(--ink); text-decoration: none; font-size: 17px; font-weight: 750; letter-spacing: 0; }
.brand-mark { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; color: #fff; background: #328566; font-size: 17px; }
.brand-dot { color: #e7785e; }
.topbar-divider { height: 24px; width: 1px; background: var(--line); }
.project-name { display: flex; align-items: center; gap: 9px; color: #354039; font-size: 13px; font-weight: 650; }
.project-icon { color: #3d8068; font-size: 16px; }
.muted-icon { margin-left: 2px; color: #929a94; font-size: 13px; }
.topbar-spacer { flex: 1; }
.save-state { display: flex; align-items: center; gap: 7px; color: #7a857d; font-size: 11px; }
.save-state > span, .live-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #53a37a; box-shadow: 0 0 0 3px #e8f4ec; }
.top-icon, .square-button { display: grid; place-items: center; width: 32px; height: 32px; border: 1px solid transparent; border-radius: 6px; color: #66716a; background: transparent; cursor: pointer; font-size: 16px; }
.top-icon:hover, .square-button:hover { border-color: var(--line); background: #f8f9f7; }
.deploy-button { display: inline-flex; align-items: center; gap: 8px; height: 34px; padding: 0 13px; border: 0; border-radius: 6px; color: #fff; background: #328566; font: inherit; font-size: 12px; font-weight: 650; cursor: pointer; }
.deploy-button:hover { background: #276e53; }
.workspace { display: grid; grid-template-columns: 236px minmax(400px, 1fr) 282px; gap: 10px; flex: 1; min-height: 0; padding: 10px; }
.panel { min-width: 0; background: #fff; border: 1px solid #e7eae6; border-radius: 7px; }
.palette, .inspector { display: flex; flex-direction: column; padding: 17px 14px; overflow: auto; }
.panel-heading, .inspector-heading { display: flex; align-items: center; justify-content: space-between; margin: 1px 0 17px; }
.eyebrow { margin: 0 0 4px; color: #94a098; font-size: 9px; font-weight: 750; letter-spacing: 1.2px; }
.panel-heading h1, .inspector-heading h2 { margin: 0; font-size: 16px; line-height: 1.25; font-weight: 700; }
.search-box { display: flex; align-items: center; gap: 8px; height: 35px; padding: 0 10px; border: 1px solid #e7ebe6; border-radius: 5px; color: #9aa29c; background: #fbfcfa; font-size: 14px; }
.search-box input, .input-shell input { width: 100%; min-width: 0; border: 0; outline: 0; color: var(--ink); background: transparent; font: inherit; font-size: 11px; }
.search-box input::placeholder, .input-shell input::placeholder { color: #a5ada7; }
.palette-section { display: flex; align-items: center; gap: 7px; margin: 23px 0 8px; }
.section-label { color: #717c74; font-size: 10px; font-weight: 700; }
.section-count { display: grid; place-items: center; min-width: 17px; height: 17px; padding: 0 4px; border-radius: 4px; color: #79847b; background: #f0f3ef; font-size: 9px; }
.service-option { display: flex; align-items: center; gap: 9px; width: 100%; padding: 8px 5px; border: 0; border-radius: 5px; text-align: left; background: transparent; cursor: pointer; }
.service-option:hover { background: #f6f8f5; }
.service-mark { display: grid; place-items: center; width: 32px; height: 32px; flex: 0 0 auto; border-radius: 7px; font-size: 10px; font-weight: 800; }
.service-mark.mint { color: #318664; background: #e4f3eb; }
.service-mark.coral { color: #c6644c; background: #fbeae4; }
.service-mark.blue { color: #4e79a3; background: #e8eff7; }
.service-mark.amber { color: #a67a25; background: #f8f0dc; }
.service-option-copy { display: grid; gap: 3px; min-width: 0; flex: 1; }
.service-option-copy strong { font-size: 11px; font-weight: 650; }
.service-option-copy small { overflow: hidden; color: #929b94; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.add-icon { color: #a1aaa3; font-size: 14px; opacity: 0; }
.service-option:hover .add-icon { opacity: 1; }
.palette-foot { display: flex; align-items: center; gap: 9px; margin-top: auto; padding: 12px 8px 0; border-top: 1px solid #edf0ed; color: #89928b; font-size: 9px; line-height: 1.7; }
.palette-foot b { color: #58645b; font-weight: 650; }
.foot-icon { color: #d39e3d; font-size: 15px; }
.editor { display: flex; flex-direction: column; overflow: hidden; }
.canvas-toolbar { display: flex; align-items: center; gap: 16px; min-height: 57px; padding: 0 15px; border-bottom: 1px solid #edf0ed; }
.canvas-title { display: flex; align-items: center; gap: 11px; min-width: 136px; }
.canvas-title > div { display: grid; gap: 3px; }
.canvas-title strong { font-size: 11px; font-weight: 700; }
.canvas-title small { color: #929b94; font-size: 9px; }
.view-tabs { display: flex; align-self: stretch; gap: 4px; }
.view-tabs button { display: flex; align-items: center; gap: 6px; padding: 0 10px; border: 0; border-bottom: 2px solid transparent; color: #838d85; background: transparent; font: inherit; font-size: 10px; cursor: pointer; }
.view-tabs button.active { border-bottom-color: #38896b; color: #327b60; font-weight: 700; }
.canvas-actions { display: flex; align-items: center; gap: 6px; margin-left: auto; }
.canvas-hint { display: flex; align-items: center; gap: 5px; color: #98a19a; font-size: 9px; }
.flow-wrap { position: relative; flex: 1; min-height: 0; background-color: #fafbf9; background-image: radial-gradient(#dbe1dc 0.75px, transparent 0.75px); background-size: 20px 20px; }
.flow-wrap :deep(.vue-flow) { background: transparent; }
.flow-wrap :deep(.vue-flow__background) { opacity: 0; }
.flow-wrap :deep(.vue-flow__edge-path) { stroke: #8caa98; stroke-width: 1.6; }
.flow-wrap :deep(.vue-flow__edge.animated path) { stroke: #45876a; stroke-dasharray: 5 4; }
.flow-wrap :deep(.vue-flow__edge-text) { fill: #77877c; font-size: 9px; }
.flow-wrap :deep(.vue-flow__edge-textbg) { fill: #fafbf9; }
.flow-wrap :deep(.vue-flow__handle) { width: 9px; height: 9px; border: 2px solid #fff; background: #4e9875; box-shadow: 0 0 0 1px #80aa91; }
.flow-wrap :deep(.vue-flow__controls) { overflow: hidden; border: 1px solid #e7ebe6; border-radius: 6px; box-shadow: 0 2px 8px #2333260b; }
.flow-wrap :deep(.vue-flow__controls-button) { width: 27px; height: 27px; border-bottom-color: #edf0ed; background: #fff; fill: #66716a; }
.canvas-legend { position: absolute; right: 14px; bottom: 14px; display: flex; gap: 13px; padding: 7px 9px; border: 1px solid #e8ece7; border-radius: 5px; color: #818b83; background: #ffffffed; font-size: 9px; pointer-events: none; }
.canvas-legend span { display: flex; align-items: center; gap: 6px; }
.legend-line { width: 14px; height: 0; border-top: 1.5px solid #8caa98; }
.legend-status { width: 6px; height: 6px; border-radius: 50%; background: #59a779; }
.canvas-footer { display: flex; align-items: center; justify-content: space-between; height: 31px; padding: 0 13px; border-top: 1px solid #edf0ed; color: #929b94; font-size: 9px; }
.footer-left { display: flex; gap: 15px; }
.footer-left span { display: flex; align-items: center; gap: 5px; }
.footer-right b { color: #68746b; font-weight: 600; }
.yaml-view { flex: 1; min-height: 0; overflow: auto; background: #fcfdfb; }
.yaml-toolbar { position: sticky; top: 0; display: flex; align-items: center; justify-content: space-between; height: 42px; padding: 0 16px; border-bottom: 1px solid #edf0ed; color: #747f76; background: #fff; font-size: 10px; }
.yaml-toolbar > span { display: flex; align-items: center; gap: 7px; }
.yaml-dot { width: 7px; height: 7px; border-radius: 50%; background: #e7ac53; }
.copy-button { display: flex; align-items: center; gap: 6px; padding: 5px 8px; border: 1px solid #e5eae5; border-radius: 4px; color: #657168; background: white; font: inherit; font-size: 9px; cursor: pointer; }
.yaml-view pre { margin: 0; padding: 20px 24px; color: #385b4c; font: 11px/1.9 'JetBrains Mono', Consolas, monospace; white-space: pre-wrap; }
.inspector { padding: 17px 15px; }
.inspector-heading { margin-bottom: 15px; }
.selected-service { display: flex; align-items: center; gap: 10px; padding: 12px 10px; border: 1px solid #edf0ed; border-radius: 6px; background: #fbfcfa; }
.service-mark.large { width: 36px; height: 36px; font-size: 11px; }
.selected-service > div { display: grid; gap: 4px; min-width: 0; flex: 1; }
.selected-service strong { overflow: hidden; font: 650 12px 'JetBrains Mono', Consolas, monospace; text-overflow: ellipsis; }
.selected-service small { color: #89938b; font-size: 9px; }
.status-indicator { display: inline-block; width: 7px; height: 7px; flex: 0 0 auto; border-radius: 50%; }
.status-indicator.running { background: #54a878; box-shadow: 0 0 0 3px #e5f3e9; }
.status-indicator.stopped { background: #c4c9c5; box-shadow: 0 0 0 3px #eff1ef; }
.field-group { display: grid; gap: 7px; margin-top: 19px; }
.field-group > label { color: #68736b; font-size: 10px; font-weight: 650; }
.input-shell { display: flex; align-items: center; gap: 8px; height: 34px; padding: 0 9px; border: 1px solid #e7ebe6; border-radius: 5px; color: #96a098; background: #fff; font-size: 13px; }
.input-shell:focus-within { border-color: #80ad93; box-shadow: 0 0 0 2px #eaf4ed; }
.input-shell input { font-size: 10px; }
.field-help { color: #a0a8a1; font-size: 9px; }
.status-select { display: flex; gap: 6px; }
.status-select button { display: flex; align-items: center; gap: 7px; min-height: 31px; padding: 0 8px; border: 1px solid #e8ece8; border-radius: 5px; color: #808a82; background: #fff; font: inherit; font-size: 9px; cursor: pointer; }
.status-select button.chosen { border-color: #bfd9c8; color: #3b7957; background: #f2f8f3; }
.network-chip { display: flex; align-items: center; gap: 7px; width: fit-content; padding: 6px 8px; border: 1px solid #e8ece8; border-radius: 4px; color: #657168; font-size: 9px; }
.network-chip > span:first-child { width: 6px; height: 6px; border-radius: 2px; background: #d09a41; }
.network-chip :deep(svg) { margin-left: 8px; color: #99a29a; }
.inspector-note { display: flex; gap: 7px; margin-top: auto; padding: 11px 8px 0; border-top: 1px solid #edf0ed; color: #939c95; font-size: 9px; line-height: 1.7; }
.inspector-note :deep(svg) { flex: 0 0 auto; margin-top: 1px; color: #7e9d88; }
.empty-inspector { display: grid; justify-items: center; gap: 9px; margin: auto 0; text-align: center; }
.empty-inspector > span { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; color: #71927c; background: #eef5ef; font-size: 17px; }
.empty-inspector strong { font-size: 12px; }
.empty-inspector small { max-width: 175px; color: #929b94; font-size: 9px; line-height: 1.6; }

@media (max-width: 1100px) {
  .workspace { grid-template-columns: 205px minmax(340px, 1fr) 250px; gap: 7px; padding: 7px; }
  .canvas-hint { display: none; }
}

@media (max-width: 820px) {
  .workspace { grid-template-columns: 190px minmax(0, 1fr); }
  .inspector { display: none; }
}

@media (max-width: 560px) {
  .studio { min-height: 500px; }
  .topbar { height: 54px; padding: 0 12px; gap: 10px; }
  .topbar-divider, .project-icon, .save-state, .top-icon { display: none; }
  .brand { font-size: 15px; }
  .project-name { font-size: 11px; }
  .deploy-button { gap: 5px; height: 31px; padding: 0 9px; font-size: 10px; }
  .workspace { grid-template-columns: minmax(0, 1fr); padding: 6px; }
  .palette { display: none; }
  .canvas-toolbar { min-height: 51px; gap: 6px; padding: 0 9px; }
  .canvas-title { min-width: auto; gap: 8px; }
  .view-tabs { margin-left: auto; }
  .view-tabs button { gap: 4px; padding: 0 6px; font-size: 9px; }
  .canvas-actions { display: none; }
  .canvas-footer { padding: 0 8px; }
  .footer-left { gap: 8px; }
}
</style>
