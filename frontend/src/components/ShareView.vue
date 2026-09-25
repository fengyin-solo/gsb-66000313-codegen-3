<template>
  <div class="min-h-screen bg-slate-900 text-slate-200">
    <header class="border-b border-slate-700 px-6 py-4 flex items-center justify-between flex-wrap gap-2">
      <div>
        <h1 class="text-2xl font-bold text-cyan-400">正则表达式可视化调试器</h1>
        <p class="text-sm text-slate-500 mt-1">分享的只读用例</p>
      </div>
      <button @click="backToEditor" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm">← 返回编辑器</button>
    </header>

    <!-- 链接恢复失败：给出可理解的说明 -->
    <div v-if="decodeError" class="max-w-xl mx-auto mt-16 bg-slate-800 rounded-lg p-6 border border-red-900">
      <div class="text-4xl mb-3">{{ decodeErrorIcon }}</div>
      <h2 class="text-lg font-bold text-red-400 mb-2">无法打开分享链接</h2>
      <p class="text-sm text-slate-300 mb-4">{{ decodeError }}</p>
      <p class="text-xs text-slate-500 mb-4">你的本地用例未受影响，可返回编辑器继续编辑。</p>
      <button @click="backToEditor" class="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-bold">返回编辑器</button>
    </div>

    <!-- 正则本身无法解析 -->
    <div v-else-if="parseError" class="max-w-xl mx-auto mt-16 bg-slate-800 rounded-lg p-6 border border-red-900">
      <div class="text-4xl mb-3">⚠️</div>
      <h2 class="text-lg font-bold text-red-400 mb-2">用例无法复现</h2>
      <p class="text-sm text-slate-300 mb-4">分享的正则表达式解析失败：{{ parseError }}</p>
      <button @click="backToEditor" class="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-bold">返回编辑器</button>
    </div>

    <div v-else-if="sharedCase && analysis" class="p-4 space-y-4">
      <!-- 只读提示条 -->
      <div class="bg-purple-900/30 border border-purple-700 rounded-lg px-4 py-2 flex items-center justify-between flex-wrap gap-2">
        <span class="text-sm text-purple-300">🔒 只读模式：这是他人分享的用例，内容不可编辑，也不会改动你本地正在编辑的用例。</span>
        <button @click="importToEditor" class="px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded text-sm font-bold">在编辑器中打开此用例</button>
      </div>

      <div v-if="editRejected" class="bg-orange-900/40 border border-orange-700 rounded-lg px-4 py-2 text-sm text-orange-300">
        ⛔ 只读分享用例不允许编辑，修改请求已被拒绝。如需修改，请点击"在编辑器中打开此用例"生成可编辑副本。
      </div>

      <div class="flex flex-col lg:flex-row gap-4">
        <!-- 只读用例内容 -->
        <div class="lg:w-1/4 space-y-4">
          <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 class="text-sm font-bold text-slate-400 mb-3">正则表达式（只读）</h3>
            <div class="relative">
              <span class="absolute left-3 top-2 text-cyan-500 font-bold text-lg">/</span>
              <input
                :value="sharedCase.pattern"
                readonly
                @keydown.prevent="rejectEdit"
                @paste.prevent="rejectEdit"
                @drop.prevent="rejectEdit"
                class="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-12 py-2 text-cyan-400 font-mono text-sm cursor-not-allowed select-all focus:outline-none"
              />
              <span class="absolute right-3 top-2 text-cyan-500 font-bold text-lg">/g</span>
            </div>
            <h3 class="text-sm font-bold text-slate-400 mt-4 mb-2">测试文本（只读）</h3>
            <textarea
              :value="sharedCase.testString"
              readonly
              @keydown.prevent="rejectEdit"
              @paste.prevent="rejectEdit"
              @drop.prevent="rejectEdit"
              rows="3"
              class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono text-sm cursor-not-allowed select-all focus:outline-none resize-none"
            ></textarea>
            <p class="text-xs text-slate-500 mt-2">格式版本 v{{ sharedCase.version }} · 链接内容确定，多次打开结果一致</p>
          </div>
        </div>

        <!-- 可视化与高亮：与编辑器共用组件，保证展示一致 -->
        <div class="lg:w-1/2 space-y-4">
          <NfaVisualizer :nfa="analysis.nfa" :match-result="analysis.matchResult" :current-step="currentStep" />
          <MatchHighlight :match-result="analysis.matchResult" :test-string="sharedCase.testString" :current-step="currentStep" error="" />
        </div>

        <!-- 统计与逐步控制（本地状态，不回写 store） -->
        <div class="lg:w-1/4 space-y-4">
          <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 class="text-sm font-bold text-slate-400 mb-3">匹配统计</h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between"><span class="text-slate-500">匹配状态</span><span :class="analysis.matchResult.matched ? 'text-green-400' : 'text-red-400'">{{ analysis.matchResult.matched ? '✓ 匹配成功' : '✗ 未匹配' }}</span></div>
              <div class="flex justify-between"><span class="text-slate-500">匹配文本</span><span class="text-cyan-400 font-mono truncate ml-2">{{ analysis.matchResult.matchText || '—' }}</span></div>
              <div class="flex justify-between"><span class="text-slate-500">总步数</span><span class="text-slate-300">{{ analysis.matchResult.totalSteps }}</span></div>
              <div class="flex justify-between"><span class="text-slate-500">回溯次数</span><span :class="analysis.matchResult.backtracks > 0 ? 'text-orange-400 font-bold' : 'text-slate-300'">{{ analysis.matchResult.backtracks }}</span></div>
              <div class="flex justify-between"><span class="text-slate-500">耗时(ms)</span><span class="text-slate-300">{{ analysis.matchResult.duration }}</span></div>
            </div>
          </div>

          <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 class="text-sm font-bold text-slate-400 mb-3">逐步控制</h3>
            <div class="flex flex-wrap items-center gap-2 mb-3">
              <button @click="stepBackward" :disabled="currentStep === 0" class="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 rounded text-sm">⏮ 上一步</button>
              <button v-if="!isPlaying" @click="play" class="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 rounded text-sm">▶ 播放</button>
              <button v-else @click="stop" class="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm">⏸ 停止</button>
              <button @click="stepForward" :disabled="currentStep >= analysis.matchResult.steps.length - 1" class="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 rounded text-sm">下一步 ⏭</button>
              <button @click="currentStep = 0" class="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm">⟲ 重置</button>
            </div>
            <div class="text-sm text-slate-400">步骤: {{ currentStep }} / {{ analysis.matchResult.steps.length }}</div>
          </div>

          <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 class="text-sm font-bold text-slate-400 mb-3">当前步骤详情</h3>
            <div v-if="analysis.matchResult.steps[currentStep]" class="space-y-1 text-sm">
              <div>字符索引: <span class="text-cyan-400">{{ analysis.matchResult.steps[currentStep].charIndex }}</span></div>
              <div>当前字符: <span class="text-yellow-400 font-mono">'{{ analysis.matchResult.steps[currentStep].char }}'</span></div>
              <div>状态转换: <span class="text-green-400">{{ analysis.matchResult.steps[currentStep].currentState }}</span> → <span class="text-blue-400">{{ analysis.matchResult.steps[currentStep].nextState }}</span></div>
              <div>转移符号: <span class="text-purple-400 font-mono">{{ analysis.matchResult.steps[currentStep].transition }}</span></div>
              <div v-if="analysis.matchResult.steps[currentStep].isBacktrack" class="text-orange-400 font-bold">⚠ 回溯发生</div>
            </div>
            <div v-else class="text-slate-500 text-sm">无步骤数据</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRegexStore, analyzeCase } from '../store/regex'
