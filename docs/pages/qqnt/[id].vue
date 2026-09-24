<template lang="pug">
#emoji-details
  .breadcrumb-nav
    .breadcrumb-content
      RouterLink.breadcrumb-link(to='/qqnt')
        ArrowLeft(:size='16')
        span 返回列表
      ChevronRight.breadcrumb-separator(:size='14')
      .breadcrumb-current {{ data?.describe?.replace(/^\//, '') || data?.emojiId || 'Loading...' }}

  .loading-state(v-if='!data')
    .spinner
    p.loading-text 正在加载表情详情...

  .detail-content(v-else)
    //- Version tabs: only when older variants exist
    .version-tabs(v-if='versionTabs.length > 1' role='tablist')
      button.version-tab(
        :aria-selected='activeVersion === tab.key'
        :class='{ active: activeVersion === tab.key }'
        :key='tab.key'
        @click='activeVersion = tab.key'
        role='tab'
        v-for='tab in versionTabs'
      )
        span.tab-label {{ tab.label }}
        span.tab-tag(v-if='tab.tag') {{ tab.tag }}

    section.hero-card
      .hero-preview
        .preview-box
          LottieViewer(
            :animation-link='heroLottie.path'
            :auto-play='true'
            :height='180'
            :width='180'
            renderer='canvas'
            v-if='!heroImage && heroLottie'
          )
          img(:alt='data.describe || "QQ Emoji"', :src='heroImage || "assets/default.png"' v-else)
        .preview-actions
          button.btn(:disabled='!heroStillImage' @click='downloadImage')
            Download(:size='15')
            span 下载
          button.btn(
            :aria-busy='isConvertingGif ? "true" : "false"'
            :disabled='!canConvertApngToGif || isConvertingGif'
            @click='convertApngToGif'
          )
            LoaderCircle.spin(:size='15' v-if='isConvertingGif')
            Download(:size='15' v-else)
            span {{ isConvertingGif ? '转换中' : '转 GIF' }}
          button.btn(:disabled='!heroStillImage' @click='copyImage')
            Copy(:size='15')
            span 复制图片

      .hero-info
        .title-row
          h1.emoji-title {{ data.describe?.replace(/^\//, '') || '未命名表情' }}
          button.id-chip(@click='copyText(data.emojiId)' title='复制 ID') {{ '#' + data.emojiId }}
        .badges(v-if='badges.length')
          span.badge(:class='badge.tone' :key='badge.text' v-for='badge in badges') {{ badge.text }}
        .seen-line(v-if='activeSeen.firstSeenIn || activeSeen.lastSeenIn')
          span(v-if='activeSeen.firstSeenIn') 收录于 {{ activeSeen.firstSeenIn }}
          span.dot(v-if='activeSeen.firstSeenIn && activeSeen.lastSeenIn') ·
          span(v-if='activeSeen.lastSeenIn') 最后见于 {{ activeSeen.lastSeenIn }}
        .words(v-if='data.associateWords?.length')
          .words-label 关联词汇
          .words-list
            button.word(
              :key='word'
              @click='searchWithWord(word)'
              v-for='word in data.associateWords'
            ) {{ word }}
        .meta
          .meta-hint 元数据 · 点击值即可复制
          .meta-grid
            .meta-group(:key='group.title' v-for='group in metaGroups')
              h3.meta-group-title {{ group.title }}
              dl.meta-rows
                .meta-row(:key='row.key' v-for='row in group.rows')
                  dt.meta-key {{ row.key }}
                  dd.meta-value
                    button.meta-copy(
                      :title='`复制 ${row.key}`'
                      @click='copyText(row.value)'
                      v-if='row.value !== ""'
                    ) {{ row.value }}
                    span.meta-empty(v-else) —

    section.section-card(v-if='activeAssets.length')
      .section-header
        h2.section-title 资源文件
        .section-count {{ activeAssets.length }}
      .asset-grid
        .asset-tile(:key='asset.path' v-for='asset in activeAssets')
          .asset-thumb
            LottieViewer(
              :animation-link='asset.path'
              :auto-play='true'
              :height='88'
              :width='88'
              renderer='canvas'
              v-if='asset.type === QqSysEmojiAssetType.LOTTIE_JSON'
            )
            img(:alt='asset.name', :src='asset.path' loading='lazy' v-else)
          .asset-meta
            .asset-name(:title='asset.name') {{ asset.name }}
            .asset-type {{ ASSET_TYPE_LABEL[asset.type] }}
          .asset-actions
            button.icon-btn(@click='downloadAsset(asset)' title='下载')
              Download(:size='14')
            a.icon-btn(:href='asset.path' target='_blank' title='新窗口打开')
              ExternalLink(:size='14')
            button.icon-btn(@click='copyText(asset.path)' title='复制路径')
              Copy(:size='14')

    details.raw-json
      summary
        span 原始 JSON
        button.btn.btn-small(@click.prevent='copyText(rawJson)')
          Copy(:size='13')
          span 复制
      pre {{ rawJson }}

  Transition(name='toast')
    .toast(v-if='toastText')
      Check(:size='14')
      span {{ toastText }}
</template>

<script setup lang="ts">
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  LoaderCircle,
} from 'lucide-vue-next'
import { type QqSysEmojiAsset, QqSysEmojiAssetType } from '@/types/QqSysEmoji'

const LottieViewer = defineAsyncComponent(() =>
  import('vue3-lottie').then((m) => m.Vue3Lottie)
)

const ASSET_TYPE_LABEL: Record<QqSysEmojiAssetType, string> = {
  [QqSysEmojiAssetType.THUMB_PNG]: 'PNG',
  [QqSysEmojiAssetType.THUMB_GIF]: 'GIF',
  [QqSysEmojiAssetType.APNG]: 'APNG',
  [QqSysEmojiAssetType.LOTTIE_JSON]: 'Lottie',
}

const qStore = useQqEmojiStore()
const route = useRoute()
const router = useRouter()

const emojiId = ref(route.params.id as string)

const data = computed(() => {
  return qStore.allEmojiList.find((item) => item.emojiId === emojiId.value)
})

// 版本标签：CURRENT 为当前资源，其余为 history 中的 lastSeenIn
const CURRENT = '__current__'
const activeVersion = ref(CURRENT)

const versionTabs = computed(() => {
  if (!data.value) {
    return []
  }
  return [
    {
      key: CURRENT,
      label: data.value.lastSeenIn || '当前',
      tag: data.value.removed ? '最后版本' : '最新',
    },
    ...(data.value.history || []).map((entry) => ({
      key: entry.lastSeenIn,
      label: entry.lastSeenIn,
      tag: '',
    })),
  ]
})

const activeAssets = computed<QqSysEmojiAsset[]>(() => {
  if (!data.value) {
    return []
  }
  if (activeVersion.value === CURRENT) {
    return data.value.assets
  }
  return (
    data.value.history?.find((entry) => entry.lastSeenIn === activeVersion.value)
      ?.assets || []
  )
})

// 选中版本自身的收录区间；元数据表仍展示表情整体的字段
// 表情整体的 firstSeenIn 只属于最老的一版，其余各版何时出现没有记录
const activeSeen = computed<{ firstSeenIn?: string; lastSeenIn?: string }>(() => {
  const d = data.value
  const history = d?.history || []
  if (!d) {
    return {}
  }
  if (activeVersion.value === CURRENT) {
    return {
      firstSeenIn: history.length ? undefined : d.firstSeenIn,
      lastSeenIn: d.lastSeenIn,
    }
  }
  const index = history.findIndex(
    (entry) => entry.lastSeenIn === activeVersion.value
  )
  return {
    firstSeenIn: index === history.length - 1 ? d.firstSeenIn : undefined,
    lastSeenIn: history[index]?.lastSeenIn,
  }
})

const findAsset = (type: QqSysEmojiAssetType) =>
  activeAssets.value.find((asset) => asset.type === type)

const heroImage = computed(
  () =>
    (
      findAsset(QqSysEmojiAssetType.APNG) ||
      findAsset(QqSysEmojiAssetType.THUMB_GIF) ||
      (findAsset(QqSysEmojiAssetType.LOTTIE_JSON)
        ? undefined
        : findAsset(QqSysEmojiAssetType.THUMB_PNG))
    )?.path
)

const heroLottie = computed(() =>
  findAsset(QqSysEmojiAssetType.LOTTIE_JSON)
)

// 下载 / 复制使用的静态图：有 Lottie 预览时退回 PNG
const heroStillImage = computed(
  () =>
    heroImage.value ||
    findAsset(QqSysEmojiAssetType.THUMB_PNG)?.path ||
    ''
)

const apngAsset = computed(() => findAsset(QqSysEmojiAssetType.APNG) || null)

const canConvertApngToGif = computed(
  () => !!apngAsset.value && !findAsset(QqSysEmojiAssetType.THUMB_GIF)
)

const fileBaseName = computed(() => {
  const id = data.value?.emojiId || 'emoji'
  return activeVersion.value === CURRENT ? id : `${id}_${activeVersion.value}`
})

const badges = computed(() => {
  const d = data.value
  if (!d) {
    return []
  }
  return [
    d.removed && { text: '已下架', tone: 'warn' },
    d.isHide && { text: '面板隐藏', tone: 'muted' },
    d.emojiType === 1 && { text: '超级表情', tone: 'brand' },
  ].filter(Boolean) as { text: string; tone: string }[]
})

const metaGroups = computed(() => {
  const d = data.value
  if (!d) {
    return []
  }
  const str = (value: unknown) =>
    value === undefined || value === null ? '' : String(value)
  return [
    {
      title: '标识',
      rows: [
        { key: 'emojiId', value: str(d.emojiId) },
        { key: 'describe', value: str(d.describe) },
        { key: 'qzoneCode', value: str(d.qzoneCode) },
        { key: 'qcid', value: str(d.qcid) },
      ],
    },
    {
      title: '动画贴纸',
      rows: [
        { key: 'emojiType', value: str(d.emojiType) },
        { key: 'aniStickerPackId', value: str(d.aniStickerPackId) },
        { key: 'aniStickerId', value: str(d.aniStickerId) },
        {
          key: 'animationSize',
          value: d.animationWidth
            ? `${d.animationWidth} × ${d.animationHeigh}`
            : '',
        },
      ],
    },
    {
      title: '显示',
      rows: [
        { key: 'isHide', value: str(d.isHide) },
        { key: 'startTime', value: str(d.startTime) },
        { key: 'endTime', value: str(d.endTime) },
      ],
    },
    {
      title: '收录',
      rows: [
        { key: 'firstSeenIn', value: str(d.firstSeenIn) },
        { key: 'lastSeenIn', value: str(d.lastSeenIn) },
        { key: 'removed', value: str(!!d.removed) },
      ],
    },
  ]
})

const rawJson = computed(() => JSON.stringify(data.value, null, 2))

// 复制提示
const toastText = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined
function showToast(text: string) {
  toastText.value = text
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toastText.value = ''), 1600)
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    showToast('已复制')
  } catch (err) {
    console.error('复制失败:', err)
    showToast('复制失败')
  }
}

let converterModulesPromise: Promise<{
  parseAPNG: (buffer: ArrayBuffer) => any
  GIFEncoder: () => {
    writeFrame: (
      index: Uint8Array,
      width: number,
      height: number,
      opts?: {
        palette?: number[][]
        first?: boolean
        transparent?: boolean
        transparentIndex?: number
        delay?: number
        repeat?: number
        dispose?: number
      }
    ) => void
    finish: () => void
    bytes: () => Uint8Array
  }
  quantize: (
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: {
      format?: 'rgb565' | 'rgb444' | 'rgba4444'
      oneBitAlpha?: boolean | number
      clearAlpha?: boolean
      clearAlphaThreshold?: number
      clearAlphaColor?: number
    }
  ) => number[][]
  applyPalette: (
    rgba: Uint8Array | Uint8ClampedArray,
    palette: number[][],
    format?: 'rgb565' | 'rgb444' | 'rgba4444'
  ) => Uint8Array
}> | null = null

async function loadConverterModules() {
  if (!converterModulesPromise) {
    converterModulesPromise = Promise.all([
      import('apng-js'),
      import('gifenc'),
    ]).then(([apngModule, gifModule]) => {
      const parseAPNG = (apngModule as any).default || apngModule
      const GIFEncoder =
        (gifModule as any).GIFEncoder ||
        (gifModule as any).default?.GIFEncoder ||
        (gifModule as any).default
      const quantize =
        (gifModule as any).quantize || (gifModule as any).default?.quantize
      const applyPalette =
        (gifModule as any).applyPalette ||
        (gifModule as any).default?.applyPalette

      if (!parseAPNG || !GIFEncoder || !quantize || !applyPalette) {
        throw new Error('加载 APNG/GIF 转换模块失败')
      }

      return {
        parseAPNG,
        GIFEncoder,
        quantize,
        applyPalette,
      }
    })
  }

  return converterModulesPromise
}

function triggerDownload(href: string, fileName: string) {
  const link = document.createElement('a')
  link.href = href
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function downloadImage() {
  if (heroStillImage.value) {
    triggerDownload(heroStillImage.value, `${fileBaseName.value}.png`)
  }
}

function downloadAsset(asset: QqSysEmojiAsset) {
  triggerDownload(asset.path, asset.name)
}

async function copyImage() {
  try {
    const response = await fetch(heroStillImage.value)
    const blob = await response.blob()
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob,
      }),
    ])
    showToast('图片已复制')
  } catch (err) {
    console.error('复制失败:', err)
    showToast('复制失败')
  }
}

