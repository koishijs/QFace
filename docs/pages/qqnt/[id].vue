<template lang="pug">
#emoji-details.responsive-container
  .breadcrumb
    router-link(to='/') All QQ Emoji
    | &nbsp;
    span &gt;
    | &nbsp;
    span {{ data?.describe || data?.emojiId || 'Loading...' }}
  .placeholder(flex h-70vh items-center justify-center v-if='!data' w-full)
    h1 Loading...
    KoishiPlaceholder(v-if='!data')
  div(v-else)
    h1.text-center.text-10.m-b-6.font-700 {{ data.describe?.replace(/^\//, '') || '[MISSING_DESCRIBE]' }}
    .basic-info
      //- h2.text-center.text-2xl.font-700.m-y-4 Basic Info
      ul.text-center
        li Emoji ID: {{ data.emojiId }}
        li Emoji Describe: {{ data.describe }}
        li Emoji Type: {{ data.emojiType }}
        li Hidden from UI: {{ data.isHide }}
        li Animation Witdh: {{ data.animationWidth }}
        li Animation Height: {{ data.animationHeigh }}
    .associate-words
      h2.text-center.text-2xl.font-700.m-y-4 Associate Words
      .tags(flex flex-wrap gap-2 justify-center)
        .tag(
          :key='item'
          bg-purple
          inline-block
          p-x-2
          rounded-full
          text-white
          v-for='item in data.associateWords'
        ) {{ item }}
        .tag(v-if='!data.associateWords.length') No associate words
    .thumb-files
      h2.text-center.text-2xl.font-700.m-y-4 Image Assets
      .flex(gap-4 justify-center)
        .image-asset(
          flex
          flex-col
          items-center
          justify-center
          v-for='(item, index) in imgAssets'
        )
          div: img(:alt='item.name', :key='index', :src='item.path')
          .text-center {{ item.name }}
          .text-center.text-3 {{ QqSysEmojiAssetType[item.type] }}
      .text-center(v-if='!imgAssets.length') No image assets
    .lottie-files
      h2.text-center.text-2xl.font-700.m-y-4 Lottie Files
      .flex(flex='wrap' gap-2 justify-center)
        .lottie-asset(v-for='(item, index) in lottieFiles')
          LottieViewer(
            :animation-link='item.path',
            :height='300',
            :play-on-hover='lottieFiles.length > 1',
            :width='300'
          )
          .text-center {{ item.name }}
      .text-center(v-if='!lottieFiles.length') No lottie files
  details
    pre {{ data }}
</template>

<script setup lang="ts">
import { QqSysEmojiAssetType } from '@/types/QqSysEmoji'
import { Vue3Lottie as LottieViewer } from 'vue3-lottie'
const qStore = useQqEmojiStore()
const route = useRoute()

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

async function checkIfLottieExists() {
  const res = await fetch(
    `assets/qq_emoji/resfile/emoji/${data.value?.emojiId}/lottie/${data.value?.emojiId}.json`,
    {
      method: 'HEAD',
    }
  )
  return res.ok && res.status === 200
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

<style scoped lang="sass"></style>
