<template lang="pug">
footer#global-footer
  .footer-content
    .footer-main
      .footer-brand
        .brand-logo
          img(src='/assets/default.png')
        .brand-info
          h3 QFace
          p QQ Emoji 表情资源库
      .footer-links
        .link-group
          h4 项目
          a(
            href='https://github.com/koishijs/QFace'
            rel='noopener noreferrer'
            target='_blank'
          ) GitHub
          a(
            href='https://koishi.chat'
            rel='noopener noreferrer'
            target='_blank'
          ) Koishi
        .link-group
          h4 资源
          RouterLink(to='/qqnt') QQ Emoji
          RouterLink(to='/wechat') WeChat Emoji
        .link-group
          h4 支持
          a(
            href='https://github.com/koishijs/QFace/issues'
            rel='noopener noreferrer'
            target='_blank'
          ) 问题反馈
          a(
            href='https://github.com/koishijs/QFace/discussions'
            rel='noopener noreferrer'
            target='_blank'
          ) 讨论区
    .footer-bottom
      .footer-copyright
        p &copy; 2024 Koishi. 由
          |
          a(
            href='https://github.com/koishijs'
            rel='noopener noreferrer'
            target='_blank'
          ) Koishi
          |
          | 团队维护
        p.disclaimer 所有表情资源版权归腾讯公司所有
      .footer-social
        a.social-link(
          href='https://github.com/koishijs'
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
#global-footer
  background: var(--background-card)
  border-top: 1px solid var(--border-color)
  margin-top: auto

.footer-content
  max-width: 1400px
  margin: 0 auto
  padding: 60px 24px 20px

.footer-main
  display: grid
  grid-template-columns: 1fr 2fr
  gap: 60px
  margin-bottom: 40px

.footer-brand
  display: flex
  flex-direction: column
  gap: 20px

.brand-logo
  width: 48px
  height: 48px
  border-radius: 12px
  background: var(--primary-gradient)
  display: flex
  align-items: center
  justify-content: center
  box-shadow: var(--shadow-md)

.brand-info
  h3
    font-size: 24px
    font-weight: 700
    color: var(--text-primary)
    margin: 0 0 8px 0
    background: var(--primary-gradient)
    -webkit-background-clip: text
    -webkit-text-fill-color: transparent
    background-clip: text

  p
    font-size: 14px
    color: var(--text-secondary)
    margin: 0
    line-height: 1.6

.footer-links
  display: grid
  grid-template-columns: repeat(3, 1fr)
  gap: 40px

.link-group
  h4
    font-size: 16px
    font-weight: 600
    color: var(--text-primary)
    margin: 0 0 16px 0

  a
    display: block
    color: var(--text-secondary)
    text-decoration: none
    font-size: 14px
    margin-bottom: 8px
    transition: color 0.2s ease

    &:hover
      color: var(--text-primary)

.footer-bottom
  display: flex
  justify-content: space-between
  align-items: center
  padding-top: 20px
  border-top: 1px solid var(--border-color)

.footer-copyright
  p
    font-size: 14px
    color: var(--text-secondary)
    margin: 0 0 4px 0

    a
      color: var(--text-primary)
      text-decoration: none
      font-weight: 500

      &:hover
        color: #667eea

  .disclaimer
    font-size: 12px
    color: var(--text-muted)

.footer-social
  display: flex
  gap: 16px

.social-link
  display: flex
  align-items: center
  justify-content: center
  width: 40px
  height: 40px
  background: var(--background-hover)
  border: 1px solid var(--border-color)
  border-radius: 10px
  color: var(--text-secondary)
  transition: all 0.2s ease

  &:hover
    background: var(--primary-gradient)
    color: white
    transform: translateY(-2px)

@media (max-width: 1024px)
  .footer-main
    grid-template-columns: 1fr
    gap: 40px

  .footer-links
    grid-template-columns: repeat(2, 1fr)
    gap: 32px

@media (max-width: 768px)
  .footer-content
    padding: 40px 16px 20px

  .footer-main
    gap: 32px

  .footer-links
    grid-template-columns: 1fr
    gap: 24px

  .footer-bottom
    flex-direction: column
    gap: 16px
    text-align: center

  .footer-social
    justify-content: center
</style>
