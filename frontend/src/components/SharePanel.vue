<template>
  <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
    <h3 class="text-sm font-bold text-slate-400 mb-3">分享用例</h3>
    <p class="text-xs text-slate-500 mb-3">将当前正则与测试文本编码为只读链接，收件人打开即可复现匹配过程；链接内容确定，多次生成结果一致。</p>
    <button @click="generate" class="w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-bold text-sm">🔗 生成分享链接</button>

    <div v-if="shareError" class="mt-3 text-red-400 text-sm">⚠ {{ shareError }}</div>

    <div v-if="shareUrl" class="mt-3 space-y-2">
      <input
        :value="shareUrl"
        readonly
        @focus="($event.target as HTMLInputElement).select()"
        class="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-cyan-400 font-mono text-xs focus:outline-none"
      />
      <div class="flex items-center gap-2">
        <button @click="copy" class="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm">{{ copied ? '✓ 已复制' : '📋 复制链接' }}</button>
        <span class="text-xs text-slate-500">只读链接 · 收件人无法修改你的用例</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRegexStore } from '../store/regex'
import { buildShareUrl, ShareError } from '../utils/share'

const store = useRegexStore()
const shareUrl = ref('')
const shareError = ref('')
const copied = ref(false)

function generate() {
  shareError.value = ''
  copied.value = false
  // 先强制同步编辑器中尚在防抖等待的输入，保证链接内容与当前编辑完全一致
  window.dispatchEvent(new Event('regex:flush'))
  try {
    shareUrl.value = buildShareUrl(store.pattern, store.testString)
  } catch (e: any) {
    shareUrl.value = ''
    shareError.value = e instanceof ShareError ? e.message : (e.message || '生成分享链接失败')
  }
}

async function copy() {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    copied.value = true
  } catch {
    // 剪贴板不可用（如非安全上下文）时退化为手动复制：选中输入框内容
    copied.value = false
  }
}
</script>
