import React from "react"
import styles from "./Button.module.css"

type ButtonVariant = "primary" | "outline" | "text"
type ButtonSize = "sm" | "md" | "lg"

type ButtonProps = {
  children: React.ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        styles.button,
        styles[variant],
        styles[size],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  )
}
