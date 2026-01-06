'use client';

import { useState, useEffect } from 'react';
import { DailyCheckinForm } from '@/components/checkin/daily-checkin-form';
import { CheckinHistory } from '@/components/checkin/checkin-history';
import { Loader2 } from 'lucide-react';
import type { DailyCheckin } from '@/types';

export const dynamic = 'force-dynamic';

export default function CheckinPage() {
  const [todayCheckin, setTodayCheckin] = useState<DailyCheckin | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchTodayCheckin();
  }, []);

  const fetchTodayCheckin = async () => {
    try {
      const response = await fetch('/api/checkins?action=today');
      const data = await response.json();
      setTodayCheckin(data.checkin || null);
    } catch (error) {
      console.error('Error fetching today\'s check-in:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitSuccess = (checkin: DailyCheckin) => {
    setTodayCheckin(checkin);
    // Refresh history
    setRefreshKey(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Daily Check-in</h1>
          <p className="text-zinc-400">Record your daily progress and learnings</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Daily Check-in</h1>
        <p className="text-zinc-400">Record your daily progress and learnings</p>
      </div>

      {/* Check-in Form */}
      <DailyCheckinForm
        existingCheckin={todayCheckin}
        onSubmitSuccess={handleSubmitSuccess}
      />

      {/* Check-in History */}
      <CheckinHistory key={refreshKey} limit={7} />
    </div>
  );
}
