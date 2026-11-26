import { ReactNode } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useFitnessTheme } from '@/hooks/useFitnessTheme';

export function FitnessPopup({ open, onOpenChange, title, children, workout }: {
  open: boolean; onOpenChange: (open: boolean) => void; title: string; children: ReactNode;
  /** Usa a paleta fixa da tela de treino em vez do tema escolhido */
  workout?: boolean;
}) {
  const { isLight, isNeon } = useFitnessTheme();
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent aria-describedby={undefined} className={`fitness-theme fitness-popup ${workout ? 'fitness-workout space-y-3' : isLight ? 'fitness-light' : isNeon ? 'fitness-neon' : ''} w-[calc(100%_-_24px)] max-w-md max-h-[90dvh] overflow-y-auto rounded-lg p-4 text-foreground`}>
      <DialogTitle className="pr-8 leading-snug tracking-normal">{title}</DialogTitle>
      {children}
    </DialogContent>
  </Dialog>;
}