import { decodeShareCase, ShareError } from '../utils/share'
import type { ShareCase, NFA, MatchResult, ASTNode } from '../types'
import NfaVisualizer from './NfaVisualizer.vue'
import MatchHighlight from './MatchHighlight.vue'

const props = defineProps<{ payload: string }>()

const store = useRegexStore()

const sharedCase = ref<ShareCase | null>(null)
const decodeError = ref('')
const decodeErrorCode = ref<string>('')
const parseError = ref('')
const analysis = ref<{ nfa: NFA; matchResult: MatchResult; ast: ASTNode } | null>(null)
const currentStep = ref(0)
const isPlaying = ref(false)
const editRejected = ref(false)

const decodeErrorIcon = computed(() => {
  if (decodeErrorCode.value === 'too-long') return '📏'
  if (decodeErrorCode.value === 'version') return '🔀'
  return '🔗'
})

// 解码并独立复现匹配过程：只使用纯函数 analyzeCase，
// 不写入 store，因此不会覆盖本地正在编辑的用例；同一 payload 结果确定一致。
function restore(payload: string) {
  sharedCase.value = null
  analysis.value = null
  decodeError.value = ''
  decodeErrorCode.value = ''
  parseError.value = ''
  currentStep.value = 0
  isPlaying.value = false
  try {
    const c = decodeShareCase(payload)
    sharedCase.value = c
    try {
      analysis.value = analyzeCase(c.pattern, c.testString)
    } catch (e: any) {
      parseError.value = e.message || '正则表达式解析错误'
    }
  } catch (e: any) {
    if (e instanceof ShareError) {
      decodeError.value = e.message
      decodeErrorCode.value = e.code
    } else {
      decodeError.value = e.message || '链接恢复失败，请确认链接完整。'
      decodeErrorCode.value = 'invalid'
    }
  }
}

watch(() => props.payload, p => restore(p), { immediate: true })

let rejectTimer: ReturnType<typeof setTimeout> | undefined
// 越权编辑拒绝：只读链接不允许改动用例内容
function rejectEdit() {
  editRejected.value = true
  clearTimeout(rejectTimer)
  rejectTimer = setTimeout(() => { editRejected.value = false }, 3000)
}

function backToEditor() {
  // 仅清除 hash 返回编辑器；store 中的本地用例从未被分享页修改
  window.location.hash = ''
}

// 显式导入：用户主动选择才把分享用例复制进编辑器；会覆盖本地编辑前先确认
function importToEditor() {
  if (!sharedCase.value) return
  const differs = store.pattern !== sharedCase.value.pattern || store.testString !== sharedCase.value.testString
  if (differs && !window.confirm('此操作会用分享用例覆盖你本地正在编辑的正则与测试文本，是否继续？')) {
    return
  }
  store.setPattern(sharedCase.value.pattern)
  store.setTestString(sharedCase.value.testString)
  backToEditor()
}

function stepForward() {
  if (analysis.value && currentStep.value < analysis.value.matchResult.steps.length - 1) currentStep.value++
}
function stepBackward() {
  if (currentStep.value > 0) currentStep.value--
}
function play() {
  isPlaying.value = true
  const interval = setInterval(() => {
    if (analysis.value && currentStep.value < analysis.value.matchResult.steps.length - 1) {
      currentStep.value++
    } else {
      isPlaying.value = false
      clearInterval(interval)
    }
  }, 200)
}
function stop() {
  isPlaying.value = false
}
</script>
