"use client"

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion"

const EASE = [0.22, 1, 0.36, 1] as const

type MotionDivProps = Omit<HTMLMotionProps<"div">, "ref">

type RevealProps = MotionDivProps & {
  /** Delay in seconds before the entrance animation starts. */
  delay?: number
  /** Distance in pixels the element travels on entrance. */
  distance?: number
}

/** Fades and slides its content in the first time it scrolls into view. */
export function Reveal({ delay = 0, distance = 24, ...props }: RevealProps) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <motion.div {...props} />
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2, margin: "0px 0px -80px 0px" }}
      transition={{ duration: 0.55, delay, ease: EASE }}
      {...props}
    />
  )
}

/** Animates `RevealItem` children in sequence when scrolled into view. */
export function RevealGroup({
  stagger = 0.08,
  ...props
}: MotionDivProps & { stagger?: number }) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <motion.div {...props} />
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15, margin: "0px 0px -80px 0px" }}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: stagger } } }}
      {...props}
    />
  )
}

export function RevealItem({
  distance = 20,
  ...props
}: MotionDivProps & { distance?: number }) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <motion.div {...props} />
  }

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: distance },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
      }}
      {...props}
    />
  )
}
