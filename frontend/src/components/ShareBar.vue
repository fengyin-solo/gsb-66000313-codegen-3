<template>
  <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
    <h3 class="text-sm font-bold text-slate-400 mb-3">分享用例</h3>
    <p class="text-xs text-slate-500 mb-3">将当前正则与测试文本编码为只读链接，收件人打开即可复现匹配过程，且无法修改你的用例。</p>

    <button
      @click="generate"
      :disabled="store.isSharedView"
      class="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-white font-bold text-sm"
    >{{ store.isSharedView ? '分享视图下不可生成链接' : '🔗 生成分享链接' }}</button>

    <div v-if="errorMessage" class="mt-3 text-red-400 text-xs">⚠ {{ errorMessage }}</div>

    <div v-if="shareUrl" class="mt-3 space-y-2">
      <input
        ref="urlInput"
        :value="shareUrl"
        readonly
        @focus="($event.target as HTMLInputElement).select()"
        class="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-cyan-400 font-mono text-xs focus:outline-none focus:border-cyan-500"
      />
      <div class="flex items-center gap-2">
        <button @click="copy" class="flex-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm">
          {{ copied ? '✓ 已复制到剪贴板' : '📋 复制链接' }}
        </button>
        <span class="text-xs text-slate-500">{{ shareUrl.length }} 字符</span>
      </div>
      <p class="text-xs text-slate-500">同一链接多次打开结果一致；链接为只读，不包含任何修改权限。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRegexStore } from '../store/regex'
import { buildShareUrl } from '../utils/shareLink'

const store = useRegexStore()
const shareUrl = ref('')
const errorMessage = ref('')
const copied = ref(false)
const urlInput = ref<HTMLInputElement | null>(null)

function generate() {
  copied.value = false
  errorMessage.value = ''
  shareUrl.value = ''
  const base = window.location.origin + window.location.pathname
  const result = buildShareUrl(store.pattern, store.testString, base)
  if (!result.ok) {
    errorMessage.value = result.error.message
    return
  }
  shareUrl.value = result.url
}

async function copy() {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    copied.value = true
  } catch {
    // 剪贴板 API 不可用时退化为选中文本，由用户手动复制
    urlInput.value?.select()
    copied.value = false
  }
}
</script>
