// Simple toast implementation — replace with a library (e.g. sonner) if needed.
// Appends a toast div to document.body, removes after 4 seconds.
export function showToast(message: string): void {
  const el = document.createElement('div')
  el.textContent = message
  el.style.cssText = [
    'position:fixed', 'bottom:1.5rem', 'left:50%', 'transform:translateX(-50%)',
    'background:#1e293b', 'color:#fff', 'padding:0.75rem 1.25rem',
    'border-radius:0.5rem', 'font-size:0.875rem', 'z-index:9999',
    'max-width:calc(100vw - 2rem)', 'text-align:center',
    'box-shadow:0 4px 12px rgba(0,0,0,0.3)',
  ].join(';')
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 4000)
}
