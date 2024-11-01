<template lang="pug">
#emoji-details
  h1 Emoji Details
  pre {{ data }}
  KoishiPlaceholder(v-if='!data')
  .emoji-card(v-else)
    img(
      :src='`assets/qq_emoji/resfile/emoji/${data.emojiId}/apng/${data.emojiId}.png`'
    )
    img(:src='`assets/qq_emoji/thumbs/${data.emojiId}.png`')
    img(:src='`assets/qq_emoji/thumbs/gif_${data.emojiId}.gif`')
</template>

<script setup lang="ts">
const qStore = useQqEmojiStore()
const route = useRoute()

const data = computed(() => {
  return qStore.getEmojiById(route.params.id)
})

onMounted(() => {
  qStore.fetchData()
})
</script>

<style scoped lang="sass"></style>