function searchWithWord(word: string) {
  router.push({
    path: '/qqnt',
    query: { search: word },
  })
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  triggerDownload(url, fileName)
  URL.revokeObjectURL(url)
}

const isConvertingGif = ref(false)

async function convertApngToGif() {
  if (!canConvertApngToGif.value || !apngAsset.value || isConvertingGif.value) {
    return
  }

  isConvertingGif.value = true
  try {
    const { parseAPNG, GIFEncoder, quantize, applyPalette } =
      await loadConverterModules()
    const response = await fetch(apngAsset.value.path)
    const apngBuffer = await response.arrayBuffer()
    const apng = parseAPNG(apngBuffer)

    if (apng instanceof Error) {
      throw apng
    }

    const canvas = document.createElement('canvas')
    canvas.width = apng.width
    canvas.height = apng.height
    const context = canvas.getContext('2d', { willReadFrequently: true })

    if (!context) {
      throw new Error('无法初始化 Canvas 上下文')
    }

    const player = await apng.getPlayer(context, false)
    const gif = GIFEncoder()
    for (let index = 0; index < apng.frames.length; index++) {
      if (index > 0) {
        player.renderNextFrame()
      }

      const frame = apng.frames[index]
      const imageData = context.getImageData(0, 0, apng.width, apng.height)
      const rgba = new Uint8Array(imageData.data)
      const palette = quantize(rgba, 256, {
        format: 'rgba4444',
        oneBitAlpha: true,
      })
      const indexedFrame = applyPalette(rgba, palette, 'rgba4444')
      const delay = Math.max(20, Math.round(frame?.delay || 100))
      const options: {
        palette: number[][]
        delay: number
        transparent: boolean
        transparentIndex: number
        repeat?: number
      } = {
        palette,
        delay,
        transparent: true,
        transparentIndex: 0,
      }
      if (index === 0) {
        options.repeat = 0
      }

      gif.writeFrame(indexedFrame, apng.width, apng.height, options)
    }

    gif.finish()
    const gifBytes = gif.bytes()
    downloadBlob(
      new Blob([gifBytes], { type: 'image/gif' }),
      `${fileBaseName.value}.gif`
    )
  } catch (err) {
    console.error('APNG 转 GIF 失败:', err)
    window.alert('APNG 转 GIF 失败，请稍后重试')
  } finally {
    isConvertingGif.value = false
  }
}

