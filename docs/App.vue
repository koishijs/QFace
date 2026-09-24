<template lang="pug">
#koishi-app
  GlobalHeader
  main
    RouterView
  GlobalFooter
</template>

<script setup lang="ts"></script>

<style scoped lang="sass">
#koishi-app
  display: flex
  min-height: 100vh
  flex-direction: column
  main
    flex: 1
    padding-top: var(--header-height)
    min-height: calc(100vh - var(--header-height))
</style>
