import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  current: number;
  minimum: number;
  maximum: number;
  unit: string;
}

interface InventoryTableProps {
  items: InventoryItem[];
}

export const InventoryTable = ({ items }: InventoryTableProps) => {
  const getStatus = (current: number, minimum: number, maximum: number) => {
    const percentage = (current / maximum) * 100;
    if (current <= minimum) return { label: "Crítico", variant: "danger" as const, color: "danger" };
    if (percentage <= 30) return { label: "Atenção", variant: "warning" as const, color: "warning" };
    return { label: "Normal", variant: "success" as const, color: "success" };
  };

  const getProgressValue = (current: number, maximum: number) => {
    return Math.min((current / maximum) * 100, 100);
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border">
            <TableHead className="font-semibold">Item</TableHead>
            <TableHead className="font-semibold">Categoria</TableHead>
            <TableHead className="font-semibold">Quantidade</TableHead>
            <TableHead className="font-semibold">Estoque</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const status = getStatus(item.current, item.minimum, item.maximum);
            const progressValue = getProgressValue(item.current, item.maximum);
            
            return (
              <TableRow key={item.id} className="hover:bg-muted/50 border-border">
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-muted-foreground">{item.category}</TableCell>
                <TableCell>
                  <span className="font-semibold">{item.current}</span>
                  <span className="text-muted-foreground text-sm"> {item.unit}</span>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Progress 
                      value={progressValue} 
                      className={`h-2 ${
                        status.variant === 'danger' ? 'bg-danger-light' : 
                        status.variant === 'warning' ? 'bg-warning-light' : 
                        'bg-success-light'
                      }`} 
                    />
                    <p className="text-xs text-muted-foreground">
                      Min: {item.minimum} / Max: {item.maximum}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    className={`
                      ${status.variant === 'danger' ? 'bg-danger text-danger-foreground hover:bg-danger/90' : ''}
                      ${status.variant === 'warning' ? 'bg-warning text-warning-foreground hover:bg-warning/90' : ''}
                      ${status.variant === 'success' ? 'bg-success text-success-foreground hover:bg-success/90' : ''}
                    `}
                  >
                    {status.label}
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
