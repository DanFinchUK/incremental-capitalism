<template>
  <!-- The clerk's pen. Its nib is the bottom-left corner of the drawing, and
       the quill writer moves the whole of it by its transform. -->
  <div class="reg-Quill" :class="{ 'reg-Quill-away': away }" aria-hidden="true">
    <svg viewBox="0 0 100 120" width="92" height="110">
      <defs>
        <linearGradient :id="vane" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stop-color="#cfc2a6" />
          <stop offset="0.45" stop-color="#f7f0e0" />
          <stop offset="1" stop-color="#e2d6bb" />
        </linearGradient>
      </defs>
      <path d="M22 96 C8 70 40 22 97 1 C88 38 62 84 22 96 Z" :fill="`url(#${vane})`" stroke="#7d6a4c" stroke-width="1.1" />
      <path
        d="M30 86 L50 74 M36 78 L58 64 M42 68 L66 52 M50 58 L74 40 M58 48 L82 28 M66 38 L88 16 M28 88 L18 76 M34 80 L24 62 M42 70 L34 52 M50 60 L44 40 M60 48 L56 28 M70 36 L68 18"
        stroke="#a8977a"
        stroke-width="0.9"
      />
      <path d="M4 116 L94 4" stroke="#5a4630" stroke-width="2.4" stroke-linecap="round" />
      <path d="M4 116 L22 94" stroke="#1d1712" stroke-width="2.8" stroke-linecap="round" />
      <path d="M2.5 118 L10 103 L16.5 108.5 Z" fill="#0f0b08" />
    </svg>
  </div>
</template>

<script setup lang="ts">
// Lifted off the page once the writing is done
defineProps<{ away: boolean }>()
// Each quill's gradient needs an id of its own on the page
const vane = `reg-vane-${Math.random().toString(36).slice(2, 8)}`
</script>
