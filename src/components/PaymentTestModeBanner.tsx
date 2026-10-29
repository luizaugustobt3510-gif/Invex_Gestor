import { getPaddleEnvironment } from "@/lib/paddle";

export function PaymentTestModeBanner() {
  if (getPaddleEnvironment() !== "sandbox") return null;
  return (
    <div className="w-full bg-accent border-b border-border px-4 py-2 text-center text-sm text-accent-foreground">
      Pagamentos no preview estão em modo de teste (sem cobrança real).{" "}
      <a href="https://docs.lovable.dev/features/payments#test-and-live-environments" target="_blank" rel="noopener noreferrer" className="underline font-medium">
        Saiba mais
      </a>
    </div>
  );
}
