<template>
  <div>
    <section
      class="relative flex max-h-screen flex-col items-center justify-center overflow-hidden"
    >
      <!-- Atmospheric background -->
      <div
        class="pointer-events-none absolute inset-0"
        style="
          background: radial-gradient(
            ellipse 70% 70% at 50% 50%,
            var(--rd--color-bg-elevated) 0%,
            var(--rd--color-bg) 100%
          );
        "
        aria-hidden="true"
      />

      <!-- Ring System -->
      <div class="ring-system scale-[0.5] sm:scale-[0.65] md:scale-[0.85] lg:scale-100">
        <!-- Center glow -->
        <div class="ring-glow" aria-hidden="true" />

        <!-- Outer ring -->
        <div
          v-for="(prof, i) in OUTER_RING_CLASSES"
          :key="`outer-${prof}`"
          class="orbit-outer"
          :style="{ '--i': i }"
        >
          <img :src="CLASS_IMAGES[prof]" :alt="t(`class.label.${prof}`)" class="ring-img" />
        </div>

        <!-- Inner ring -->
        <div
          v-for="(prof, i) in INNER_RING_CLASSES"
          :key="`inner-${prof}`"
          class="orbit-inner"
          :style="{ '--i': i }"
        >
          <img :src="CLASS_IMAGES[prof]" :alt="t(`class.label.${prof}`)" class="ring-img" />
        </div>

        <!-- Center content -->
        <div class="ring-center">
          <h1>
            <img src="~assets/images/rolling-dice.png" alt="Rolling Dice" class="w-full" />
          </h1>
          <!-- <p class="mt-2 text-sm tracking-wider text-content-muted font-display">Roll Your Life</p> -->
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { ClassKey } from '@rolling-dice-app/core'

const { t } = useI18n()

// ─── Class ring data ──────────────────────────────────────────────────────
const OUTER_RING_CLASSES: ClassKey[] = [
  'artificer',
  'bard',
  'cleric',
  'druid',
  'sorcerer',
  'warlock',
  'wizard',
]

const INNER_RING_CLASSES: ClassKey[] = [
  'barbarian',
  'fighter',
  'monk',
  'paladin',
  'ranger',
  'rogue',
]
</script>

<style scoped>
/* ─── Ring System ──────────────────────────────────────────────────────────── */
.ring-system {
  position: relative;
  width: 600px;
  height: 600px;
  flex-shrink: 0;
}

/* ─── Center glow ──────────────────────────────────────────────────────────── */
.ring-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 200px;
  height: 200px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(ellipse at center, var(--rd--color-primary-soft) 0%, transparent 70%);
  pointer-events: none;
}

/* ─── Outer ring (clockwise, 7 items, radius 220px) ───────────────────────── */
@keyframes orbit-outer {
  from {
    transform: rotate(0deg) translateY(-220px) rotate(0deg);
  }
  to {
    transform: rotate(360deg) translateY(-220px) rotate(-360deg);
  }
}

.orbit-outer {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 64px;
  height: 64px;
  margin-top: -32px;
  margin-left: -32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 2px solid var(--rd--color-primary);
  box-shadow: 0 0 10px var(--rd--color-primary-soft);
  padding: 5px;
  animation: orbit-outer 40s linear infinite;
  animation-delay: calc(var(--i) / 7 * -40s);
}

/* ─── Inner ring (counter-clockwise, 6 items, radius 130px) ───────────────── */
@keyframes orbit-inner {
  from {
    transform: rotate(0deg) translateY(-130px) rotate(0deg);
  }
  to {
    transform: rotate(-360deg) translateY(-130px) rotate(360deg);
  }
}

.orbit-inner {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 52px;
  height: 52px;
  margin-top: -26px;
  margin-left: -26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 2px solid var(--rd--color-border-strong);
  padding: 4px;
  animation: orbit-inner 30s linear infinite;
  animation-delay: calc(var(--i) / 6 * -30s);
}

/* ─── Ring images ──────────────────────────────────────────────────────────── */
.ring-img {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: fill;
}

/* ─── Ring center ──────────────────────────────────────────────────────────── */
.ring-center {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 450px;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 10;
  pointer-events: none;
  white-space: nowrap;
}

/* ─── Reduced motion ───────────────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .orbit-outer {
    animation: none;
    transform: rotate(calc(var(--i) * (360deg / 7))) translateY(-220px)
      rotate(calc(var(--i) * (-360deg / 7)));
  }

  .orbit-inner {
    animation: none;
    transform: rotate(calc(var(--i) * (360deg / 6))) translateY(-130px)
      rotate(calc(var(--i) * (-360deg / 6)));
  }
}
</style>