onBeforeRouteUpdate((to) => {
  if (to.name === route.name) {
    emojiId.value = to.params.id as string
    activeVersion.value = CURRENT
  }
})

onMounted(() => {
  qStore.fetchData()
})
</script>

<style scoped lang="sass">
$mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace

#emoji-details
  min-height: 100vh
  padding-bottom: 60px

.breadcrumb-nav
  background: var(--background-card)
  border-bottom: 1px solid var(--border-color)
  padding: 12px 0

.breadcrumb-content
  max-width: 1200px
  margin: 0 auto
  padding: 0 24px
  display: flex
  align-items: center
  gap: 8px

.breadcrumb-link
  display: flex
  align-items: center
  gap: 6px
  color: var(--text-secondary)
  text-decoration: none
  font-weight: 500
  padding: 6px 10px
  border-radius: 8px
  transition: all 0.2s ease

  &:hover
    color: var(--text-primary)
    background: var(--background-hover)

.breadcrumb-separator
  color: var(--text-muted)

.breadcrumb-current
  color: var(--text-primary)
  font-weight: 600

.loading-state
  display: flex
  flex-direction: column
  align-items: center
  justify-content: center
  gap: 16px
  min-height: 60vh

.spinner
  width: 40px
  height: 40px
  border: 3px solid var(--border-color)
  border-top-color: var(--color-primary-text)
  border-radius: 50%
  animation: spin 1s linear infinite

