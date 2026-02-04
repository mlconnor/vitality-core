"use client";

import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "../../lib/utils";
import type { FileUIPart } from "ai";
import {
  FileIcon,
  FileTextIcon,
  ImageIcon,
  MusicIcon,
  VideoIcon,
  XIcon,
  Loader2Icon,
  FileQuestionIcon,
} from "lucide-react";
import type { ComponentProps, HTMLAttributes, ReactNode } from "react";
import { createContext, useContext } from "react";

// Re-export useContext for internal use
const useContextInternal = useContext;

// ============================================================================
// Types
// ============================================================================

export type AttachmentData = (FileUIPart & { id: string }) | SourceDocumentData;

export interface SourceDocumentData {
  id: string;
  type: "source";
  title: string;
  url?: string;
  mediaType?: string;
}

export type MediaCategory = "image" | "video" | "audio" | "document" | "source" | "unknown";

export type AttachmentVariant = "grid" | "inline" | "list";

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Returns the media category for an attachment
 */
export function getMediaCategory(data: AttachmentData): MediaCategory {
  if ("type" in data && data.type === "source") {
    return "source";
  }

  const mediaType = (data as FileUIPart).mediaType || "";
  
  if (mediaType.startsWith("image/")) return "image";
  if (mediaType.startsWith("video/")) return "video";
  if (mediaType.startsWith("audio/")) return "audio";
  if (
    mediaType.startsWith("application/pdf") ||
    mediaType.startsWith("text/") ||
    mediaType.includes("document") ||
    mediaType.includes("spreadsheet")
  ) {
    return "document";
  }
  
  return "unknown";
}

/**
 * Returns the display label for an attachment
 */
export function getAttachmentLabel(data: AttachmentData): string {
  if ("type" in data && data.type === "source") {
    return (data as SourceDocumentData).title || "Source Document";
  }

  const fileData = data as FileUIPart & { id: string };
  if (fileData.filename) return fileData.filename;

  const category = getMediaCategory(data);
  switch (category) {
    case "image":
      return "Image";
    case "video":
      return "Video";
    case "audio":
      return "Audio";
    case "document":
      return "Document";
    default:
      return "Attachment";
  }
}

/**
 * Returns the appropriate icon for a media category
 */
function getMediaIcon(category: MediaCategory): ReactNode {
  switch (category) {
    case "image":
      return <ImageIcon className="size-4" />;
    case "video":
      return <VideoIcon className="size-4" />;
    case "audio":
      return <MusicIcon className="size-4" />;
    case "document":
      return <FileTextIcon className="size-4" />;
    case "source":
      return <FileIcon className="size-4" />;
    default:
      return <FileQuestionIcon className="size-4" />;
  }
}

// ============================================================================
// Context
// ============================================================================

interface AttachmentContextValue {
  data?: AttachmentData;
  onRemove?: () => void;
  variant: AttachmentVariant;
  isUploading?: boolean;
}

const AttachmentContext = createContext<AttachmentContextValue | null>(null);

function useAttachmentContext() {
  const context = useContext(AttachmentContext);
  if (!context) {
    throw new Error("Attachment components must be used within <Attachment>");
  }
  return context;
}

// ============================================================================
// Attachments Container
// ============================================================================

export interface AttachmentsProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AttachmentVariant;
}

export function Attachments({
  variant = "grid",
  className,
  children,
  ...props
}: AttachmentsProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-2",
        variant === "grid" && "grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2",
        variant === "inline" && "flex-row items-center",
        variant === "list" && "flex-col",
        className
      )}
      data-variant={variant}
      {...props}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Individual Attachment
// ============================================================================

export interface AttachmentProps extends HTMLAttributes<HTMLDivElement> {
  data?: AttachmentData;
  onRemove?: () => void;
  isUploading?: boolean;
}

export function Attachment({
  data,
  onRemove,
  isUploading,
  className,
  children,
  ...props
}: AttachmentProps) {
  // Determine variant from parent
  const parentVariant = (props as { "data-variant"?: AttachmentVariant })["data-variant"] || "grid";
  
  return (
    <AttachmentContext.Provider value={{ data, onRemove, variant: parentVariant, isUploading }}>
      <div
        className={cn(
          "group relative",
          parentVariant === "grid" && "size-24 overflow-hidden rounded-lg bg-muted",
          parentVariant === "inline" && "flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-sm",
          parentVariant === "list" && "flex items-center gap-3 rounded-lg bg-muted p-3",
          isUploading && "opacity-60",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </AttachmentContext.Provider>
  );
}

// ============================================================================
// Attachment Preview
// ============================================================================

export interface AttachmentPreviewProps extends HTMLAttributes<HTMLDivElement> {
  fallbackIcon?: ReactNode;
}

export function AttachmentPreview({
  fallbackIcon,
  className,
  ...props
}: AttachmentPreviewProps) {
  const { data, variant, isUploading } = useAttachmentContext();

  if (!data) return null;

  const category = getMediaCategory(data);
  const isImage = category === "image";
  const fileData = data as FileUIPart & { id: string };
  const url = fileData.url;

  if (isUploading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-muted-foreground",
          variant === "grid" && "size-full",
          variant === "inline" && "size-4",
          variant === "list" && "size-10",
          className
        )}
        {...props}
      >
        <Loader2Icon className="size-4 animate-spin" />
      </div>
    );
  }

  if (isImage && url) {
    return (
      <img
        alt={getAttachmentLabel(data)}
        className={cn(
          "object-cover",
          variant === "grid" && "size-full",
          variant === "inline" && "size-5 rounded",
          variant === "list" && "size-10 rounded",
          className
        )}
        src={url}
        {...props}
      />
    );
  }

  const icon = fallbackIcon || getMediaIcon(category);

  return (
    <div
      className={cn(
        "flex items-center justify-center text-muted-foreground",
        variant === "grid" && "size-full",
        variant === "inline" && "",
        variant === "list" && "size-10 rounded bg-background",
        className
      )}
      {...props}
    >
      {icon}
    </div>
  );
}

