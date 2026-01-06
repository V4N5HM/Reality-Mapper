'use client';

import { useState, useEffect } from 'react';
import { Loader2, BarChart3, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PersonalBrandDashboard from '@/components/report-dashboard/PersonalBrandDashboard';
import PodcastDashboard from '@/components/report-dashboard/PodcastDashboard';
import { PersonalBrandDashboardData, PodcastDashboardData } from '@/lib/report-dashboard/dashboard-types';

interface ClientReportTabProps {
  clientName: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function ClientReportTab({ clientName }: ClientReportTabProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportClientId, setReportClientId] = useState<string | null>(null);
  const [clientType, setClientType] = useState<'personal_brand' | 'podcast' | null>(null);
  const [dashboardData, setDashboardData] = useState<PersonalBrandDashboardData | PodcastDashboardData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  // Find matching report client on mount
  useEffect(() => {
    async function findReportClient() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/report-dashboard/clients');
        if (!res.ok) {
          throw new Error('Failed to fetch report clients');
        }
        const data = await res.json();
        const clients = data.clients || [];

        // Find client by name (case-insensitive partial match)
        const normalizedClientName = clientName.toLowerCase().trim();
        const matchingClient = clients.find((c: { name: string; id: string; type: string }) => {
          const reportClientName = c.name.toLowerCase().trim();
          return reportClientName === normalizedClientName ||
                 reportClientName.includes(normalizedClientName) ||
                 normalizedClientName.includes(reportClientName);
        });

        if (matchingClient) {
          setReportClientId(matchingClient.id);
          setClientType(matchingClient.type);
        } else {
          setError(`No report dashboard configured for "${clientName}". Configure this client in the Reports section.`);
        }
      } catch (err) {
        setError('Failed to load report configuration');
        console.error('Error finding report client:', err);
      } finally {
        setLoading(false);
      }
    }

    findReportClient();
  }, [clientName]);

  // Fetch dashboard data when client is found or date changes
  useEffect(() => {
    if (reportClientId) {
      fetchDashboardData();
    }
  }, [reportClientId, selectedMonth, selectedYear]);

  const fetchDashboardData = async () => {
    if (!reportClientId) return;

    setLoadingDashboard(true);
    try {
      const res = await fetch(
        `/api/report-dashboard/${reportClientId}?month=${selectedMonth}&year=${selectedYear}`
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch dashboard data');
      }

      const data = await res.json();
      setDashboardData(data.data);
      setClientType(data.clientType);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      setDashboardData(null);
    } finally {
      setLoadingDashboard(false);
    }
  };

  // Year options
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        <span className="ml-2 text-zinc-400">Loading report configuration...</span>
      </div>
    );
  }

  if (error && !reportClientId) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-10 h-10 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Report Available</h3>
          <p className="text-zinc-500 max-w-md mx-auto">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Date Selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">Month:</span>
          <Select
            value={String(selectedMonth)}
            onValueChange={(v) => setSelectedMonth(parseInt(v))}
          >
            <SelectTrigger className="w-[140px] bg-zinc-800 border-zinc-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              {MONTHS.map((month, index) => (
                <SelectItem key={index} value={String(index)}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">Year:</span>
          <Select
            value={String(selectedYear)}
            onValueChange={(v) => setSelectedYear(parseInt(v))}
          >
            <SelectTrigger className="w-[100px] bg-zinc-800 border-zinc-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              {yearOptions.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchDashboardData}
          disabled={loadingDashboard}
          className="border-zinc-700 text-zinc-300"
        >
          {loadingDashboard ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Refresh'
          )}
        </Button>
      </div>

      {/* Dashboard Content */}
      {loadingDashboard ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-500 mx-auto mb-4" />
            <p className="text-zinc-400">Loading dashboard data...</p>
          </CardContent>
        </Card>
      ) : dashboardData && clientType === 'personal_brand' ? (
        <PersonalBrandDashboard data={dashboardData as PersonalBrandDashboardData} />
      ) : dashboardData && clientType === 'podcast' ? (
        <PodcastDashboard data={dashboardData as PodcastDashboardData} />
      ) : (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-12 text-center">
            <BarChart3 className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Data Available</h3>
            <p className="text-zinc-500">
              No report data available for {MONTHS[selectedMonth]} {selectedYear}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
