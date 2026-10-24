import { toast } from './overlay'

/** Aviso breve. Se pinta en <OverlayHost />. */
export function showToast(message: string): void {
  toast(message)
}
