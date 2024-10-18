<template lang="pug">
#index-view
  h1.text-center.text-10.mb-4.font-700 QQ Emoji
  .emoji-list.emoji-placeholder(v-if='emoji.sortedEmojiList.length === 0')
    .w-full.h-75vh.flex.items-center.justify-center
      KoishiPlaceholder
  .emoji-list(flex flex-wrap gap-4 justify-center m-x-4 v-else)
    QEmojiMiniCard(
      :key='item.emojiId',
      :value='item'
      v-for='item in emoji.sortedEmojiList'
    )
</template>

<script setup lang="ts">
const emoji = useQqEmojiStore()

onMounted(() => {
  emoji.fetchData()
})
</script>

<style scoped lang="sass"></style>
