import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit } from "lucide-react";
import { InventoryItem } from "@/hooks/useInventoryData";

interface InventoryTableProps {
  items: InventoryItem[];
  onEdit?: (item: InventoryItem) => void;
  showEditButton?: boolean;
}

export const InventoryTable = ({ items, onEdit, showEditButton = false }: InventoryTableProps) => {
  const getStatusVariant = (status: string) => {
    if (status.includes("Zerado")) return "destructive" as const;
    if (status.includes("Abaixo")) return "warning" as const;
    return "default" as const;
  };

  return (
    <div className="rounded-lg border border-border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border">
            <TableHead>Código</TableHead>
            <TableHead>Material</TableHead>
            <TableHead>Unidade</TableHead>
            <TableHead>Localização</TableHead>
            <TableHead>Validade</TableHead>
            <TableHead className="text-right">Quantidade</TableHead>
            <TableHead className="text-right">Valor Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Curva</TableHead>
            {showEditButton && <TableHead className="text-right">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.codigo} className="hover:bg-muted/50 border-border">
              <TableCell className="font-medium">{item.codigo}</TableCell>
              <TableCell className="max-w-xs truncate">{item.material}</TableCell>
              <TableCell>{item.unidade}</TableCell>
              <TableCell>{item.localizacao || '-'}</TableCell>
              <TableCell>{item.validade || '-'}</TableCell>
              <TableCell className="text-right font-semibold">{item.quantidade}</TableCell>
              <TableCell className="text-right">
                R$ {item.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(item.status)}>
                  {item.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{item.curva}</Badge>
              </TableCell>
              {showEditButton && (
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit?.(item)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
