import { ReactNode } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useFitnessTheme } from '@/hooks/useFitnessTheme';

export function FitnessPopup({ open, onOpenChange, title, children }: {
  open: boolean; onOpenChange: (open: boolean) => void; title: string; children: ReactNode;
}) {
  const { isLight, isNeon } = useFitnessTheme();
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent aria-describedby={undefined} className={`fitness-theme fitness-popup ${isLight ? 'fitness-light' : isNeon ? 'fitness-neon' : ''} w-[calc(100%_-_24px)] max-w-md max-h-[90dvh] overflow-y-auto rounded-lg p-4 text-foreground`}>
      <DialogTitle className="pr-8 leading-snug tracking-normal">{title}</DialogTitle>
      {children}
    </DialogContent>
  </Dialog>;
}