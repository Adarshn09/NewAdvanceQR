import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QrTemplate } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Palette, Users, Calendar, Briefcase, Star, Plus } from "lucide-react";

interface QrTemplatesProps {
  onTemplateSelect: (template: QrTemplate) => void;
}

export default function QrTemplates({ onTemplateSelect }: QrTemplatesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery<QrTemplate[]>({
    queryKey: ["/api/templates"],
  });

  const useTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      await apiRequest("POST", `/api/templates/${templateId}/use`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
    },
  });

  const categories = [
    { id: "all", label: "All Templates", icon: Star },
    { id: "business", label: "Business", icon: Briefcase },
    { id: "social", label: "Social Media", icon: Users },
    { id: "events", label: "Events", icon: Calendar },
    { id: "general", label: "General", icon: Palette },
  ];

  const filteredTemplates = selectedCategory === "all" 
    ? templates 
    : templates.filter(template => template.category === selectedCategory);

  const handleUseTemplate = (template: QrTemplate) => {
    useTemplateMutation.mutate(template.id);
    onTemplateSelect(template);
    toast({
      title: "Template Applied",
      description: `Using "${template.name}" template`,
    });
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      business: "bg-blue-100 text-blue-800",
      social: "bg-purple-100 text-purple-800",
      events: "bg-green-100 text-green-800",
      general: "bg-gray-100 text-gray-800",
    };
    return colors[category] || colors.general;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading templates...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Palette className="h-5 w-5" />
          <span>QR Templates</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="text-xs"
                data-testid={`category-${category.id}`}
              >
                <Icon className="h-3 w-3 mr-1" />
                {category.label}
              </Button>
            );
          })}
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="border-2 hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="font-semibold text-sm">{template.name}</h4>
                      <p className="text-xs text-gray-600">{template.description}</p>
                    </div>
                    <Badge className={getCategoryColor(template.category)} data-testid={`template-category-${template.id}`}>
                      {template.category}
                    </Badge>
                  </div>

                  {/* Template Preview */}
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-12 h-12 rounded border-2 flex items-center justify-center text-xs font-mono"
                      style={{
                        backgroundColor: template.backgroundColor,
                        borderColor: template.foregroundColor,
                        color: template.foregroundColor,
                      }}
                    >
                      QR
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="text-gray-500">Style:</span>
                        <Badge variant="outline" className="text-xs">{template.style}</Badge>
                      </div>
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="text-gray-500">Size:</span>
                        <span>{template.size}px</span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="text-gray-500">Used:</span>
                        <span>{template.useCount} times</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleUseTemplate(template)}
                    disabled={useTemplateMutation.isPending}
                    data-testid={`use-template-${template.id}`}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Use Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Palette className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No templates found in this category</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}