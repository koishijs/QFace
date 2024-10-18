<template lang="pug">
RouterLink.qq-emoji-mini-card(
  :to='`/details/qqnt/${value.emojiId}`'
  bg='#161618'
  border='1px solid #7c67e6'
  color-white
  cursor='pointer'
  decoration-none
  flex-col
  inline-flex
  items-center
  justify-center
  margin='10px'
  p-4
  padding='10px'
  rounded='0.5rem'
  w-30
)
  .face-thumb
    img(
      :alt='value.describe || "QQ Emoji"',
      :src='src'
      h-auto
      loading='lazy'
      w-full
    )
  .face-name(text-5) {{ value.describe?.replace('/', '') }}
</template>

<script setup lang="ts">
import type { QqSysEmojiItem } from '@/types/QqSysEmoji'

const props = defineProps<{
  value: QqSysEmojiItem
}>()

const src = computed(
  () =>
    `assets/qq_emoji/resfile/emoji/${props.value.emojiId}/apng/${props.value.emojiId}.png`
)
</script>

<style scoped lang="sass"></style>
