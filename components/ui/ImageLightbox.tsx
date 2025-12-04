"use client";

type LightboxImage = {
  s3Key: string;
};

type ImageLightboxProps = {
  images: LightboxImage[];
  index: number;
  isOpen: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  srcBuilder: (s3Key: string) => string;
};

export function ImageLightbox({
  images,
  index,
  isOpen,
  onClose,
  onPrev,
  onNext,
  srcBuilder,
}: ImageLightboxProps) {
  if (!isOpen || images.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div
        className="relative mx-4 w-full max-w-5xl"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={srcBuilder(images[index].s3Key)}
          alt={`Screenshot ${index + 1}`}
          className="max-h-[85vh] w-full object-contain"
        />

        <button
          onClick={onClose}
          className="absolute right-2 top-2 rounded-full bg-slate-900/70 px-3 py-1 text-slate-200 hover:bg-slate-900"
          aria-label="Close"
        >
          x
        </button>

        {images.length > 1 && (
          <>
            <button
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/70 px-3 py-1 text-slate-200 hover:bg-slate-900"
              aria-label="Previous"
              onClick={onPrev}
            >
              ‹
            </button>
            <button
              onClick={onNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/70 px-3 py-1 text-slate-200 hover:bg-slate-900"
              aria-label="Next"
            >
              ›
            </button>
            <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/70 px-3 py-1 text-xs text-slate-200">
              {index + 1} / {images.length}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
