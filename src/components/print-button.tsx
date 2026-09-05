"use client";

export default function PrintButton({ label = "طباعة" }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="mx-auto mt-4 block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white print:hidden"
    >
      {label}
    </button>
  );
}
