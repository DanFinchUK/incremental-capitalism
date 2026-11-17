import { ref } from 'vue'
import { roomStyle, type RoomDef } from '../data/rooms'
import { reducedMotion } from './quillWriter'

// How long the colours take to fade from one room to the next (rooms.css)
export const ROOM_FADE_MS = 600
// True while the colours are fading: the win screen waits for the new room
export const roomMoving = ref(false)
let fadeTimer: ReturnType<typeof setTimeout> | null = null

// Dresses the page as a room: its colours over the defaults in base.css, and
// data-room / data-ornament for the decoration in styles/rooms.css
export function applyRoom(el: HTMLElement, room: RoomDef, scheme: 'light' | 'dark'): void {
  for (const [name, value] of Object.entries(roomStyle(room, scheme))) {
    el.style.setProperty(name, value)
  }
  el.dataset.room = room.id
  el.dataset.ornament = room.ornament
  el.dataset.scheme = scheme
  el.dataset.font = room.displayFont
}

// Moves into a room with the colours fading across, rather than snapping
export function moveToRoom(el: HTMLElement, room: RoomDef, scheme: 'light' | 'dark'): void {
  if (fadeTimer !== null) clearTimeout(fadeTimer)
  fadeTimer = null
  if (reducedMotion()) {
    endRoomFade(el)
    applyRoom(el, room, scheme)
    return
  }
  roomMoving.value = true
  el.dataset.roomMoving = ''
  applyRoom(el, room, scheme)
  fadeTimer = setTimeout(() => endRoomFade(el), ROOM_FADE_MS)
}

export function endRoomFade(el: HTMLElement): void {
  if (fadeTimer !== null) clearTimeout(fadeTimer)
  fadeTimer = null
  roomMoving.value = false
  delete el.dataset.roomMoving
}
