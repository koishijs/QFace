<template lang="pug">
#emoji-details
  .breadcrumb-nav
    .breadcrumb-content
      RouterLink.breadcrumb-link(to='/qqnt')
        svg(
          fill='none'
          height='16'
          viewBox='0 0 24 24'
          width='16'
          xmlns='http://www.w3.org/2000/svg'
        )
          path(
            d='M19 12H5M12 19l-7-7 7-7'
            stroke='currentColor'
            stroke-linecap='round'
            stroke-linejoin='round'
            stroke-width='2'
          )
        span 返回列表
      .breadcrumb-separator
        svg(
          fill='none'
          height='12'
          viewBox='0 0 24 24'
          width='12'
          xmlns='http://www.w3.org/2000/svg'
        )
          path(
            d='M9 18l6-6-6-6'
            stroke='currentColor'
            stroke-linecap='round'
            stroke-linejoin='round'
            stroke-width='2'
          )
      .breadcrumb-current {{ data?.describe?.replace(/^\//, '') || data?.emojiId || 'Loading...' }}

  .loading-state(v-if='!data')
    .loading-content
      .loading-spinner
        .spinner
      h2.loading-title 正在加载表情详情...
      p.loading-text 请稍候，我们正在获取表情数据

  .emoji-detail-content(v-else)
    .emoji-header
      .emoji-preview
        .preview-container
          img(:alt='data.describe || "QQ Emoji"', :src='previewImage')
        .preview-actions
          button.action-btn(@click='downloadImage' v-if='previewImage')
            svg(
              fill='none'
              height='16'
              viewBox='0 0 24 24'
              width='16'
              xmlns='http://www.w3.org/2000/svg'
            )
              path(
                d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3'
                stroke='currentColor'
                stroke-linecap='round'
                stroke-linejoin='round'
                stroke-width='2'
              )
            span 下载
          button.action-btn(@click='copyImage' v-if='previewImage')
            svg(
              fill='none'
              height='16'
              viewBox='0 0 24 24'
              width='16'
              xmlns='http://www.w3.org/2000/svg'
            )
              path(
                d='M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M8 2h8v4H8V2z'
                stroke='currentColor'
                stroke-linecap='round'
                stroke-linejoin='round'
                stroke-width='2'
              )
            span 复制
      .emoji-info
        h1.emoji-title {{ data.describe?.replace(/^\//, '') || '[MISSING_DESCRIBE]' }}
        .emoji-meta
          .meta-item
            .meta-label Emoji ID
            .meta-value {{ data.emojiId }}
          .meta-item
            .meta-label 描述
            .meta-value {{ data.describe || '无描述' }}
          .meta-item
            .meta-label 类型
            .meta-value {{ data.emojiType }}
          .meta-item
            .meta-label 是否隐藏
            .meta-value
              .status-badge(:class='data.isHide ? "hidden" : "visible"') {{ data.isHide ? '隐藏' : '显示' }}
          .meta-item(v-if='data.animationWidth')
            .meta-label 动画尺寸
            .meta-value {{ data.animationWidth }} × {{ data.animationHeigh }}

    .emoji-sections
      .section-card(v-if='data.associateWords?.length')
        .section-header
          h2.section-title 关联词汇
          .section-count {{ data.associateWords.length }} 个
        .tags-container
          .tag(
            :key='word'
            @click='searchWithWord(word)'
            v-for='word in data.associateWords'
          ) {{ word }}

      .section-card(v-if='imgAssets.length')
        .section-header
          h2.section-title 图片资源
          .section-count {{ imgAssets.length }} 个
        .assets-grid
          .asset-item(
            :key='index'
            @click='previewAsset(asset)'
            v-for='(asset, index) in imgAssets'
          )
            .asset-preview
              img(:alt='asset.name', :src='asset.path')
            .asset-info
              .asset-name {{ asset.name }}
              .asset-type {{ QqSysEmojiAssetType[asset.type] }}
              .asset-actions
                button.asset-btn(@click.stop='downloadAsset(asset)')
                  svg(
                    fill='none'
                    height='14'
                    viewBox='0 0 24 24'
                    width='14'
                    xmlns='http://www.w3.org/2000/svg'
                  )
                    path(
                      d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3'
                      stroke='currentColor'
                      stroke-linecap='round'
                      stroke-linejoin='round'
                      stroke-width='2'
                    )
                a.asset-btn(:href='asset.path' @click.stop target='_blank')
                  svg(
                    fill='none'
                    height='14'
                    viewBox='0 0 24 24'
                    width='14'
                    xmlns='http://www.w3.org/2000/svg'
                  )
                    path(
                      d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3'
                      stroke='currentColor'
                      stroke-linecap='round'
                      stroke-linejoin='round'
                      stroke-width='2'
                    )

      .section-card(v-if='lottieFiles.length')
        .section-header
          h2.section-title 动画文件
          .section-count {{ lottieFiles.length }} 个
        .lottie-container
          .lottie-item(:key='index' v-for='(file, index) in lottieFiles')
            .lottie-preview
              LottieViewer(
                :animation-link='file.path',
                :auto-play='true',
                :height='data.animationHeigh || 200',
                :width='data.animationWidth || 200'
                renderer='canvas'
              )
            .lottie-info
              .lottie-name {{ file.name }}
              .lottie-actions
                button.lottie-btn(@click='downloadLottie(file)')
                  svg(
                    fill='none'
                    height='14'
                    viewBox='0 0 24 24'
                    width='14'
                    xmlns='http://www.w3.org/2000/svg'
                  )
                    path(
                      d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3'
                      stroke='currentColor'
                      stroke-linecap='round'
                      stroke-linejoin='round'
                      stroke-width='2'
                    )
                a.lottie-btn(:href='file.path' target='_blank')
                  svg(
                    fill='none'
                    height='14'
                    viewBox='0 0 24 24'
                    width='14'
                    xmlns='http://www.w3.org/2000/svg'
                  )
                    path(
                      d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3'
                      stroke='currentColor'
                      stroke-linecap='round'
                      stroke-linejoin='round'
                      stroke-width='2'
                    )

    .debug-section
      .section-card
        .section-header
          h2.section-title 调试信息
        .debug-content
          pre {{ JSON.stringify(data, null, 2) }}
</template>

<script setup lang="ts">
import { QqSysEmojiAssetType } from '@/types/QqSysEmoji'

const LottieViewer = defineAsyncComponent(() =>
  import('vue3-lottie').then((m) => m.Vue3Lottie)
)

const qStore = useQqEmojiStore()
const route = useRoute()
const router = useRouter()

const emojiId = ref(route.params.id as string)

const data = computed(() => {
  return qStore.allEmojiList.find((item) => item.emojiId === emojiId.value)
})

const imgAssets = computed(() => {
  return (
    data.value?.assets.filter(
      (item) => item.type !== QqSysEmojiAssetType.LOTTIE_JSON
    ) || []
  )
})

const lottieFiles = computed(() => {
  return (
    data.value?.assets.filter(
      (item) => item.type === QqSysEmojiAssetType.LOTTIE_JSON
    ) || []
  )
})

const previewImage = computed(() => {
  const posibleThumb = [
    QqSysEmojiAssetType.APNG,
    QqSysEmojiAssetType.THUMB_GIF,
    QqSysEmojiAssetType.THUMB_PNG,
  ]
  return (
    posibleThumb
      .map((type) => data.value?.assets.find((asset) => asset.type === type))
      .filter(Boolean)[0]?.path || 'assets/default.png'
  )
})

// 功能函数
function downloadImage() {
  const link = document.createElement('a')
  link.href = previewImage.value
  link.download = `${data.value?.emojiId || 'emoji'}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

async function copyImage() {
  try {
    const response = await fetch(previewImage.value)
    const blob = await response.blob()
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob,
      }),
    ])
    // 可以添加成功提示
  } catch (err) {
    console.error('复制失败:', err)
  }
}

function searchWithWord(word: string) {
  router.push({
    path: '/qqnt',
    query: { search: word },
  })
}

function previewAsset(asset: any) {
  // 可以打开模态框预览
  window.open(asset.path, '_blank')
}

function downloadAsset(asset: any) {
  const link = document.createElement('a')
  link.href = asset.path
  link.download = asset.name
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function downloadLottie(file: any) {
  const link = document.createElement('a')
  link.href = file.path
  link.download = file.name
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

onBeforeRouteUpdate((to) => {
  if (to.name === route.name) {
    emojiId.value = to.params.id as string
  }
})

onMounted(() => {
  qStore.fetchData()
})
</script>

<style scoped lang="sass">
#emoji-details
  min-height: 100vh
  background: var(--background-dark)
  padding-bottom: 60px

.breadcrumb-nav
  background: var(--background-card)
  border-bottom: 1px solid var(--border-color)
  padding: 16px 0

.breadcrumb-content
  max-width: 1400px
  margin: 0 auto
  padding: 0 24px
  display: flex
  align-items: center
  gap: 12px

.breadcrumb-link
  display: flex
  align-items: center
  gap: 8px
  color: var(--text-secondary)
  text-decoration: none
  font-weight: 500
  padding: 8px 12px
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
  align-items: center
  justify-content: center
  min-height: 60vh
  padding: 60px 20px

.loading-content
  text-align: center
  max-width: 400px

.loading-spinner
  margin-bottom: 24px

.spinner
  width: 48px
  height: 48px
  border: 3px solid var(--border-color)
  border-top: 3px solid #667eea
  border-radius: 50%
  animation: spin 1s linear infinite
  margin: 0 auto

@keyframes spin
  0%
    transform: rotate(0deg)
  100%
    transform: rotate(360deg)

.loading-title
  font-size: 24px
  font-weight: 600
  color: var(--text-primary)
  margin: 0 0 12px 0

.loading-text
  font-size: 16px
  color: var(--text-secondary)
  margin: 0
  line-height: 1.6

.emoji-detail-content
  max-width: 1400px
  margin: 0 auto
  padding: 40px 24px

.emoji-header
  display: grid
  grid-template-columns: 300px 1fr
  gap: 40px
  margin-bottom: 60px
  background: var(--background-card)
  border-radius: 20px
  padding: 40px
  border: 1px solid var(--border-color)

.emoji-preview
  display: flex
  flex-direction: column
  gap: 20px

.preview-container
  width: 200px
  height: 200px
  border-radius: 16px
  overflow: hidden
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)
  display: flex
  align-items: center
  justify-content: center
  border: 1px solid var(--border-color)

  img
    max-width: 100%
    max-height: 100%
    object-fit: contain

.preview-actions
  display: flex
  gap: 12px

.action-btn
  flex: 1
  display: flex
  align-items: center
  justify-content: center
  gap: 8px
  padding: 12px 16px
  background: var(--background-hover)
  border: 1px solid var(--border-color)
  border-radius: 12px
  color: var(--text-primary)
  font-weight: 500
  cursor: pointer
  transition: all 0.2s ease

  &:hover
    background: var(--primary-gradient)
    color: white
    transform: translateY(-2px)

.emoji-info
  display: flex
  flex-direction: column
  gap: 24px

.emoji-title
  font-size: 32px
  font-weight: 800
  color: var(--text-primary)
  margin: 0
  line-height: 1.2

.emoji-meta
  display: grid
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))
  gap: 16px

.meta-item
  display: flex
  flex-direction: column
  gap: 4px

.meta-label
  font-size: 12px
  color: var(--text-muted)
  text-transform: uppercase
  letter-spacing: 1px
  font-weight: 600

.meta-value
  font-size: 14px
  color: var(--text-primary)
  font-weight: 500

.status-badge
  display: inline-block
  padding: 4px 12px
  border-radius: 20px
  font-size: 12px
  font-weight: 600
  text-transform: uppercase
  letter-spacing: 0.5px

  &.visible
    background: rgba(76, 175, 80, 0.2)
    color: #4caf50

  &.hidden
    background: rgba(244, 67, 54, 0.2)
    color: #f44336

.emoji-sections
  display: flex
  flex-direction: column
  gap: 32px

.section-card
  background: var(--background-card)
  border: 1px solid var(--border-color)
  border-radius: 20px
  padding: 32px
  transition: all 0.3s ease

  &:hover
    box-shadow: var(--shadow-md)

.section-header
  display: flex
  justify-content: space-between
  align-items: center
  margin-bottom: 24px

.section-title
  font-size: 24px
  font-weight: 700
  color: var(--text-primary)
  margin: 0

.section-count
  background: var(--primary-gradient)
  color: white
  padding: 6px 12px
  border-radius: 20px
  font-size: 12px
  font-weight: 600
  text-transform: uppercase
  letter-spacing: 1px

.tags-container
  display: flex
  flex-wrap: wrap
  gap: 12px

.tag
  background: var(--background-hover)
  color: var(--text-primary)
  padding: 8px 16px
  border-radius: 20px
  font-size: 14px
  font-weight: 500
  cursor: pointer
  transition: all 0.2s ease
  border: 1px solid var(--border-color)

  &:hover
    background: var(--primary-gradient)
    color: white
    transform: translateY(-2px)

.assets-grid
  display: grid
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))
  gap: 20px

.asset-item
  background: var(--background-hover)
  border: 1px solid var(--border-color)
  border-radius: 16px
  overflow: hidden
  cursor: pointer
  transition: all 0.3s ease

  &:hover
    transform: translateY(-4px)
    box-shadow: var(--shadow-md)

.asset-preview
  height: 120px
  display: flex
  align-items: center
  justify-content: center
  background: rgba(255, 255, 255, 0.05)

  img
    max-width: 100%
    max-height: 100%
    object-fit: contain

.asset-info
  padding: 16px

.asset-name
  font-size: 14px
  font-weight: 600
  color: var(--text-primary)
  margin-bottom: 4px
  overflow: hidden
  text-overflow: ellipsis
  white-space: nowrap

.asset-type
  font-size: 12px
  color: var(--text-secondary)
  margin-bottom: 12px

.asset-actions
  display: flex
  gap: 8px

.asset-btn
  flex: 1
  display: flex
  align-items: center
  justify-content: center
  padding: 8px
  background: var(--background-card)
  border: 1px solid var(--border-color)
  border-radius: 8px
  color: var(--text-secondary)
  cursor: pointer
  transition: all 0.2s ease
  text-decoration: none

  &:hover
    background: var(--primary-gradient)
    color: white

.lottie-container
  display: grid
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr))
  gap: 24px

.lottie-item
  background: var(--background-hover)
  border: 1px solid var(--border-color)
  border-radius: 16px
  overflow: hidden
  transition: all 0.3s ease

  &:hover
    transform: translateY(-4px)
    box-shadow: var(--shadow-md)

.lottie-preview
  height: 200px
  display: flex
  align-items: center
  justify-content: center
  background: rgba(255, 255, 255, 0.05)

.lottie-info
  padding: 16px

.lottie-name
  font-size: 14px
  font-weight: 600
  color: var(--text-primary)
  margin-bottom: 12px
  overflow: hidden
  text-overflow: ellipsis
  white-space: nowrap

.lottie-actions
  display: flex
  gap: 8px

.lottie-btn
  flex: 1
  display: flex
  align-items: center
  justify-content: center
  padding: 8px
  background: var(--background-card)
  border: 1px solid var(--border-color)
  border-radius: 8px
  color: var(--text-secondary)
  cursor: pointer
  transition: all 0.2s ease
  text-decoration: none

  &:hover
    background: var(--primary-gradient)
    color: white

.debug-section
  margin-top: 32px

.debug-content
  background: var(--background-hover)
  border: 1px solid var(--border-color)
  border-radius: 12px
  padding: 20px
  overflow-x: auto

  pre
    margin: 0
    color: var(--text-secondary)
    font-size: 12px
    line-height: 1.6
    font-family: 'JetBrains Mono', 'Fira Code', monospace

.debug-toggle
  background: none
  border: none
  color: var(--text-secondary)
  cursor: pointer
  padding: 8px
  border-radius: 8px
  transition: all 0.2s ease

  &:hover
    background: var(--background-hover)
    color: var(--text-primary)

.debug-toggle-btn
  position: fixed
  bottom: 24px
  right: 24px
  background: var(--background-card)
  border: 1px solid var(--border-color)
  border-radius: 50px
  padding: 12px 20px
  color: var(--text-secondary)
  cursor: pointer
  display: flex
  align-items: center
  gap: 8px
  font-size: 14px
  font-weight: 500
  transition: all 0.3s ease
  z-index: 100

  &:hover
    background: var(--primary-gradient)
    color: white
    transform: translateY(-2px)
    box-shadow: var(--shadow-md)

@media (max-width: 1024px)
  .emoji-header
    grid-template-columns: 1fr
    gap: 32px
    text-align: center

  .emoji-preview
    align-items: center

@media (max-width: 768px)
  .emoji-detail-content
    padding: 20px 16px

  .emoji-header
    padding: 24px

  .emoji-title
    font-size: 24px

  .assets-grid
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr))

  .lottie-container
    grid-template-columns: 1fr

  .debug-toggle-btn
    bottom: 16px
    right: 16px
    padding: 10px 16px
    font-size: 12px
</style>
