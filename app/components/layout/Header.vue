<template>
  <header class="sticky top-0 z-50 border-b border-surface bg-panel">
    <div class="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
      <!-- Logo -->
      <NuxtLink
        to="/"
        class="flex items-center gap-3 text-lg font-bold tracking-wider text-content transition-colors hover:text-primary"
        aria-label="Rolling Dice"
      >
        <img src="~assets/images/dnd.png" alt="Dungeons & Dragons" class="w-16" />
        <h1 class="font-display text-xl">Rolling Dice</h1>
      </NuxtLink>

      <!-- Auth -->
      <div class="ml-auto flex items-center gap-3">
        <template v-if="auth.isLoggedIn">
          <span class="hidden text-sm text-content sm:inline">
            {{ auth.user?.displayName }}
          </span>
          <Button
            size="sm"
            border-color="var(--color-primary)"
            text-color="var(--color-primary)"
            outline
            @click="onLogout"
          >
            <span class="font-display flex items-center gap-1">
              Log out
              <Icon name="logout" />
            </span>
          </Button>
        </template>
        <Button v-else bg-color="var(--color-primary)" size="sm" @click="onLogin">
          <span class="font-display flex items-center gap-1">
            Log in
            <Icon name="login" />
          </span>
        </Button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { Button, Icon } from '@ui'

const auth = useAuthStore()
const route = useRoute()

const onLogin = () => {
  auth.login(route.fullPath)
}

const onLogout = async () => {
  await auth.logout()
  await navigateTo('/')
}
</script>
