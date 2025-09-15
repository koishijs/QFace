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
    padding-top: 70px
    min-height: calc(100vh - 70px)
</style>