.spin
  animation: spin 1s linear infinite

@keyframes spin
  to
    transform: rotate(360deg)

.loading-text
  color: var(--text-secondary)
  margin: 0

.detail-content
  max-width: 1200px
  margin: 0 auto
  padding: 32px 24px
  display: flex
  flex-direction: column
  gap: 24px

// Version tabs
.version-tabs
  display: flex
  flex-wrap: wrap
  gap: 8px

.version-tab
  display: inline-flex
  align-items: center
  gap: 8px
  padding: 7px 14px
  border-radius: 999px
  border: 1px solid var(--border-color)
  background: var(--background-card)
  color: var(--text-secondary)
  font-family: $mono
  font-size: 13px
  cursor: pointer
  transition: all 0.2s ease

  &:hover
    color: var(--text-primary)
    border-color: var(--color-primary-text)

  &.active
    background: var(--color-primary)
    border-color: var(--color-primary)
    color: #fff

  .tab-tag
    font-family: inherit
    font-size: 11px
    padding: 1px 6px
    border-radius: 999px
    background: rgba(255, 255, 255, 0.16)

// Shared buttons
.btn
  display: inline-flex
  align-items: center
  justify-content: center
  gap: 6px
  padding: 9px 8px
  border-radius: 10px
  white-space: nowrap
  border: 1px solid var(--border-color)
  background: var(--background-hover)
  color: var(--text-primary)
  font-size: 13px
  font-weight: 500
  cursor: pointer
  transition: all 0.2s ease

  &:hover:not(:disabled)
    border-color: var(--color-primary-text)
    background: var(--color-primary-soft)

  &:disabled
    opacity: 0.45
    cursor: not-allowed

