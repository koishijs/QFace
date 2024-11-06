<template lang="pug">
#index-view
  h1.text-center.text-10.mb-4.font-700 All QQ Emoji
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
    RouterLink(
      :key='item.emojiId',
      :to='`/qqnt/${item.emojiId}`'
      v-for='item in emoji.sortedEmojiList'
    )
      QEmojiMiniCard(:value='item')
</template>

<script setup lang="ts">
const emoji = useQqEmojiStore()

onMounted(() => {
  emoji.fetchData()
})
</script>

<style scoped lang="sass"></style>
