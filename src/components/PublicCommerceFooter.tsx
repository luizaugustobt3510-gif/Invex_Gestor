import { Link } from 'react-router-dom';
import { publicCommerceLinks } from '@/lib/publicCommerce';

export function PublicCommerceFooter() {
  return (
    <footer className="relative z-10 mt-6 w-full text-center text-xs text-muted-foreground">
      <nav aria-label="Políticas e preços" className="flex flex-wrap justify-center gap-x-5 gap-y-1">
        {publicCommerceLinks.map(link => (
          <Link key={link.to} to={link.to} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline focus-visible:underline">{link.label}</Link>
        ))}
      </nav>
    </footer>
  );
}