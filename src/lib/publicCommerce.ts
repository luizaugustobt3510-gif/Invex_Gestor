export const ROTINA_MONTHLY_CENTS = 2590;
export const ROTINA_ANNUAL_CENTS = 25900;
export const SELLER_NAME = 'Invex Gestor';
export const SUPPORT_URL = 'https://wa.me/5531973442958';
export const PADDLE_BUYER_TERMS = 'https://www.paddle.com/legal/checkout-buyer-terms';
export const PADDLE_REFUND_POLICY = 'https://www.paddle.com/legal/refund-policy';
export const publicCommerceLinks = [
  { to: '/precos', label: 'Preços' },
  { to: '/termos', label: 'Termos de uso' },
  { to: '/privacidade', label: 'Privacidade' },
  { to: '/reembolso', label: 'Reembolso' },
];

export function formatBRL(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}