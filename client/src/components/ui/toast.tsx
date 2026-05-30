import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X, CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed bottom-4 right-4 z-[100] flex max-h-screen w-full flex-col gap-2 p-2 sm:max-w-[400px]",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  [
    "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden",
    "rounded-2xl border p-4 shadow-2xl",
    "transition-all duration-300",
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
    "data-[swipe=end]:animate-out",
    "data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full",
    "data-[state=open]:slide-in-from-bottom-full",
    "data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]",
    "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "border-border/60 bg-background/95 backdrop-blur-xl text-foreground",
        destructive:
          "border-red-500/30 bg-red-950/90 backdrop-blur-xl text-white",
        success:
          "border-emerald-500/30 bg-emerald-950/90 backdrop-blur-xl text-white",
        warning:
          "border-amber-500/30 bg-amber-950/90 backdrop-blur-xl text-white",
        info:
          "border-sky-500/30 bg-sky-950/90 backdrop-blur-xl text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const VARIANT_ICONS = {
  default:     Info,
  destructive: XCircle,
  success:     CheckCircle2,
  warning:     AlertTriangle,
  info:        Info,
} as const

const ICON_COLORS = {
  default:     "text-sky-400",
  destructive: "text-red-400",
  success:     "text-emerald-400",
  warning:     "text-amber-400",
  info:        "text-sky-400",
} as const

const PROGRESS_COLORS = {
  default:     "bg-sky-400",
  destructive: "bg-red-400",
  success:     "bg-emerald-400",
  warning:     "bg-amber-400",
  info:        "bg-sky-400",
} as const

type ToastVariant = keyof typeof VARIANT_ICONS

// Progress bar that shrinks from 100% → 0% over `duration` ms
function ToastProgress({
  duration = 5000,
  variant = "default",
}: {
  duration?: number
  variant?: ToastVariant
}) {
  const [width, setWidth] = React.useState(100)
  const start = React.useRef(Date.now())
  const raf = React.useRef<number>()

  React.useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - start.current
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setWidth(remaining)
      if (remaining > 0) {
        raf.current = requestAnimationFrame(tick)
      }
    }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [duration])

  return (
    <div className="absolute bottom-0 left-0 h-[3px] w-full overflow-hidden rounded-b-2xl bg-white/10">
      <div
        className={cn("h-full transition-none rounded-full", PROGRESS_COLORS[variant])}
        style={{ width: `${width}%` }}
      />
    </div>
  )
}

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants> & {
      duration?: number
    }
>(({ className, variant = "default", duration = 5000, children, ...props }, ref) => {
  const safeVariant: ToastVariant = (variant ?? "default") as ToastVariant
  const Icon = VARIANT_ICONS[safeVariant]
  const iconColor = ICON_COLORS[safeVariant]

  return (
    <ToastPrimitives.Root
      ref={ref}
      duration={duration}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    >
      {/* Icon */}
      <div className="shrink-0 mt-0.5">
        <Icon className={cn("h-5 w-5", iconColor)} />
      </div>

      {/* Content slot */}
      <div className="flex-1 min-w-0">{children}</div>

      {/* Progress bar */}
      <ToastProgress duration={duration} variant={safeVariant} />
    </ToastPrimitives.Root>
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "mt-2 inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10 px-3 text-xs font-semibold",
      "transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30",
      "disabled:pointer-events-none disabled:opacity-50",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "shrink-0 rounded-lg p-1 opacity-60 transition-opacity hover:opacity-100",
      "focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/30",
      "mt-0.5",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold leading-snug", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("mt-0.5 text-xs leading-relaxed opacity-80", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>
type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
