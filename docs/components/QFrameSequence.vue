<template lang="pug">
.frame-sequence
  .frame-header
    .frame-title {{ title }}
    .frame-count {{ current + 1 }} / {{ frames.length }} 帧 · {{ frameDelay }}ms/帧
    button.frame-btn(@click='playing = !playing')
      Pause(:size='14' v-if='playing')
      Play(:size='14' v-else)
      span {{ playing ? '暂停' : '播放' }}
  .frame-body
    .frame-player
      img(:alt='title', :src='frames[current]?.path')
    .frame-strip(ref='strip')
      button.frame-cell(
        :class='{ active: index === current }'
        :key='frame.path'
        :title='frame.name'
        @click='select(index)'
        v-for='(frame, index) in frames'
      )
        img(:alt='frame.name', :src='frame.path' loading='lazy')
        span {{ index + 1 }}
</template>

<script setup lang="ts">
import { Pause, Play } from 'lucide-vue-next'
import type { QqEmojiAssetV2 } from '@/types/QqSysEmoji'

const props = withDefaults(
  defineProps<{
    title: string
    frames: QqEmojiAssetV2[]
    // The archives carry no timing; 33ms matches the APNG of the interactive emojis
    frameDelay?: number
  }>(),
  { frameDelay: 33 }
)

const current = ref(0)
const playing = ref(true)
const strip = ref<HTMLElement>()

let timer: ReturnType<typeof setInterval> | undefined
watchEffect((onCleanup) => {
  if (!playing.value || props.frames.length < 2) {
    return
  }
  timer = setInterval(() => {
    current.value = (current.value + 1) % props.frames.length
  }, props.frameDelay)
  onCleanup(() => clearInterval(timer))
})

// Keep the active cell centered by scrolling the strip only, never the page
watch(current, (index) => {
  const container = strip.value
  const cell = container?.children[index] as HTMLElement | undefined
  if (!container || !cell) {
    return
  }
  // Rect-based: offsetLeft depends on which ancestor is positioned
  const left =
    cell.getBoundingClientRect().left -
    container.getBoundingClientRect().left +
    container.scrollLeft
  container.scrollLeft =
    left + cell.offsetWidth / 2 - container.clientWidth / 2
})

watch(
  () => props.frames,
  () => {
    current.value = 0
  }
)

function select(index: number) {
  playing.value = false
  current.value = index
}
</script>

<style scoped lang="sass">
$mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace

.frame-sequence
  display: flex
  flex-direction: column
  gap: 10px
  padding: 12px
  border: 1px solid var(--border-color)
  border-radius: 12px
  background: var(--background-hover)

.frame-header
  display: flex
  align-items: center
  gap: 12px

.frame-title
  font-family: $mono
  font-size: 13px
  font-weight: 600

.frame-count
  flex: 1
  font-family: $mono
  font-size: 12px
  color: var(--text-muted)

.frame-btn
  display: inline-flex
  align-items: center
  gap: 6px
  padding: 4px 10px
  border-radius: 8px
  border: 1px solid var(--border-color)
  background: transparent
  color: var(--text-secondary)
  font-size: 12px
  cursor: pointer

  &:hover
    color: var(--text-primary)
    background: var(--color-primary-soft)

.frame-body
  display: flex
  gap: 12px
  min-width: 0

.frame-player
  flex-shrink: 0
  width: 120px
  height: 120px
  display: grid
  place-items: center
  border-radius: 10px
  background: rgba(0, 0, 0, 0.2)

  img
    max-width: 90%
    max-height: 90%
    object-fit: contain

$cell-width: 72px
$strip-gap: 6px

.frame-strip
  flex: 1
  min-width: 0
  display: flex
  gap: $strip-gap
  overflow-x: auto
  padding-bottom: 6px

  // End spacers let the first and last frames scroll to the center too
  &::before,
  &::after
    content: ''
    flex: 0 0 calc(50% - #{$cell-width / 2 + $strip-gap})

.frame-cell
  flex-shrink: 0
  width: $cell-width
  display: flex
  flex-direction: column
  align-items: center
  gap: 2px
  padding: 4px
  border-radius: 8px
  border: 1px solid transparent
  background: rgba(0, 0, 0, 0.2)
  color: var(--text-muted)
  font-family: $mono
  font-size: 10px
  cursor: pointer

  img
    width: 60px
    height: 84px
    object-fit: contain

  &.active
    border-color: var(--color-primary-text)
    color: var(--color-primary-text)

@media (max-width: 768px)
  .frame-player
    width: 88px
    height: 88px
</style>
