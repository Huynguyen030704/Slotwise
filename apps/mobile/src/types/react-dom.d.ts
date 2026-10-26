// react-dom ships no types and the app only needs one function from it (web tooltips).
declare module 'react-dom' {
  export function createPortal(
    children: import('react').ReactNode,
    container: Element | DocumentFragment,
  ): import('react').ReactPortal;
}
