import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface InventoryItem {
  codigo: string;
  material: string;
  unidade: string;
  quantidade: number;
  minimo: number;
  maximo: number;
  preco: number;
  valorTotal: number;
  status: string;
  curva: string;
}

interface InventoryTableProps {
  items: InventoryItem[];
}

export const InventoryTable = ({ items }: InventoryTableProps) => {
  const getStatusVariant = (status: string) => {
    if (status.includes("Zerado")) return "danger" as const;
    if (status.includes("Abaixo")) return "warning" as const;
    return "success" as const;
  };

  return (
    <div className="rounded-lg border border-border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border">
            <TableHead className="font-semibold">Código</TableHead>
            <TableHead className="font-semibold">Material</TableHead>
            <TableHead className="font-semibold">Unidade</TableHead>
            <TableHead className="font-semibold">Quantidade</TableHead>
            <TableHead className="font-semibold">Mínimo</TableHead>
            <TableHead className="font-semibold">Máximo</TableHead>
            <TableHead className="font-semibold">Preço (R$)</TableHead>
            <TableHead className="font-semibold">Valor Total (R$)</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const statusVariant = getStatusVariant(item.status);
            
            return (
              <TableRow key={item.codigo} className="hover:bg-muted/50 border-border">
                <TableCell className="font-medium">{item.codigo}</TableCell>
                <TableCell>{item.material}</TableCell>
                <TableCell className="text-muted-foreground">{item.unidade}</TableCell>
                <TableCell className="font-semibold">{item.quantidade}</TableCell>
                <TableCell className="text-muted-foreground">{item.minimo}</TableCell>
                <TableCell className="text-muted-foreground">{item.maximo}</TableCell>
                <TableCell>R$ {item.preco.toFixed(2)}</TableCell>
                <TableCell className="font-semibold">R$ {item.valorTotal.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge 
                    className={`
                      ${statusVariant === 'danger' ? 'bg-danger text-danger-foreground hover:bg-danger/90' : ''}
                      ${statusVariant === 'warning' ? 'bg-warning text-warning-foreground hover:bg-warning/90' : ''}
                      ${statusVariant === 'success' ? 'bg-success text-success-foreground hover:bg-success/90' : ''}
                    `}
                  >
                    {item.status}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