.btn-small
  padding: 4px 10px
  font-size: 12px
  border-radius: 8px

// Hero
.hero-card
  display: grid
  grid-template-columns: 300px minmax(0, 1fr)
  gap: 32px
  padding: 28px
  background: var(--background-card)
  border: 1px solid var(--border-color)
  border-radius: 16px

.hero-preview
  position: sticky
  top: calc(var(--header-height) + 24px)
  align-self: start

.preview-box
  aspect-ratio: 1
  display: grid
  place-items: center
  border-radius: 14px
  background: var(--background-hover)
  border: 1px solid var(--border-color)
  overflow: hidden

  img
    width: 64%
    height: 64%
    object-fit: contain

.preview-actions
  display: grid
  grid-template-columns: repeat(3, 1fr)
  gap: 8px
  margin-top: 12px

.hero-info
  display: flex
  flex-direction: column
  gap: 16px
  min-width: 0

.title-row
  display: flex
  align-items: center
  flex-wrap: wrap
  gap: 12px

.emoji-title
  margin: 0
  font-size: 32px
  font-weight: 700
  line-height: 1.2

.id-chip
  font-family: $mono
  font-size: 14px
  padding: 3px 10px
  border-radius: 8px
  border: 1px solid var(--border-color)
  background: var(--background-hover)
  color: var(--color-primary-text)
  cursor: pointer

  &:hover
    background: var(--color-primary-soft)

.badges
  display: flex
  flex-wrap: wrap
  gap: 8px

.badge
  font-size: 12px
  font-weight: 600
  padding: 3px 10px
  border-radius: 999px

  &.brand
    color: var(--color-primary-text)
    background: var(--color-primary-soft)

  &.muted
    color: var(--text-secondary)
    background: var(--background-hover)

  &.warn
    color: #f5b971
    background: rgba(245, 185, 113, 0.12)

.seen-line
  display: flex
  flex-wrap: wrap
  gap: 8px
  font-family: $mono
  font-size: 13px
  color: var(--text-secondary)

  .dot
    color: var(--text-muted)

.words
  display: flex
  flex-direction: column
  gap: 8px

.words-label
  font-size: 12px
  color: var(--text-muted)

.words-list
  display: flex
  flex-wrap: wrap
  gap: 6px

.word
  font-size: 13px
  padding: 4px 10px
  border-radius: 8px
  border: 1px solid var(--border-color)
  background: transparent
  color: var(--text-secondary)
  cursor: pointer
  transition: all 0.2s ease

  &:hover
    color: var(--color-primary-text)
    border-color: var(--color-primary-text)

// Sections
.section-card
  padding: 24px
  background: var(--background-card)
  border: 1px solid var(--border-color)
  border-radius: 16px

.section-header
  display: flex
  align-items: baseline
  gap: 10px
  margin-bottom: 16px

.section-title
  margin: 0
  font-size: 18px
  font-weight: 600

.section-count
  font-family: $mono
  font-size: 13px
  color: var(--text-muted)

.meta
  display: flex
  flex-direction: column
  gap: 8px
  margin-top: 4px

.meta-hint
  font-size: 12px
  color: var(--text-muted)

