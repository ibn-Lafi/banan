"use client";

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center md:items-center">
      <button aria-label="إغلاق" onClick={onClose} className="absolute inset-0 bg-gray-900/40" />
      <div className="relative max-h-[75vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-4 shadow-xl md:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
          >
            ✕
          </button>
          <h2 className="text-base font-bold">{title}</h2>
        </div>
        {children}
      </div>
    </div>
  );
}
