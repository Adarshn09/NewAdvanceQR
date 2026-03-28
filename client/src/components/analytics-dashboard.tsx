import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Eye, QrCode as QrCodeIcon, Users, Calendar, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { QrCode } from "@shared/schema";
import { format, subDays, isAfter } from "date-fns";

export default function AnalyticsDashboard() {
  // Fetch user's QR codes for analytics
  const { data: qrCodes = [], isLoading, error } = useQuery<QrCode[]>({
    queryKey: ["/api/qr-codes"],
  });

  // Calculate analytics from real data
  const analytics = React.useMemo(() => {
    const totalQrCodes = qrCodes.length;
    const totalScans = qrCodes.reduce((sum, qr) => sum + (qr.clickCount || 0), 0);
    
    // Calculate this month's scans
    const thirtyDaysAgo = subDays(new Date(), 30);
    const thisMonthScans = qrCodes.reduce((sum, qr) => {
      const qrDate = qr.createdAt ? new Date(qr.createdAt) : new Date();
      const isThisMonth = isAfter(qrDate, thirtyDaysAgo);
      return sum + (isThisMonth ? (qr.clickCount || 0) : 0);
    }, 0);

    // Calculate weekly stats for trend
    const sevenDaysAgo = subDays(new Date(), 7);
    const weeklyQrCodes = qrCodes.filter(qr => {
      const qrDate = qr.createdAt ? new Date(qr.createdAt) : new Date();
      return isAfter(qrDate, sevenDaysAgo);
    }).length;

    // Calculate unique scanners approximation (unique click events)
    const activeCodes = qrCodes.filter(qr => (qr.clickCount || 0) > 0).length;

    const stats = [
      {
        title: "Total QR Codes",
        value: totalQrCodes.toString(),
        change: `+${weeklyQrCodes} this week`,
        trend: "up",
        icon: QrCodeIcon
      },
      {
        title: "Total Scans",
        value: totalScans.toLocaleString(),
        change: `${qrCodes.length > 0 ? Math.round((totalScans / qrCodes.length) * 100) / 100 : 0} avg per code`,
        trend: "up", 
        icon: Eye
      },
      {
        title: "This Month",
        value: thisMonthScans.toLocaleString(),
        change: `${totalScans > 0 ? Math.round((thisMonthScans / totalScans) * 100) : 0}% of total`,
        trend: "up",
        icon: Calendar
      },
      {
        title: "Active Codes",
        value: activeCodes.toString(),
        change: `${totalQrCodes > 0 ? Math.round((activeCodes / totalQrCodes) * 100) : 0}% have scans`,
        trend: "up",
        icon: Users
      }
    ];

    return { stats, totalScans };
  }, [qrCodes]);

  // Calculate top performing QR codes from real data
  const topPerformers = React.useMemo(() => {
    if (!qrCodes.length) return [];
    
    const maxScans = Math.max(...qrCodes.map(qr => qr.clickCount || 0));
    
    return qrCodes
      .filter(qr => (qr.clickCount || 0) > 0)
      .sort((a, b) => (b.clickCount || 0) - (a.clickCount || 0))
      .slice(0, 4)
      .map(qr => {
        const title = qr.type === 'url' ? 'Website Link' :
                     qr.type === 'email' ? 'Email Address' :
                     qr.type === 'phone' ? 'Phone Number' :
                     qr.type === 'sms' ? 'SMS Message' :
                     qr.type === 'wifi' ? 'WiFi Network' :
                     qr.type === 'vcard' ? 'Contact Card' :
                     'Text Content';
        
        return {
          name: title,
          scans: qr.clickCount || 0,
          percentage: maxScans > 0 ? Math.round(((qr.clickCount || 0) / maxScans) * 100) : 0
        };
      });
  }, [qrCodes]);

  // Calculate recent activity from real data
  const recentActivity = React.useMemo(() => {
    if (!qrCodes.length) return [];
    
    return qrCodes
      .filter(qr => (qr.clickCount || 0) > 0)
      .sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5)
      .map(qr => {
        const title = qr.type === 'url' ? 'Website Link' :
                     qr.type === 'email' ? 'Email Address' :
                     qr.type === 'phone' ? 'Phone Number' :
                     qr.type === 'sms' ? 'SMS Message' :
                     qr.type === 'wifi' ? 'WiFi Network' :
                     qr.type === 'vcard' ? 'Contact Card' :
                     'Text Content';
        
        const timeAgo = qr.updatedAt ? 
          format(new Date(qr.updatedAt), 'MMM d, yyyy') : 
          'Recently';
        
        return {
          qrCode: title,
          scans: qr.clickCount || 0,
          content: qr.content.substring(0, 30) + (qr.content.length > 30 ? '...' : ''),
          time: timeAgo
        };
      });
  }, [qrCodes]);

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-muted-foreground">Failed to load analytics data</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground">Track performance and insights for your QR codes</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                    <div className="h-8 w-16 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="w-10 h-10 bg-muted rounded-lg animate-pulse" />
                </div>
                <div className="mt-2">
                  <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          analytics.stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">{stat.title}</p>
                      <p className="text-2xl font-bold" data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                        {stat.value}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-muted-foreground">{stat.change}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Performing QR Codes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Top Performing QR Codes
            </CardTitle>
            <CardDescription>Most scanned QR codes this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformers.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <div className="w-full bg-muted rounded-full h-2 mt-1">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-bold">{item.scans}</p>
                    <p className="text-xs text-muted-foreground">scans</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Scan Activity</CardTitle>
            <CardDescription>Latest QR code scans and interactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <QrCodeIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No scan activity yet</p>
                </div>
              ) : (
                recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                        <QrCodeIcon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{activity.qrCode}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.content}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">{activity.scans} scans</Badge>
                      <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Scan Trends</CardTitle>
          <CardDescription>QR code scan activity over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Chart visualization coming soon</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
