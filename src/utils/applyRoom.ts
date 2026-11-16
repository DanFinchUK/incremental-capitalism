import { roomStyle, type RoomDef } from '../data/rooms'

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