// ============================================================================
// Attachment Info
// ============================================================================

export interface AttachmentInfoProps extends HTMLAttributes<HTMLDivElement> {
  showMediaType?: boolean;
}

export function AttachmentInfo({
  showMediaType = false,
  className,
  ...props
}: AttachmentInfoProps) {
  const { data, variant } = useAttachmentContext();

  if (!data) return null;

  const label = getAttachmentLabel(data);
  const fileData = data as FileUIPart & { id: string };
  const mediaType = fileData.mediaType;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col",
        variant === "inline" && "flex-row items-center gap-1",
        className
      )}
      {...props}
    >
      <span className="truncate text-sm font-medium">{label}</span>
      {showMediaType && mediaType && (
        <span className="truncate text-xs text-muted-foreground">{mediaType}</span>
      )}
    </div>
  );
}

// ============================================================================
// Attachment Remove Button
// ============================================================================

export interface AttachmentRemoveProps extends ComponentProps<typeof Button> {
  label?: string;
}

export function AttachmentRemove({
  label = "Remove",
  className,
  ...props
}: AttachmentRemoveProps) {
  const { onRemove, variant } = useAttachmentContext();

  if (!onRemove) return null;

  return (
    <Button
      aria-label={label}
      className={cn(
        "shrink-0 transition-opacity",
        variant === "grid" &&
          "absolute right-1 top-1 size-6 rounded-full bg-background/80 p-0 opacity-0 backdrop-blur-sm hover:bg-background group-hover:opacity-100 [&>svg]:size-3",
        variant === "inline" &&
          "size-4 rounded-full p-0 hover:bg-transparent [&>svg]:size-3",
        variant === "list" &&
          "size-6 rounded-full p-0 opacity-0 group-hover:opacity-100 [&>svg]:size-3",
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        onRemove();
      }}
      size="icon"
      type="button"
      variant="ghost"
      {...props}
    >
      <XIcon />
      <span className="sr-only">{label}</span>
    </Button>
  );
}

// ============================================================================
// Hover Card Components (for inline variant)
// ============================================================================

export type AttachmentHoverCardProps = ComponentProps<typeof HoverCard>;

export function AttachmentHoverCard({
  openDelay = 200,
  closeDelay = 100,
  ...props
}: AttachmentHoverCardProps) {
  return <HoverCard openDelay={openDelay} closeDelay={closeDelay} {...props} />;
}

export type AttachmentHoverCardTriggerProps = ComponentProps<typeof HoverCardTrigger>;

export function AttachmentHoverCardTrigger(props: AttachmentHoverCardTriggerProps) {
  return <HoverCardTrigger {...props} />;
}

export interface AttachmentHoverCardContentProps
  extends ComponentProps<typeof HoverCardContent> {
  align?: "start" | "center" | "end";
  /** Pass data directly since HoverCardContent renders in a portal outside the Attachment context */
  data?: AttachmentData;
}

export function AttachmentHoverCardContent({
  align = "center",
  className,
  data,
  ...props
}: AttachmentHoverCardContentProps) {
  // Try to get from context first, fall back to prop
  // Note: HoverCardContent renders in a portal, so context may not be available
  const context = useContextInternal(AttachmentContext);
  const attachmentData = data || context?.data;

  if (!attachmentData) return null;

  const category = getMediaCategory(attachmentData);
  const isImage = category === "image";
  const fileData = attachmentData as FileUIPart & { id: string };
  const url = fileData.url;

  return (
    <HoverCardContent align={align} className={cn("w-64 p-2", className)} {...props}>
      {isImage && url ? (
        <img
          alt={getAttachmentLabel(attachmentData)}
          className="w-full rounded object-cover"
          src={url}
        />
      ) : (
        <div className="flex items-center gap-2 p-2">
          {getMediaIcon(category)}
          <span className="text-sm">{getAttachmentLabel(attachmentData)}</span>
        </div>
      )}
    </HoverCardContent>
  );
}

// ============================================================================
// Empty State
// ============================================================================

export type AttachmentEmptyProps = HTMLAttributes<HTMLDivElement>;

export function AttachmentEmpty({ className, children, ...props }: AttachmentEmptyProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg border border-dashed p-4 text-sm text-muted-foreground",
        className
      )}
      {...props}
    >
      {children || "No attachments"}
    </div>
  );
}

