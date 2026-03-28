import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateQrCodeSchema, type QrCode } from "@shared/schema";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

type FormData = z.infer<typeof updateQrCodeSchema>;

interface EditQrModalProps {
  qrCode: QrCode;
  onClose: () => void;
}

export default function EditQrModal({ qrCode, onClose }: EditQrModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(updateQrCodeSchema),
    defaultValues: {
      id: qrCode.id,
      content: qrCode.content,
    },
  });

  const updateQrCodeMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("PATCH", `/api/qr-codes/${data.id}`, {
        content: data.content,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qr-codes"] });
      toast({
        title: "QR Code Updated",
        description: "The link has been updated successfully! The same QR code now points to the new destination.",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update QR code. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    updateQrCodeMutation.mutate(data);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="modal-edit-qr">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle className="text-lg font-semibold">Edit QR Code Link</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              data-testid="button-close-modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <FormLabel className="block text-sm font-medium text-gray-700 mb-2">Short Code</FormLabel>
              <Input
                type="text"
                value={qrCode.shortCode}
                disabled
                className="bg-gray-50 text-gray-500"
                data-testid="input-short-code"
              />
              <p className="text-xs text-muted-foreground mt-1">
                The QR code image stays the same — only the destination changes.
              </p>
            </div>

            <div>
              <FormLabel className="block text-sm font-medium text-gray-700 mb-2">Current Content</FormLabel>
              <Input
                type="text"
                value={qrCode.content}
                disabled
                className="bg-gray-50 text-gray-500"
                data-testid="input-current-content"
              />
            </div>

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Content / URL</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder={
                        qrCode.type === "url" ? "https://example.com" :
                        qrCode.type === "email" ? "user@example.com" :
                        qrCode.type === "phone" ? "+1234567890" :
                        "Enter new content..."
                      }
                      data-testid="input-new-content"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateQrCodeMutation.isPending}
                data-testid="button-save"
              >
                {updateQrCodeMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