// Assets
.asset-grid
  display: grid
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr))
  gap: 12px

.asset-tile
  display: flex
  flex-direction: column
  border: 1px solid var(--border-color)
  border-radius: 12px
  background: var(--background-hover)
  overflow: hidden

.asset-thumb
  aspect-ratio: 4 / 3
  display: grid
  place-items: center
  background: rgba(0, 0, 0, 0.2)

  img
    width: 88px
    height: 88px
    object-fit: contain

.asset-meta
  display: flex
  align-items: center
  justify-content: space-between
  gap: 8px
  padding: 10px 12px 4px

.asset-name
  font-family: $mono
  font-size: 12px
  overflow: hidden
  text-overflow: ellipsis
  white-space: nowrap

.asset-type
  flex-shrink: 0
  font-size: 11px
  font-weight: 600
  padding: 1px 6px
  border-radius: 6px
  color: var(--color-primary-text)
  background: var(--color-primary-soft)

.asset-actions
  display: flex
  gap: 4px
  padding: 6px 8px 8px

.icon-btn
  flex: 1
  display: grid
  place-items: center
  height: 28px
  border-radius: 8px
  border: none
  background: transparent
  color: var(--text-secondary)
  cursor: pointer
  transition: all 0.2s ease

  &:hover
    color: var(--text-primary)
    background: var(--color-primary-soft)

// Metadata
.meta-grid
  display: grid
  grid-template-columns: repeat(2, minmax(0, 1fr))
  gap: 12px

.meta-group
  border: 1px solid var(--border-color)
  border-radius: 12px
  padding: 14px 16px

.meta-group-title
  margin: 0 0 8px
  font-size: 13px
  font-weight: 600
  color: var(--text-secondary)

.meta-rows
  margin: 0

.meta-row
  display: grid
  grid-template-columns: 140px minmax(0, 1fr)
  align-items: center
  gap: 8px
  min-height: 30px

.meta-key
  font-family: $mono
  font-size: 12px
  color: var(--text-muted)

.meta-value
  margin: 0
  min-width: 0

.meta-copy
  max-width: 100%
  font-family: $mono
  font-size: 13px
  text-align: left
  padding: 2px 6px
  margin-left: -6px
  border: none
  border-radius: 6px
  background: transparent
  color: var(--text-primary)
  cursor: copy
  overflow: hidden
  text-overflow: ellipsis
  white-space: nowrap

  &:hover
    background: var(--color-primary-soft)

.meta-empty
  color: var(--text-muted)

.raw-json
  background: var(--background-card)
  border: 1px solid var(--border-color)
  border-radius: 16px

  summary
    display: flex
    align-items: center
    justify-content: space-between
    padding: 14px 20px
    font-size: 14px
    color: var(--text-secondary)
    cursor: pointer
    list-style: none

    &::-webkit-details-marker
      display: none

    &::before
      content: '▸'
      margin-right: 8px
      transition: transform 0.2s ease

    span
      margin-right: auto

  &[open] summary::before
    transform: rotate(90deg)

  pre
    margin: 0
    padding: 16px
    max-height: 480px
    overflow: auto
    border-top: 1px solid var(--border-color)
    font-family: $mono
    font-size: 12px
    color: var(--text-secondary)

// Toast
.toast
  position: fixed
  left: 50%
  bottom: 32px
  z-index: 100
  transform: translateX(-50%)
  display: flex
  align-items: center
  gap: 6px
  padding: 8px 16px
  border-radius: 999px
  background: var(--color-primary)
  color: #fff
  font-size: 13px
  box-shadow: var(--shadow-lg)

.toast-enter-active,
.toast-leave-active
  transition: all 0.2s ease

.toast-enter-from,
.toast-leave-to
  opacity: 0
  transform: translate(-50%, 8px)

@media (max-width: 1024px)
  .meta-grid
    grid-template-columns: 1fr

@media (max-width: 768px)
  .detail-content
    padding: 20px 16px

  .hero-card
    grid-template-columns: 1fr
    padding: 20px
    gap: 20px

  .hero-preview
    position: static
    max-width: 320px
    width: 100%
    margin: 0 auto

  .emoji-title
    font-size: 26px

  .section-card
    padding: 16px

  .asset-grid
    grid-template-columns: repeat(2, minmax(0, 1fr))
    gap: 8px

  .meta-grid
    grid-template-columns: 1fr

  .meta-row
    grid-template-columns: 120px minmax(0, 1fr)
</style>
