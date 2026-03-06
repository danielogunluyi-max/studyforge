import React from "react";
import Link from "next/link";

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost" | "icon";
  size?: "sm" | "md" | "lg" | "icon";
  fullWidth?: boolean;
  loading?: boolean;
  type?: "button" | "submit" | "reset";
  href?: string;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  loading = false,
  type = "button",
  onClick,
  href,
  className = "",
  ...rest
}: ButtonProps) {
  const baseStyles = "btn button-ripple focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-70";

  // Variant styles
  const variantStyles = {
    primary: "btn-primary button-shimmer",
    secondary: "btn-ghost",
    danger: "btn-danger",
    ghost: "btn-ghost",
    icon: "btn-ghost min-h-9 min-w-9 p-2",
  };

  // Size styles
  const sizeStyles = {
    sm: "btn-sm",
    md: "",
    lg: "btn-lg",
    icon: "btn-sm min-h-9 min-w-9 p-2",
  };

  // Width style
  const widthStyle = fullWidth ? "w-full" : "";

  // Combine all styles
  const buttonClasses = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`;

  // Loading spinner
  const loadingSpinner = (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  // If href is provided, render as Link
  if (href && !disabled) {
    return (
      <Link href={href} className={buttonClasses}>
        {loading && loadingSpinner}
        {children}
      </Link>
    );
  }

  // Otherwise, render as button
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={buttonClasses}
      {...rest}
    >
      {loading && loadingSpinner}
      {children}
    </button>
  );
}
