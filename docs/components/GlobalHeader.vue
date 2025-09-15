<template lang="pug">
header#global-header
  .header-content
    .logo-section
      RouterLink.logo-link(to='/')
        .logo-icon
          img(src='/assets/default.png')
        .logo-text
          h1 QQ Emoji
          span.subtitle Playground
    .nav-section
      .nav-item
        RouterLink(
          :class='{ active: $route.path.startsWith("/qqnt") }'
          to='/qqnt'
        ) QQ Emoji
      .nav-item
        RouterLink(
          :class='{ active: $route.path.startsWith("/wechat") }'
          to='/wechat'
        ) WeChat Emoji
      .nav-item
        a(
          href='https://github.com/koishijs/QFace'
          rel='noopener noreferrer'
          target='_blank'
        )
          svg(fill='currentColor' height='20' viewBox='0 0 24 24' width='20')
            path(
              d='M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z'
            )
</template>

<script setup lang="ts"></script>

<style scoped lang="sass">
#global-header
  position: fixed
  top: 0
  left: 0
  right: 0
  height: 70px
  background: rgba(17, 17, 19, 0.95)
  backdrop-filter: blur(20px)
  border-bottom: 1px solid var(--border-color)
  z-index: 1000
  transition: all 0.3s ease

.header-content
  max-width: 1400px
  margin: 0 auto
  padding: 0 24px
  height: 100%
  display: flex
  align-items: center
  justify-content: space-between

.logo-section
  display: flex
  align-items: center
  gap: 12px

.logo-link
  display: flex
  align-items: center
  gap: 12px
  text-decoration: none
  transition: transform 0.2s ease
  &:hover
    transform: translateY(-1px)

.logo-icon
  display: flex
  align-items: center
  justify-content: center
  width: 40px
  height: 40px
  border-radius: 10px
  background: var(--primary-gradient)
  box-shadow: var(--shadow-md)

.logo-text
  h1
    margin: 0
    font-size: 24px
    font-weight: 700
    background: var(--primary-gradient)
    -webkit-background-clip: text
    -webkit-text-fill-color: transparent
    background-clip: text
  .subtitle
    display: block
    font-size: 12px
    color: var(--text-secondary)
    font-weight: 500
    text-transform: uppercase
    letter-spacing: 1px

.nav-section
  display: flex
  align-items: center
  gap: 32px

.nav-item
  a
    position: relative
    display: flex
    align-items: center
    gap: 8px
    padding: 8px 16px
    color: var(--text-secondary)
    text-decoration: none
    font-weight: 500
    border-radius: 8px
    transition: all 0.2s ease
    &:hover
      color: var(--text-primary)
      background: var(--background-hover)
    &.active
      color: var(--text-primary)
      background: var(--background-hover)
      &::before
        content: ''
        position: absolute
        bottom: -2px
        left: 50%
        transform: translateX(-50%)
        width: 20px
        height: 2px
        background: var(--primary-gradient)
        border-radius: 1px

@media (max-width: 768px)
  .header-content
    padding: 0 16px
  .nav-section
    gap: 16px
  .logo-text
    h1
      font-size: 20px
</style>
