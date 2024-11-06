<template lang="pug">
#wechat-view
  h1.text-center.text-10.mb-4.font-700 All WeChat Emoji
  .emoji-list.emoji-placeholder(v-if='emoji.sortedEmojiList.length === 0')
    .w-full.h-75vh.flex.items-center.justify-center
      KoishiPlaceholder
  .emoji-list(
    flex
    flex-wrap
    gap-4
    justify-center
    lt-md='p-x-4'
    m-x-auto
    max-w-1280px
    v-else
  )
    .emoji-item(
      :key='item.fileName',
      :title='JSON.stringify(item, null, 2)'
      v-for='item in emoji.sortedEmojiList'
    )
      img(:alt='item.cnValue || item.fileName', :src='item.path' h-30 w-30)
      .text-center {{ item.cnValue || item.fileName }}
</template>

<script setup lang="ts">
const emoji = useWechatEmojiStore()

onMounted(() => {
  emoji.fetchData()
})
</script>

<style scoped lang="sass"></style>
