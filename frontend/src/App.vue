<template>
  <div class="min-h-screen bg-slate-900 text-slate-200">
    <header class="border-b border-slate-700 px-6 py-4">
      <h1 class="text-2xl font-bold text-cyan-400">正则表达式可视化调试器</h1>
      <p class="text-sm text-slate-500 mt-1">NFA 状态机可视化 · 逐步匹配高亮 · 分组捕获 · 回溯追踪</p>
    </header>

    <!-- 只读分享视图横幅 -->
    <div v-if="store.isSharedView" class="mx-4 mt-4 flex items-center justify-between gap-3 bg-indigo-900/50 border border-indigo-600 rounded-lg px-4 py-3">
      <div class="text-sm text-indigo-200">
        🔗 <b>只读分享视图</b>：正在查看他人分享的用例，高亮、分组与步骤与创建时一致。此视图不能修改原用例，编辑操作将被拒绝。
      </div>
      <button @click="exitShare" class="shrink-0 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-bold">退出分享，返回本地编辑</button>
    </div>

    <!-- 分享链接恢复失败说明（不影响本地用例） -->
    <div v-if="store.shareError" class="mx-4 mt-4 flex items-center justify-between gap-3 bg-red-900/40 border border-red-700 rounded-lg px-4 py-3">
      <div class="text-sm text-red-200">
        ⚠ <b>分享链接打开失败</b>：{{ store.shareError.message }}。已保留你本地正在编辑的用例，未做任何改动。
      </div>
      <button @click="dismissError" class="shrink-0 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm">知道了</button>
    </div>

    <!-- 越权编辑拒绝提示 -->
    <div v-if="store.shareNotice" class="mx-4 mt-4 flex items-center justify-between gap-3 bg-orange-900/40 border border-orange-700 rounded-lg px-4 py-3">
      <div class="text-sm text-orange-200">🚫 {{ store.shareNotice }}</div>
      <button @click="store.dismissShareNotice()" class="shrink-0 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm">关闭</button>
    </div>

    <div class="flex flex-col lg:flex-row gap-4 p-4">
      <div class="lg:w-1/4 space-y-4">
        <RegexEditor />
        <ShareBar />
        <TemplateLibrary />
      </div>

      <div class="lg:w-1/2 space-y-4">
        <NfaVisualizer />
        <MatchHighlight />
      </div>

      <div class="lg:w-1/4 space-y-4">
        <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 class="text-sm font-bold text-slate-400 mb-3">匹配统计</h3>
          <div v-if="store.matchResult" class="space-y-2 text-sm">
            <div class="flex justify-between"><span class="text-slate-500">匹配状态</span><span :class="store.matchResult.matched ? 'text-green-400' : 'text-red-400'">{{ store.matchResult.matched ? '✓ 匹配成功' : '✗ 未匹配' }}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">匹配文本</span><span class="text-cyan-400 font-mono truncate ml-2">{{ store.matchResult.matchText || '—' }}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">总步数</span><span class="text-slate-300">{{ store.matchResult.totalSteps }}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">回溯次数</span><span :class="store.matchResult.backtracks > 0 ? 'text-orange-400 font-bold' : 'text-slate-300'">{{ store.matchResult.backtracks }}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">耗时(ms)</span><span class="text-slate-300">{{ store.matchResult.duration }}</span></div>
          </div>
          <div v-else class="text-slate-500 text-sm">点击"执行匹配"开始</div>
        </div>

        <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 class="text-sm font-bold text-slate-400 mb-3">逐步控制</h3>
          <div class="flex flex-wrap items-center gap-2 mb-3">
            <button @click="store.stepBackward" :disabled="store.currentStep === 0" class="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 rounded text-sm">⏮ 上一步</button>
            <button v-if="!store.isPlaying" @click="store.play" class="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 rounded text-sm">▶ 播放</button>
            <button v-else @click="store.stop" class="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm">⏸ 停止</button>
            <button @click="store.stepForward" :disabled="!store.matchResult || store.currentStep >= store.matchResult.steps.length - 1" class="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 rounded text-sm">下一步 ⏭</button>
            <button @click="store.resetStep" class="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm">⟲ 重置</button>
          </div>
          <div class="text-sm text-slate-400">步骤: {{ store.currentStep }} / {{ store.matchResult?.steps.length || 0 }}</div>
        </div>

        <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 class="text-sm font-bold text-slate-400 mb-3">当前步骤详情</h3>
          <div v-if="store.matchResult && store.matchResult.steps[store.currentStep]" class="space-y-1 text-sm">
            <div>字符索引: <span class="text-cyan-400">{{ store.matchResult.steps[store.currentStep].charIndex }}</span></div>
            <div>当前字符: <span class="text-yellow-400 font-mono">'{{ store.matchResult.steps[store.currentStep].char }}'</span></div>
            <div>状态转换: <span class="text-green-400">{{ store.matchResult.steps[store.currentStep].currentState }}</span> → <span class="text-blue-400">{{ store.matchResult.steps[store.currentStep].nextState }}</span></div>
            <div>转移符号: <span class="text-purple-400 font-mono">{{ store.matchResult.steps[store.currentStep].transition }}</span></div>
            <div v-if="store.matchResult.steps[store.currentStep].isBacktrack" class="text-orange-400 font-bold">⚠ 回溯发生</div>
          </div>
          <div v-else class="text-slate-500 text-sm">无步骤数据</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRegexStore } from './store/regex'
import { parseShareHash, decodeShareCase } from './utils/shareLink'
import RegexEditor from './components/RegexEditor.vue'
import NfaVisualizer from './components/NfaVisualizer.vue'
import MatchHighlight from './components/MatchHighlight.vue'
import TemplateLibrary from './components/TemplateLibrary.vue'
import ShareBar from './components/ShareBar.vue'

const store = useRegexStore()

onMounted(() => {
  const data = parseShareHash(window.location.hash)
  if (data === null) {
    store.execute()
    return
  }
  const result = decodeShareCase(data)
  if (result.ok) {
    // 进入只读分享视图，复现创建时的高亮、分组与步骤
    store.enterSharedView(result.payload)
  } else {
    // 恢复失败：给出说明，保留本地正在编辑的用例
    store.setShareError(result.error)
    store.execute()
  }
})

function exitShare() {
  store.exitSharedView()
  // 清除 hash，避免刷新后再次进入分享视图
  history.replaceState(null, '', window.location.pathname + window.location.search)
}

function dismissError() {
  store.dismissShareError()
  history.replaceState(null, '', window.location.pathname + window.location.search)
}

// 越权提示 6 秒后自动消失
watch(() => store.shareNotice, notice => {
  if (!notice) return
  setTimeout(() => store.dismissShareNotice(), 6000)
})
</script>
