import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { QrCode, Palette, BarChart3, Download, Smartphone, History, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const { user, isLoading } = useAuth();

  // Redirect to dashboard if already logged in
  if (user) {
    return <Redirect to="/dashboard" />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <QrCode className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">QR Generator Pro</span>
          </div>
          
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <Link href="/about">
              <a className="text-muted-foreground hover:text-foreground transition-colors">About</a>
            </Link>
          </nav>
          
          <Link href="/auth">
            <Button data-testid="button-signin">Sign In</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-5xl font-bold mb-6 leading-tight">
              Generate Professional 
              <span className="text-primary block">QR Codes</span>
              in Seconds
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Create high-quality QR codes for URLs, text, contact info, WiFi credentials, and more. 
              Professional tools with customization options and analytics tracking.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth">
                <Button size="lg" className="text-lg px-8 py-4" data-testid="button-get-started">
                  Get Started Free
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="text-lg px-8 py-4" data-testid="button-learn-more">
                View Demo
              </Button>
            </div>
          </div>
          
          {/* Hero QR Code Visual */}
          <div className="mt-16">
            <div className="bg-card rounded-xl shadow-lg p-8 max-w-4xl mx-auto border">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <h3 className="text-2xl font-semibold">Generate Any Type</h3>
                  <ul className="space-y-2 text-left">
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-accent rounded-full mr-3"></div>
                      Website URLs
                    </li>
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-accent rounded-full mr-3"></div>
                      Contact Information
                    </li>
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-accent rounded-full mr-3"></div>
                      WiFi Credentials
                    </li>
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-accent rounded-full mr-3"></div>
                      Plain Text
                    </li>
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-accent rounded-full mr-3"></div>
                      Social Media
                    </li>
                  </ul>
                </div>
                <div className="flex justify-center">
                  <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border">
                    <div className="text-center">
                      <QrCode className="w-16 h-16 text-muted-foreground mb-2 mx-auto" />
                      <p className="text-muted-foreground">Sample QR Code</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Powerful QR Generation Features</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to create, customize, and track professional QR codes for your business or personal use.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Palette className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Custom Styling</h3>
              <p className="text-muted-foreground">Customize colors, add logos, and style your QR codes to match your brand identity.</p>
            </div>
            
            <div className="bg-card rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Analytics Tracking</h3>
              <p className="text-muted-foreground">Track scans, locations, and usage statistics for all your generated QR codes.</p>
            </div>
            
            <div className="bg-card rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                <Download className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Multiple Formats</h3>
              <p className="text-muted-foreground">Export your QR codes in PNG, SVG, PDF formats with various resolutions.</p>
            </div>
            
            <div className="bg-card rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Smartphone className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Mobile Optimized</h3>
              <p className="text-muted-foreground">Generate and manage QR codes on any device with our responsive interface.</p>
            </div>
            
            <div className="bg-card rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <History className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Code History</h3>
              <p className="text-muted-foreground">Access your previously generated QR codes and regenerate them anytime.</p>
            </div>
            
            <div className="bg-card rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Secure & Private</h3>
              <p className="text-muted-foreground">Your data is encrypted and secure. We never store sensitive information.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="bg-gradient-to-r from-primary to-accent rounded-2xl p-12 text-white max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-6">Ready to Start Generating?</h2>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of users who trust QR Generator Pro for their QR code needs.
            </p>
            <Link href="/auth">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-4" data-testid="button-signup-cta">
                Sign In to Get Started
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/50 py-12 border-t">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <QrCode className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">QR Generator Pro</span>
              </div>
              <p className="text-muted-foreground">
                Professional QR code generation with advanced customization and analytics.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">API</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Status</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <Link href="/about">
                    <a className="hover:text-foreground transition-colors">About</a>
                  </Link>
                </li>
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 QR Generator Pro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
