import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useInventoryData, InventoryItem } from '@/hooks/useInventoryData';
import { QrCode, Download, Search, Printer } from 'lucide-react';
import QRCode from 'qrcode';

const GerarQRCode = () => {
  const { data: inventoryData, loading } = useInventoryData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<InventoryItem[]>([]);
  const [qrImages, setQrImages] = useState<Map<string, string>>(new Map());

  const filteredItems = searchTerm.length >= 1
    ? inventoryData.filter(item =>
        String(item.codigo).toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.material).toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 20)
    : inventoryData.slice(0, 20);

  const generateQR = async (item: InventoryItem) => {
    if (qrImages.has(item.id)) return;
    try {
      const dataUrl = await QRCode.toDataURL(item.id, { width: 256, margin: 2 });
      setQrImages(prev => new Map(prev).set(item.id, dataUrl));
      if (!selectedItems.find(s => s.id === item.id)) {
        setSelectedItems(prev => [...prev, item]);
      }
    } catch { /* ignore */ }
  };

  const downloadQR = async (item: InventoryItem) => {
    await generateQR(item);
    const dataUrl = qrImages.get(item.id);
    if (!dataUrl) {
      const url = await QRCode.toDataURL(item.id, { width: 512, margin: 2 });
      const link = document.createElement('a');
      link.href = url;
      link.download = `qrcode_${item.codigo}.png`;
      link.click();
      return;
    }
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `qrcode_${item.codigo}.png`;
    link.click();
  };

  const printQRCodes = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html><head><title>QR Codes - Invex</title>
      <style>
        body { font-family: sans-serif; padding: 20px; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .item { text-align: center; border: 1px solid #ccc; padding: 15px; border-radius: 8px; page-break-inside: avoid; }
        .item img { width: 150px; height: 150px; }
        .item p { margin: 4px 0; font-size: 12px; }
        .item .code { font-weight: bold; font-family: monospace; font-size: 14px; }
        .item .name { font-size: 13px; }
        @media print { .grid { grid-template-columns: repeat(3, 1fr); } }
      </style></head><body>
      <h2>QR Codes - Invex</h2>
      <div class="grid">
        ${selectedItems.map(item => `
          <div class="item">
            <img src="${qrImages.get(item.id) || ''}" />
            <p class="code">${item.codigo}</p>
            <p class="name">${item.material}</p>
          </div>
        `).join('')}
      </div>
      <script>window.print();</script>
      </body></html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <MainLayout>
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Gerar QR Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar material..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                  <div>
                    <span className="font-mono text-sm">{item.codigo}</span>
                    <span className="mx-2">-</span>
                    <span className="font-medium">{item.material}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => generateQR(item)}>
                      <QrCode className="w-4 h-4 mr-1" /> Gerar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => downloadQR(item)}>
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedItems.length > 0 && (
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">QR Codes Gerados ({selectedItems.length})</h3>
                <Button onClick={printQRCodes} variant="outline" size="sm">
                  <Printer className="w-4 h-4 mr-1" /> Imprimir Todos
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {selectedItems.map(item => (
                  <div key={item.id} className="text-center border rounded-lg p-3">
                    {qrImages.get(item.id) && (
                      <img src={qrImages.get(item.id)} alt={item.codigo} className="w-32 h-32 mx-auto" />
                    )}
                    <p className="font-mono text-sm mt-2">{item.codigo}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.material}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default GerarQRCode;
