<template>
  <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
    <h3 class="text-sm font-bold text-slate-400 mb-3">匹配结果高亮</h3>
    <div v-if="error" class="text-red-400 text-sm">解析错误</div>
    <div v-else-if="highlight" class="bg-slate-900 rounded-lg p-4 font-mono text-sm overflow-x-auto">
      <span class="text-slate-500">{{ highlight.before }}</span>
      <span class="bg-green-600 text-white px-1 rounded">{{ highlight.match }}</span>
      <span class="text-slate-500">{{ highlight.after }}</span>
    </div>
    <div v-else-if="result && !result.matched" class="text-red-400 text-sm">未匹配到结果</div>
    <div v-else class="text-slate-500 text-sm">等待执行...</div>

    <div v-if="result && result.matched" class="mt-4">
      <h4 class="text-xs font-bold text-slate-500 mb-2">分组捕获 ({{ result.groups.length }})</h4>
      <div class="space-y-1">
        <div v-for="(group, i) in result.groups" :key="i" class="flex items-center gap-2 text-sm">
          <span class="inline-block w-4 h-4 rounded" :style="{ backgroundColor: store.groupColors[i % store.groupColors.length] }"></span>
          <span class="text-slate-500 w-16">Group {{ i }}</span>
          <span class="text-slate-200 font-mono bg-slate-900 px-2 py-0.5 rounded">{{ group || '∅' }}</span>
        </div>
      </div>
    </div>

    <div v-if="result && result.steps.length > 0" class="mt-4">
      <h4 class="text-xs font-bold text-slate-500 mb-2">执行步骤 (最近5步)</h4>
      <div class="space-y-1 max-h-32 overflow-y-auto">
        <div v-for="step in recentSteps" :key="step.stepIndex"
          class="text-xs font-mono px-2 py-1 rounded"
          :class="step.isBacktrack ? 'bg-orange-900 text-orange-300' : step.stepIndex === currentStepValue ? 'bg-cyan-900 text-cyan-300' : 'bg-slate-900 text-slate-400'">
          [{{ step.stepIndex }}] '{{ step.char }}' → 状态{{ step.currentState}}→{{ step.nextState }} ({{ step.transition }}){{ step.isBacktrack ? ' ⚠回溯' : '' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRegexStore } from '../store/regex'
import type { MatchResult } from '../types'

// 可选 props：传入则使用传入值（只读分享页），否则回退到编辑器 store。
// 编辑器与分享页共用同一渲染逻辑，保证高亮/分组/步骤展示一致。
const props = defineProps<{
  matchResult?: MatchResult | null
  testString?: string
  currentStep?: number
  error?: string
}>()

const store = useRegexStore()

const result = computed(() => props.matchResult !== undefined ? props.matchResult : store.matchResult)
const text = computed(() => props.testString !== undefined ? props.testString : store.testString)
const currentStepValue = computed(() => props.currentStep !== undefined ? props.currentStep : store.currentStep)
const error = computed(() => props.error !== undefined ? props.error : store.error)

const highlight = computed(() => {
  const mr = result.value
  if (!mr || !mr.matched) return null
  const idx = text.value.indexOf(mr.matchText)
  if (idx === -1) return null
  return {
    before: text.value.substring(0, idx),
    match: mr.matchText,
    after: text.value.substring(idx + mr.matchText.length)
  }
})

const recentSteps = computed(() => {
  if (!result.value) return []
  const end = currentStepValue.value + 1
  return result.value.steps.slice(Math.max(0, end - 5), end)
})
</script>
