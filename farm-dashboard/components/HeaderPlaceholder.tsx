export function HeaderPlaceholder() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-sage-800 bg-sage-700 shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-1.5 sm:px-5 lg:px-6">
        <h1 className="shrink-0 text-sm font-bold text-white sm:text-base">GreenLeaf CEA</h1>
        <p className="truncate text-xs text-sage-100">Loading farm summary…</p>
      </div>
    </header>
  );
}
