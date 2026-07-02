<template>
  <div />
</template>

<script setup lang="ts">
// /dm 本身無內容，導向第一個工具（怪物模板）。
definePageMeta({ middleware: 'auth', noindex: true, redirect: '/dm/monster' })
</script>
