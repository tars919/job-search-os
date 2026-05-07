'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'

export function useHotkey(
  key: string,
  callback: () => void,
  options: { meta?: boolean } = {},
) {
  const cbRef = useRef(callback)
  useLayoutEffect(() => { cbRef.current = callback })

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (target.isContentEditable) return

      const modMatch = options.meta
        ? e.metaKey || e.ctrlKey
        : !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey

      if (e.key === key && modMatch) {
        e.preventDefault()
        cbRef.current()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [key, options.meta])
}
