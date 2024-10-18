<template lang="pug">
#koishi-app
  main
    RouterView
  footer(bg='#161618' m-t-6 p-x-4 p-y-8)
    .text-center Footer
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
