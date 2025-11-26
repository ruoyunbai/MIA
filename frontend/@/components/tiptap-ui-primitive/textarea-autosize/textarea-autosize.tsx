import { useState } from "react"
import ReactTextareaAutosize from "react-textarea-autosize"
import type { TextareaAutosizeProps } from "react-textarea-autosize"

// -- Hooks --
import { useIsomorphicLayoutEffect } from "@/hooks/use-isomorphic-layout-effect"

export function TextareaAutosize({ ...props }: TextareaAutosizeProps) {
  const [isRerendered, setIsRerendered] = useState(false)

  useIsomorphicLayoutEffect(() => setIsRerendered(true), [])

  return isRerendered ? <ReactTextareaAutosize {...props} /> : null
}

TextareaAutosize.displayName = "TextareaAutosize"
