// The few Node built-ins the strength report uses, typed here so the project
// needn't take on @types/node for the sim alone
declare module 'node:fs' {
  export function existsSync(path: string): boolean
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void
  export function readFileSync(path: string, encoding: 'utf8'): string
  export function readdirSync(path: string): string[]
  export function rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void
  export function writeFileSync(path: string, data: string): void
}
declare module 'node:os' {
  export function tmpdir(): string
}
declare module 'node:path' {
  export function join(...parts: string[]): string
}
