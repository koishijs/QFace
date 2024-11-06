<template lang="pug">
#koishi-app
  main(p-t-70px)
    RouterView
  GlobalHeader
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
</style>
