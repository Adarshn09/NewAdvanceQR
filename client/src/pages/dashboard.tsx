import { useState } from "react";
import { Link, useLocation } from "wouter";
import { QrCode, Menu, LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import QrGenerator from "@/components/qr-generator";
import QrManagement from "@/components/qr-management";
import AnalyticsDashboard from "@/components/analytics-dashboard";

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return hash || 'generator';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const tabs = [
    { id: 'generator', label: 'Generator', icon: QrCode },
    { id: 'manage', label: 'Manage', icon: Menu },
    { id: 'analytics', label: 'Analytics', icon: QrCode },
  ];

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'generator':
        return <QrGenerator />;
      case 'manage':
        return <QrManagement />;
      case 'analytics':
        return <AnalyticsDashboard />;
      default:
        return <QrGenerator />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* SEO Hero Section - Visible content for search engines */}
      <section className="sr-only">
        <h1>Free QR Code Generator - Create Custom QR Codes Online</h1>
        <p>Generate professional QR codes for URLs, text, contact cards, Wi-Fi login, email, phone numbers, and SMS messages. Advanced customization options, batch generation, analytics tracking, and instant download. Start creating QR codes for free today.</p>
      </section>
      
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <QrCode className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">QR Generator Pro</span>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`transition-colors ${
                    activeTab === tab.id
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid={`nav-${tab.id}`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span data-testid="text-username">{user?.username}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="hidden md:flex items-center space-x-2"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
                <span>{logoutMutation.isPending ? "Logging out..." : "Logout"}</span>
              </Button>
              <button 
                className="md:hidden text-muted-foreground hover:text-foreground" 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                data-testid="mobile-menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t bg-background/95 backdrop-blur">
            <div className="container mx-auto px-4 pt-2 pb-3 space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2 transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                    data-testid={`mobile-nav-${tab.id}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
              <div className="border-t pt-3 mt-3">
                <div className="flex items-center px-3 py-2 text-muted-foreground">
                  <User className="h-4 w-4 mr-2" />
                  <span data-testid="text-mobile-username">{user?.username}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                  className="w-full mt-2 flex items-center justify-center space-x-2"
                  data-testid="button-mobile-logout"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{logoutMutation.isPending ? "Logging out..." : "Logout"}</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Navigation Tabs */}
      <nav className="border-b">
        <div className="container mx-auto px-4">
          <div className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                  }`}
                  data-testid={`tab-${tab.id}`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {renderActiveComponent()}
      </main>

      {/* Footer */}
      <footer className="bg-muted/50 border-t mt-12">
        <div className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold text-foreground mb-3">QR Generator Pro</h3>
              <p className="text-sm text-muted-foreground">
                Create professional QR codes instantly with our advanced generator. Support for URLs, contact cards, Wi-Fi credentials, email, phone, and SMS with customization options.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">QR Code Types</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• URL & Website Links</li>
                <li>• Contact Card (vCard)</li>
                <li>• Wi-Fi Network Login</li>
                <li>• Email with Pre-filled Content</li>
                <li>• Phone Numbers for Direct Calling</li>
                <li>• SMS Messages</li>
                <li>• Plain Text & Custom Content</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">Features</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Custom Colors & Styling</li>
                <li>• High-Resolution Downloads</li>
                <li>• Batch QR Code Generation</li>
                <li>• Analytics & Click Tracking</li>
                <li>• Short URL Redirection</li>
                <li>• Template Library</li>
                <li>• Mobile-Responsive Design</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center">
            <p className="text-sm text-muted-foreground">
              © 2024 QR Generator Pro. Professional QR code generator for personal and commercial use.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
