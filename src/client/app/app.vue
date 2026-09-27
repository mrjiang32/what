<script setup>
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'zh-CN'
  }
})

const title = 'what. | Compose 编排画布'
const description = '用可视化画布搭建 Docker Compose 服务拓扑。'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <UApp>
    <NuxtPage />
  </UApp>
</template>
