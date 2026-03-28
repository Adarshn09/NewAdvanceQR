import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, MoreHorizontal, Eye, Download, Trash2, QrCode as QrCodeIcon, Loader2, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { QrCode } from "@shared/schema";
import { format } from "date-fns";
import EditQrModal from "./edit-qr-modal";

export default function QrManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingQr, setEditingQr] = useState<QrCode | null>(null);
  const { toast } = useToast();

  // Fetch user's QR codes
  const { data: qrCodes = [], isLoading, error } = useQuery<QrCode[]>({
    queryKey: ["/api/qr-codes"],
  });

  // Delete QR code mutation
  const deleteQrMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/qr-codes/${id}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qr-codes"] });
      toast({
        title: "QR Code deleted",
        description: "QR code has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter QR codes based on search term
  const filteredQrCodes = qrCodes.filter((qr) =>
    qr.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    qr.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownload = (qrCode: QrCode) => {
    const link = document.createElement('a');
    link.href = `/api/qr-codes/${qrCode.id}/image`;
    link.download = `qr-code-${qrCode.shortCode}.png`;
    link.click();
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this QR code?")) {
      deleteQrMutation.mutate(id);
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-muted-foreground">Failed to load QR codes</p>
            <Button 
              variant="outline" 
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/qr-codes"] })}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manage QR Codes</h1>
          <p className="text-muted-foreground">View and manage all your generated QR codes</p>
        </div>
        <Button data-testid="button-new-qr">
          <QrCodeIcon className="w-4 h-4 mr-2" />
          New QR Code
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search QR codes..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search"
              />
            </div>
            <Button variant="outline" data-testid="button-filter">
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* QR Codes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your QR Codes</CardTitle>
          <CardDescription>
            {filteredQrCodes.length} of {qrCodes.length} QR codes
            {searchTerm && ` matching "${searchTerm}"`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>QR Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Scans</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading QR codes...</p>
                  </TableCell>
                </TableRow>
              ) : filteredQrCodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <QrCodeIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {searchTerm ? "No QR codes found matching your search" : "No QR codes created yet"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredQrCodes.map((qr) => {
                  const title = qr.type === 'url' ? 'Website Link' :
                               qr.type === 'email' ? 'Email Address' :
                               qr.type === 'phone' ? 'Phone Number' :
                               qr.type === 'sms' ? 'SMS Message' :
                               qr.type === 'wifi' ? 'WiFi Network' :
                               qr.type === 'vcard' ? 'Contact Card' :
                               'Text Content';
                  
                  return (
                    <TableRow key={qr.id} data-testid={`row-qr-${qr.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-muted rounded border flex items-center justify-center">
                            <QrCodeIcon className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{title}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {qr.content}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">{qr.type}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{qr.clickCount || 0}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {qr.createdAt ? format(new Date(qr.createdAt), 'MMM d, yyyy') : 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">Active</Badge>
                      </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                data-testid={`button-actions-${qr.id}`}
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => window.open(`/api/qr-codes/${qr.id}/image`, '_blank')}>
                                <Eye className="w-4 h-4 mr-2" />
                                View QR Code
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownload(qr)}>
                                <Download className="w-4 h-4 mr-2" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditingQr(qr)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit Link
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleDelete(qr.id)}
                                disabled={deleteQrMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit QR Modal */}
      {editingQr && (
        <EditQrModal
          qrCode={editingQr}
          onClose={() => setEditingQr(null)}
        />
      )}
    </div>
  );
}
