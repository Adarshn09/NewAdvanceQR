import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { QrCode, Zap, Shield, BarChart3, Download, Users } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center items-center gap-3 mb-4">
            <QrCode className="h-12 w-12 text-blue-600 dark:text-blue-400" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">QR Code Generator</h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Create, customize, and track professional QR codes with advanced analytics and management features.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Fast Generation
              </CardTitle>
              <CardDescription>
                Generate QR codes instantly with multiple content types including URLs, text, email, phone, SMS, WiFi, and vCard.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-500" />
                Secure & Private
              </CardTitle>
              <CardDescription>
                Your data is securely stored with encrypted authentication and private user accounts. No data sharing with third parties.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                Advanced Analytics
              </CardTitle>
              <CardDescription>
                Track scan counts, monitor performance, and analyze usage patterns with comprehensive analytics dashboard.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-purple-500" />
                Easy Management
              </CardTitle>
              <CardDescription>
                Download, edit, and organize your QR codes from a centralized management interface with search and filtering.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-indigo-500" />
                Custom Styling
              </CardTitle>
              <CardDescription>
                Personalize your QR codes with custom colors, logos, sizes, and styles to match your brand identity.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-pink-500" />
                User Friendly
              </CardTitle>
              <CardDescription>
                Intuitive interface designed for both beginners and professionals with persistent storage and easy sharing.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* How It Works */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl text-center">How It Works</CardTitle>
            <CardDescription className="text-center">
              Generate professional QR codes in three simple steps
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">1</span>
                </div>
                <h3 className="font-semibold mb-2">Choose Content Type</h3>
                <p className="text-gray-600 dark:text-gray-300">Select from URL, text, email, phone, SMS, WiFi, or vCard formats.</p>
              </div>
              <div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-green-600 dark:text-green-400">2</span>
                </div>
                <h3 className="font-semibold mb-2">Customize Design</h3>
                <p className="text-gray-600 dark:text-gray-300">Apply custom colors, add logos, and choose styling options.</p>
              </div>
              <div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-purple-600 dark:text-purple-400">3</span>
                </div>
                <h3 className="font-semibold mb-2">Generate & Track</h3>
                <p className="text-gray-600 dark:text-gray-300">Download your QR code and monitor its performance with analytics.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Developers Section */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Meet the Developers</CardTitle>
            <CardDescription className="text-center">
              Built with passion by our dedicated development team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold text-xl">AN</span>
                </div>
                <h3 className="font-semibold text-lg">Adarsh Naik</h3>
                <p className="text-muted-foreground">Full Stack Developer</p>
              </div>
              {/* <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold text-xl">AM</span>
                </div>
                <h3 className="font-semibold text-lg">Amogha M R</h3>
                <p className="text-muted-foreground">Full Stack Developer</p>
              </div> */}
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="inline-block p-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0">
            <CardContent className="space-y-4">
              <h2 className="text-2xl font-bold">Ready to get started?</h2>
              <p className="text-blue-100">
                Create your first QR code in seconds and start tracking its performance.
              </p>
              <div className="flex gap-4 justify-center">
                <Link href="/auth">
                  <Button size="lg" variant="secondary" data-testid="button-get-started">
                    Get Started Free
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button size="lg" variant="outline" className="text-blue-100 border-blue-200 hover:bg-blue-100 hover:text-blue-700" data-testid="button-dashboard">
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}