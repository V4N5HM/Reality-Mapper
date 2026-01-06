'use client';

import { useState, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Calendar, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  DateRangePreset,
  getDateRangeFromPreset,
  getPresetLabel,
  formatDateRangeDisplay,
} from '@/lib/date-range-utils';

interface DateRangeFilterProps {
  className?: string;
}

export function DateRangeFilter({ className }: DateRangeFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get current values from URL
  const currentPreset = (searchParams.get('dateRange') || 'all-time') as DateRangePreset;
  const currentDateFrom = searchParams.get('dateFrom') || '';
  const currentDateTo = searchParams.get('dateTo') || '';

  // Local state for custom date inputs
  const [customFrom, setCustomFrom] = useState(currentDateFrom);
  const [customTo, setCustomTo] = useState(currentDateTo);
  const [showCustomInputs, setShowCustomInputs] = useState(currentPreset === 'custom');

  // Update URL with new date range
  const updateDateRange = useCallback((
    preset: DateRangePreset,
    dateFrom?: string,
    dateTo?: string
  ) => {
    const params = new URLSearchParams(searchParams.toString());

    if (preset === 'all-time') {
      // Remove all date params
      params.delete('dateRange');
      params.delete('dateFrom');
      params.delete('dateTo');
    } else if (preset === 'custom') {
      params.set('dateRange', 'custom');
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
    } else {
      // For presets, calculate the dates and include them
      const range = getDateRangeFromPreset(preset);
      params.set('dateRange', preset);
      if (range.dateFrom) params.set('dateFrom', range.dateFrom);
      if (range.dateTo) params.set('dateTo', range.dateTo);
    }

    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  // Handle preset selection
  const handlePresetChange = (preset: string) => {
    if (preset === 'custom') {
      setShowCustomInputs(true);
      // Don't update URL yet, wait for custom dates
    } else {
      setShowCustomInputs(false);
      updateDateRange(preset as DateRangePreset);
    }
  };

  // Handle custom date submission
  const handleCustomSubmit = () => {
    if (customFrom && customTo) {
      updateDateRange('custom', customFrom, customTo);
    }
  };

  // Clear filter
  const handleClear = () => {
    setShowCustomInputs(false);
    setCustomFrom('');
    setCustomTo('');
    updateDateRange('all-time');
  };

  // Get display text
  const displayText = formatDateRangeDisplay(
    currentPreset,
    currentDateFrom,
    currentDateTo
  );

  const isFiltered = currentPreset !== 'all-time';

  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`gap-2 border-zinc-700 ${isFiltered ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'text-zinc-300'}`}
          >
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">{displayText}</span>
            <ChevronDown className="w-3 h-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuRadioGroup value={currentPreset} onValueChange={handlePresetChange}>
            <DropdownMenuRadioItem value="today">Today</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="this-week">This Week</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="this-month">This Month</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="last-7-days">Last 7 Days</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="last-30-days">Last 30 Days</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="custom">Custom Range</DropdownMenuRadioItem>
            <DropdownMenuSeparator />
            <DropdownMenuRadioItem value="all-time">All Time</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>

          {/* Custom date inputs */}
          {showCustomInputs && (
            <>
              <DropdownMenuSeparator />
              <div className="p-3 space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="dateFrom" className="text-xs text-zinc-400">From</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="h-8 text-sm bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dateTo" className="text-xs text-zinc-400">To</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="h-8 text-sm bg-zinc-800 border-zinc-700"
                  />
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handleCustomSubmit}
                  disabled={!customFrom || !customTo}
                >
                  Apply Range
                </Button>
              </div>
            </>
          )}

          {/* Clear button when filtered */}
          {isFiltered && (
            <>
              <DropdownMenuSeparator />
              <div className="p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center text-zinc-400 hover:text-zinc-300"
                  onClick={handleClear}
                >
                  <X className="w-3 h-3 mr-2" />
                  Clear Filter
                </Button>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
