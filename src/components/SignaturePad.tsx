import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser } from 'lucide-react';

export interface SignaturePadHandle {
  toDataURL: () => string | null;
  isEmpty: () => boolean;
  clear: () => void;
}

interface Props {
  height?: number;
  className?: string;
  disabled?: boolean;
}

/**
 * Simple canvas-based signature pad — works with mouse, touch and stylus.
 */
export const SignaturePad = forwardRef<SignaturePadHandle, Props>(
  ({ height = 160, className, disabled }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const drawing = useRef(false);
    const [hasStroke, setHasStroke] = useState(false);

    const getCtx = () => canvasRef.current?.getContext('2d') || null;

    const resize = () => {
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap) return;
      const dpr = window.devicePixelRatio || 1;
      const width = wrap.clientWidth;
      const dataUrl = hasStroke ? canvas.toDataURL('image/png') : null;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = getCtx();
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#111';
      }
      if (dataUrl) {
        const img = new Image();
        img.onload = () => ctx?.drawImage(img, 0, 0, width, height);
        img.src = dataUrl;
      }
    };

    useEffect(() => {
      resize();
      const onR = () => resize();
      window.addEventListener('resize', onR);
      return () => window.removeEventListener('resize', onR);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const pointerPos = (e: PointerEvent | React.PointerEvent) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      return { x: (e as any).clientX - rect.left, y: (e as any).clientY - rect.top };
    };

    const onDown = (e: React.PointerEvent) => {
      if (disabled) return;
      e.preventDefault();
      canvasRef.current?.setPointerCapture(e.pointerId);
      drawing.current = true;
      const ctx = getCtx();
      const { x, y } = pointerPos(e);
      ctx?.beginPath();
      ctx?.moveTo(x, y);
    };

    const onMove = (e: React.PointerEvent) => {
      if (!drawing.current) return;
      e.preventDefault();
      const ctx = getCtx();
      const { x, y } = pointerPos(e);
      ctx?.lineTo(x, y);
      ctx?.stroke();
      if (!hasStroke) setHasStroke(true);
    };

    const onUp = (e: React.PointerEvent) => {
      drawing.current = false;
      try { canvasRef.current?.releasePointerCapture(e.pointerId); } catch { /* noop */ }
    };

    const clear = () => {
      const canvas = canvasRef.current;
      const ctx = getCtx();
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasStroke(false);
    };

    useImperativeHandle(ref, () => ({
      toDataURL: () => (hasStroke ? canvasRef.current?.toDataURL('image/png') || null : null),
      isEmpty: () => !hasStroke,
      clear,
    }));

    return (
      <div className={className}>
        <div ref={wrapRef} className="relative w-full rounded-lg border-2 border-dashed bg-background">
          <canvas
            ref={canvasRef}
            className="touch-none rounded-lg w-full"
            style={{ height }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerLeave={onUp}
            onPointerCancel={onUp}
          />
          {!hasStroke && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
              Assine aqui (mouse, dedo ou caneta)
            </div>
          )}
        </div>
        <div className="mt-2 flex justify-end">
          <Button type="button" size="sm" variant="ghost" onClick={clear} disabled={disabled}>
            <Eraser className="w-3.5 h-3.5 mr-1" /> Limpar
          </Button>
        </div>
      </div>
    );
  },
);

SignaturePad.displayName = 'SignaturePad';
