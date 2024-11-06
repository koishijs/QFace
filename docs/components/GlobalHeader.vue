<template lang="pug">
header#global-header(
  bg='#161618'
  fixed
  h-60px
  l-0
  p-x-4
  p-y-10px
  t-0
  w-full
  z-10
)
  .flex(items-center justify-between)
    h1
      RouterLink(to='/')
        span.text-6 QQ Emoji Playground
</template>

<script setup lang="ts"></script>

<style scoped lang="sass">
#global-header
  box-shadow: 0 0 0 2px #7c67e666
</style>
