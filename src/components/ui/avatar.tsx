"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"
import { normalizeImagePath, DEFAULT_CUSTOM_PROFESSOR_IMAGE } from "@/lib/professors-registry"

const Avatar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full select-none",
      className
    )}
    {...props}
  />
))
Avatar.displayName = "Avatar"

const AvatarImage = React.forwardRef<
  HTMLImageElement,
  React.ImgHTMLAttributes<HTMLImageElement>
>(({ className, src, onError, alt = "Avatar", ...props }, ref) => {
  const initial = typeof src === 'string' && src.trim() 
    ? normalizeImagePath(src) 
    : DEFAULT_CUSTOM_PROFESSOR_IMAGE;
  const [imgSrc, setImgSrc] = React.useState<string>(initial);
  const [hasFailed, setHasFailed] = React.useState(false);

  React.useEffect(() => {
    setHasFailed(false);
    if (typeof src === 'string' && src.trim()) {
      setImgSrc(normalizeImagePath(src));
    } else {
      setImgSrc(DEFAULT_CUSTOM_PROFESSOR_IMAGE);
    }
  }, [src]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (imgSrc !== DEFAULT_CUSTOM_PROFESSOR_IMAGE) {
      setImgSrc(DEFAULT_CUSTOM_PROFESSOR_IMAGE);
    } else {
      setHasFailed(true);
    }
    if (onError) onError(e);
  };

  if (hasFailed) return null;

  return (
    <img
      ref={ref}
      src={imgSrc}
      alt={alt}
      onError={handleError}
      className={cn("aspect-square h-full w-full object-cover z-10", className)}
      referrerPolicy="no-referrer"
      {...props}
    />
  );
})
AvatarImage.displayName = "AvatarImage"

const AvatarFallback = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "absolute inset-0 flex h-full w-full items-center justify-center rounded-inherit bg-muted z-0",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback }
