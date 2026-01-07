import React from "react"
import styles from "./Card.module.css"

type BaseProps = {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className = "" }: BaseProps) {
  return <div className={`${styles.card} ${className}`}>{children}</div>
}

export function CardHeader({ children, className = "" }: BaseProps) {
  return <div className={`${styles.header} ${className}`}>{children}</div>
}

export function CardContent({ children, className = "" }: BaseProps) {
  return <div className={`${styles.content} ${className}`}>{children}</div>
}

export function CardTitle({ children, className = "" }: BaseProps) {
  return <h3 className={`${styles.title} ${className}`}>{children}</h3>
}

export function CardDescription({ children, className = "" }: BaseProps) {
  return <p className={`${styles.description} ${className}`}>{children}</p>
}
