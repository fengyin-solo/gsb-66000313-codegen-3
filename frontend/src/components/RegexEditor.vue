<template>
  <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-bold text-slate-400">正则表达式输入</h3>
      <span v-if="store.isSharedView" class="text-xs px-1.5 py-0.5 rounded bg-indigo-900 text-indigo-300">🔒 只读</span>
    </div>
    <div class="relative">
      <span class="absolute left-3 top-2 text-cyan-500 font-bold text-lg">/</span>
      <input
        v-model="localPattern"
        @input="onInput"
        @keyup.enter="execute"
        type="text"
        placeholder="输入正则表达式..."
        :disabled="store.isSharedView"
        class="w-full bg-slate-900 border border-slate-600 rounded-lg pl-8 pr-12 py-2 text-cyan-400 font-mono text-sm focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <span class="absolute right-3 top-2 text-cyan-500 font-bold text-lg">/g</span>
    </div>
    <div v-if="store.error" class="mt-2 text-red-400 text-sm">⚠ {{ store.error }}</div>
    <textarea
      v-model="localTestString"
      @input="onTestInput"
      placeholder="输入测试字符串..."
      rows="3"
      :disabled="store.isSharedView"
      class="w-full mt-3 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 font-mono text-sm focus:outline-none focus:border-cyan-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
    ></textarea>
    <button @click="execute" class="w-full mt-3 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-bold text-sm">执行匹配</button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRegexStore } from '../store/regex'

const store = useRegexStore()
const localPattern = ref(store.pattern)
const localTestString = ref(store.testString)

// 分享视图加载用例、退出分享恢复本地用例时，同步到输入框
watch(() => store.pattern, v => { localPattern.value = v })
watch(() => store.testString, v => { localTestString.value = v })

let debounceTimer: ReturnType<typeof setTimeout>
function onInput() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { store.setPattern(localPattern.value) }, 300)
}
function onTestInput() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { store.setTestString(localTestString.value) }, 300)
}
function execute() {
  if (store.isSharedView) {
    // 只读视图下仅允许重新执行匹配，不允许写回用例内容
    store.execute()
    return
  }
  store.setPattern(localPattern.value)
  store.setTestString(localTestString.value)
  store.execute()
}
</script>
