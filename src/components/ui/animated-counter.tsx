'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'

interface AnimatedCounterProps {
  value: number
  duration?: number
  delay?: number
  decimals?: number
  formatter?: (value: number) => string
  className?: string
}

export function AnimatedCounter({
  value,
  duration = 1200,
  delay = 0,
  decimals = 0,
  formatter,
  className,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (!isInView || hasAnimated.current) return
    hasAnimated.current = true

    const startTime = performance.now() + delay
    const startValue = 0
    const endValue = value

    function animate(currentTime: number) {
      if (currentTime < startTime) {
        requestAnimationFrame(animate)
        return
      }

      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)

      const current = startValue + (endValue - startValue) * eased
      setDisplayValue(current)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setDisplayValue(endValue)
      }
    }

    requestAnimationFrame(animate)
  }, [isInView, value, duration, delay])

  const formatted = formatter
    ? formatter(displayValue)
    : displayValue.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })

  return (
    <span ref={ref} className={className}>
      {formatted}
    </span>
  )
}
