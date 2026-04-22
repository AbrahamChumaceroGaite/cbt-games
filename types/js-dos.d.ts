declare module 'js-dos' {
  interface DosInstance {
    stop(): void
  }
  export function Dos(element: HTMLElement, options: { url: string }): Promise<DosInstance>
}
