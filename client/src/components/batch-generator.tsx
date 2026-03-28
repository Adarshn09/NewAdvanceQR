import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Download, Upload, Package, CheckCircle } from "lucide-react";

const batchSchema = z.object({
  urlList: z.string().min(1, "Please enter at least one URL"),
  category: z.string().default("general"),
  foregroundColor: z.string().default("#000000"),
  backgroundColor: z.string().default("#ffffff"),
  size: z.number().default(400),
  errorCorrection: z.string().default("medium"),
  hasRedirect: z.boolean().default(true),
});

type BatchFormData = z.infer<typeof batchSchema>;

export default function BatchGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedCodes, setGeneratedCodes] = useState<any[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<BatchFormData>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      urlList: "",
      category: "general",
      foregroundColor: "#000000",
      backgroundColor: "#ffffff",
      size: 400,
      errorCorrection: "medium",
      hasRedirect: true,
    },
  });

  const batchGenerateMutation = useMutation({
    mutationFn: async (data: BatchFormData) => {
      const urls = data.urlList.split('\n').filter(url => url.trim());
      const results = [];
      
      setIsGenerating(true);
      setProgress(0);
      setGeneratedCodes([]);

      for (let i = 0; i < urls.length; i++) {
        const url = urls[i].trim();
        if (!url) continue;

        try {
          const qrData = {
            originalInput: url,
            targetUrl: url,
            inputType: "url",
            category: data.category,
            foregroundColor: data.foregroundColor,
            backgroundColor: data.backgroundColor,
            size: data.size,
            errorCorrection: data.errorCorrection,
            hasRedirect: data.hasRedirect,
            style: "square",
            margin: 2,
          };

          const response = await apiRequest("POST", "/api/qr-codes", qrData);
          const qrCode = await response.json();
          results.push(qrCode);
          
          setProgress(((i + 1) / urls.length) * 100);
          setGeneratedCodes(prev => [...prev, qrCode]);
          
          // Small delay to prevent overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Failed to generate QR code for ${url}:`, error);
          toast({
            title: "Error",
            description: `Failed to generate QR code for: ${url}`,
            variant: "destructive",
          });
        }
      }

      setIsGenerating(false);
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["/api/qr-codes"] });
      toast({
        title: "Batch Generation Complete",
        description: `Successfully generated ${results.length} QR codes`,
      });
    },
    onError: () => {
      setIsGenerating(false);
      toast({
        title: "Error",
        description: "Failed to complete batch generation",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BatchFormData) => {
    const urls = data.urlList.split('\n').filter(url => url.trim());
    if (urls.length === 0) {
      toast({
        title: "Error",
        description: "Please enter at least one URL",
        variant: "destructive",
      });
      return;
    }

    if (urls.length > 100) {
      toast({
        title: "Error",
        description: "Maximum 100 URLs allowed per batch",
        variant: "destructive",
      });
      return;
    }

    batchGenerateMutation.mutate(data);
  };

  const downloadAllQrCodes = () => {
    generatedCodes.forEach((qrCode, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = `/api/qr-codes/${qrCode.id}/image`;
        link.download = `qr-code-${qrCode.shortCode}.png`;
        link.click();
      }, index * 500); // Stagger downloads
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Batch QR Generator</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* URL List */}
              <FormField
                control={form.control}
                name="urlList"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URLs (one per line)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="https://example.com&#10;https://google.com&#10;https://github.com"
                        rows={8}
                        className="resize-none font-mono text-sm"
                        data-testid="input-url-list"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-sm text-gray-500">Enter up to 100 URLs, one per line</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Batch Settings */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-batch-category">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="social">Social</SelectItem>
                          <SelectItem value="events">Events</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="size"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Size</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger data-testid="select-batch-size">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="200">Small (200px)</SelectItem>
                          <SelectItem value="400">Medium (400px)</SelectItem>
                          <SelectItem value="600">Large (600px)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="foregroundColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Color</FormLabel>
                      <FormControl>
                        <input
                          type="color"
                          className="w-full h-9 rounded border border-gray-300 cursor-pointer"
                          data-testid="input-batch-color"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="errorCorrection"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Error Correction</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-batch-error-correction">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              {/* Generate Button */}
              <Button 
                type="submit" 
                className="w-full"
                disabled={isGenerating}
                data-testid="button-batch-generate"
              >
                {isGenerating ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-spin" />
                    Generating... ({Math.round(progress)}%)
                  </>
                ) : (
                  <>
                    <Package className="mr-2 h-4 w-4" />
                    Generate Batch QR Codes
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Progress */}
      {isGenerating && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Generating QR Codes...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-gray-500">{generatedCodes.length} codes generated</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {generatedCodes.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Generated QR Codes ({generatedCodes.length})</span>
              </CardTitle>
              <Button onClick={downloadAllQrCodes} size="sm" data-testid="button-download-all">
                <Download className="h-4 w-4 mr-2" />
                Download All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {generatedCodes.map((qrCode) => (
                <div key={qrCode.id} className="text-center space-y-2">
                  <img
                    src={`/api/qr-codes/${qrCode.id}/image`}
                    alt={`QR Code for ${qrCode.shortCode}`}
                    className="w-full aspect-square border rounded"
                    data-testid={`qr-image-${qrCode.id}`}
                  />
                  <p className="text-xs font-mono text-gray-600">{qrCode.shortCode}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}