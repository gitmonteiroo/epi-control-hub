interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

export function LoadingSpinner({ size = "lg", className = "" }: LoadingSpinnerProps) {
  return (
    <div className={`animate-spin rounded-full border-b-2 border-primary ${sizeClasses[size]} ${className}`} />
  );
}

export function LoadingPage() {
  return (
    <div className="flex items-center justify-center h-96">
      <LoadingSpinner size="lg" />
    </div>
  );
}

export function LoadingInline() {
  return (
    <div className="flex items-center justify-center h-48">
      <LoadingSpinner size="md" />
    </div>
  );
}
