import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTenant } from '@/context/TenantContext';
import { collection, query, getDocs, doc, setDoc, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Branch, Service, DailyMetrics } from '@/types/firestore';
import { BarChart3, TrendingUp, Clock, Calendar, CheckCircle2, XCircle, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';

interface MetricsWithDate extends DailyMetrics {
  date: string;
}

export const AnalyticsPage: React.FC = () => {
  const { t } = useTranslation();
  const { tenant } = useTenant();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [services, setServices] = useState<Service[]>([]);
  const [rangeDays, setRangeDays] = useState<number>(7);
  const [metrics, setMetrics] = useState<MetricsWithDate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [seeding, setSeeding] = useState<boolean>(false);

  // Fetch branches and services
  useEffect(() => {
    if (!tenant?.id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch branches
        const branchQuery = query(collection(db, 'branches'), where('tenantId', '==', tenant.id));
        const branchSnap = await getDocs(branchQuery);
        const fetchedBranches = branchSnap.docs.map(d => ({ id: d.id, ...d.data() } as Branch));
        setBranches(fetchedBranches);

        if (fetchedBranches.length > 0) {
          setSelectedBranchId(fetchedBranches[0].id);
        }

        // Fetch services
        const serviceQuery = query(collection(db, 'services'), where('tenantId', '==', tenant.id));
        const serviceSnap = await getDocs(serviceQuery);
        setServices(serviceSnap.docs.map(d => ({ id: d.id, ...d.data() } as Service)));
      } catch (err) {
        console.error('Error fetching analytics prep data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tenant?.id]);

  // Fetch metrics when branch or range change
  useEffect(() => {
    if (!selectedBranchId) return;

    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const metricsRef = collection(db, 'branches', selectedBranchId, 'dailyMetrics');
        const metricsSnap = await getDocs(metricsRef);
        const fetched = metricsSnap.docs.map(d => ({
          date: d.id,
          ...d.data()
        } as MetricsWithDate));

        // Sort by date ascending
        fetched.sort((a, b) => a.date.localeCompare(b.date));

        // Filter last N days
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - rangeDays);
        const cutoffStr = cutoffDate.toISOString().split('T')[0];

        const filtered = fetched.filter(m => m.date >= cutoffStr);
        setMetrics(filtered);
      } catch (err) {
        console.error('Error fetching metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [selectedBranchId, rangeDays]);

  // Seed Mock Data for testing
  const handleSeedMockData = async () => {
    if (!selectedBranchId || !tenant?.id) return;
    setSeeding(true);

    try {
      const dates: string[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
      }

      const defaultServices = services.filter(s => s.branchId === selectedBranchId);
      const serviceIds = defaultServices.length > 0 
        ? defaultServices.map(s => s.id) 
        : ['srv-01', 'srv-02', 'srv-03'];

      const hours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

      for (const dateStr of dates) {
        const totalCreated = Math.floor(Math.random() * 40) + 15; // 15 - 55
        const totalCompleted = Math.floor(totalCreated * (0.8 + Math.random() * 0.15));
        const totalNoShows = Math.floor((totalCreated - totalCompleted) * 0.6);
        const totalCancelled = totalCreated - totalCompleted - totalNoShows;

        const serviceBreakdown: Record<string, number> = {};
        serviceIds.forEach(id => {
          serviceBreakdown[id] = 0;
        });
        for (let j = 0; j < totalCreated; j++) {
          const sId = serviceIds[Math.floor(Math.random() * serviceIds.length)];
          serviceBreakdown[sId] = (serviceBreakdown[sId] || 0) + 1;
        }

        const hourlyTraffic: Record<string, number> = {};
        hours.forEach(h => {
          // Busiest mid-day
          const hVal = parseInt(h.split(':')[0]);
          let weight = 0.3;
          if (hVal >= 11 && hVal <= 14) weight = 0.9;
          else if (hVal >= 9 && hVal <= 16) weight = 0.6;
          
          hourlyTraffic[h] = Math.floor(Math.random() * (totalCreated / 3) * weight) + 1;
        });

        const avgWaitTimeSeconds = Math.floor(Math.random() * 600) + 300; // 5-15 mins
        const avgServiceTimeSeconds = Math.floor(Math.random() * 900) + 600; // 10-25 mins

        const docRef = doc(db, 'branches', selectedBranchId, 'dailyMetrics', dateStr);
        await setDoc(docRef, {
          tenantId: tenant.id,
          branchId: selectedBranchId,
          totalQueuesCreated: totalCreated,
          totalQueuesCompleted: totalCompleted,
          totalNoShows: totalNoShows,
          totalCancelled: totalCancelled,
          avgWaitTimeSeconds,
          avgServiceTimeSeconds,
          totalWaitTimeSeconds: avgWaitTimeSeconds * totalCompleted,
          totalWaitTimeCount: totalCompleted,
          totalServiceTimeSeconds: avgServiceTimeSeconds * totalCompleted,
          totalServiceTimeCount: totalCompleted,
          serviceBreakdown,
          hourlyTraffic,
          updatedAt: new Date()
        });
      }

      // Re-trigger fetch
      setRangeDays(prev => prev);
      alert('Mock metrics seeded successfully for last 30 days!');
    } catch (err) {
      console.error('Failed to seed mock metrics:', err);
      alert('Failed to seed mock metrics: ' + (err as Error).message);
    } finally {
      setSeeding(false);
    }
  };

  // Aggregations
  const totalCreated = metrics.reduce((sum, m) => sum + (m.totalQueuesCreated || 0), 0);
  const totalCompleted = metrics.reduce((sum, m) => sum + (m.totalQueuesCompleted || 0), 0);
  const totalNoShows = metrics.reduce((sum, m) => sum + (m.totalNoShows || 0), 0);

  const avgWaitTime = metrics.length > 0
    ? Math.round(metrics.reduce((sum, m) => sum + (m.avgWaitTimeSeconds || 0), 0) / metrics.length)
    : 0;

  const avgServiceTime = metrics.length > 0
    ? Math.round(metrics.reduce((sum, m) => sum + (m.avgServiceTimeSeconds || 0), 0) / metrics.length)
    : 0;

  // Format seconds to readable MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}${t('pages.analytics.minSuffix', 'm')} ${secs}${t('pages.analytics.secSuffix', 's')}`;
  };

  // Compile Service Breakdown
  const serviceStats: Record<string, number> = {};
  metrics.forEach(m => {
    if (m.serviceBreakdown) {
      Object.entries(m.serviceBreakdown).forEach(([sId, count]) => {
        serviceStats[sId] = (serviceStats[sId] || 0) + count;
      });
    }
  });

  const serviceBreakdownList = Object.entries(serviceStats)
    .map(([sId, count]) => {
      const s = services.find(srv => srv.id === sId);
      return {
        id: sId,
        name: s ? s.name : `Service ${sId.substring(0, 5)}`,
        color: s?.color || '#6366f1',
        count,
        percentage: totalCreated > 0 ? Math.round((count / totalCreated) * 100) : 0
      };
    })
    .sort((a, b) => b.count - a.count);

  // Compile Hourly Traffic
  const hourlyStats: Record<string, number> = {};
  const hourKeys = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
  
  // Initialize
  hourKeys.forEach(h => { hourlyStats[h] = 0; });

  metrics.forEach(m => {
    if (m.hourlyTraffic) {
      Object.entries(m.hourlyTraffic).forEach(([hour, count]) => {
        if (hourKeys.includes(hour)) {
          hourlyStats[hour] = (hourlyStats[hour] || 0) + count;
        }
      });
    }
  });

  const maxHourValue = Math.max(...Object.values(hourlyStats), 1);

  // Compile SVG Area Chart Path
  const generateAreaPath = () => {
    if (metrics.length === 0) return { line: '', area: '' };

    const width = 500;
    const height = 200;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const maxVal = Math.max(...metrics.map(m => m.totalQueuesCreated || 0), 10);

    const points = metrics.map((m, idx) => {
      const x = paddingLeft + (idx / (metrics.length - 1 || 1)) * chartWidth;
      const y = paddingTop + chartHeight - ((m.totalQueuesCreated || 0) / maxVal) * chartHeight;
      return { x, y };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = metrics.length > 0 
      ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`
      : '';

    return { line: linePath, area: areaPath, points };
  };

  const chartData = generateAreaPath();

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-200">
        <div>
          <h2 className="text-xl font-bold text-slate-950 dark:text-white flex items-center space-x-2">
            <BarChart3 className="text-brand-500" size={24} />
            <span>{t('pages.analytics.title', 'Analytics Dashboard')}</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('pages.analytics.subtitle', 'Real-time performance analytics and queue metrics')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Branch Selector */}
          {branches.length > 0 && (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:text-slate-200"
            >
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}

          {/* Time range switcher */}
          <div className="flex bg-slate-100 dark:bg-slate-850 p-1 rounded-lg border border-slate-250 dark:border-slate-700/50">
            <button
              onClick={() => setRangeDays(7)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                rangeDays === 7
                  ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-650 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('pages.analytics.range7', '7 Days')}
            </button>
            <button
              onClick={() => setRangeDays(30)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                rangeDays === 30
                  ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-650 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('pages.analytics.range30', '30 Days')}
            </button>
          </div>

          {/* Mock Seeder Button */}
          {import.meta.env.DEV && (
            <button
              onClick={handleSeedMockData}
              disabled={seeding || !selectedBranchId}
              className="flex items-center space-x-1.5 px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-amber-500/10"
            >
              {seeding ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              <span>{seeding ? t('pages.analytics.seeding', 'Seeding...') : t('pages.analytics.seedMock', 'Seed Mock Data')}</span>
            </button>
          )}
        </div>
      </div>

      {loading && metrics.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <RefreshCw className="animate-spin text-brand-500 mb-3" size={32} />
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('pages.analytics.loading', 'Loading analytics...')}</p>
        </div>
      ) : metrics.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <AlertCircle className="text-slate-400 dark:text-slate-600 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('pages.analytics.noDataTitle', 'No Metrics Found')}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-2 mb-6">
            {t('pages.analytics.noDataDesc', 'There is no daily metrics recorded for this period yet. Seed mock data or join the queue to generate stats.')}
          </p>
          {import.meta.env.DEV && (
            <button
              onClick={handleSeedMockData}
              className="flex items-center space-x-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-semibold transition-all shadow-md shadow-brand-600/10"
            >
              <Sparkles size={16} />
              <span>{t('pages.analytics.seedMock', 'Seed Mock Data')}</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Key Indicators Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4">
              <div className="w-10 h-10 rounded-lg bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                <TrendingUp size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-505 dark:text-slate-500 uppercase tracking-wider block">
                  {t('pages.analytics.kpiVolume', 'Total Tickets')}
                </span>
                <span className="text-xl font-bold text-slate-900 dark:text-white mt-0.5 block">{totalCreated}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-505 dark:text-slate-500 uppercase tracking-wider block">
                  {t('pages.analytics.kpiCompleted', 'Completed')}
                </span>
                <span className="text-xl font-bold text-slate-900 dark:text-white mt-0.5 block">{totalCompleted}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4">
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <XCircle size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-505 dark:text-slate-500 uppercase tracking-wider block">
                  {t('pages.analytics.kpiNoShows', 'No Shows')}
                </span>
                <span className="text-xl font-bold text-slate-900 dark:text-white mt-0.5 block">{totalNoShows}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-505 dark:text-slate-500 uppercase tracking-wider block">
                  {t('pages.analytics.kpiWaitTime', 'Avg Wait')}
                </span>
                <span className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 block">{formatTime(avgWaitTime)}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-505 dark:text-slate-500 uppercase tracking-wider block">
                  {t('pages.analytics.kpiServiceTime', 'Avg Service')}
                </span>
                <span className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 block">{formatTime(avgServiceTime)}</span>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Daily Queue Volume Chart */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm lg:col-span-2 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-850 dark:text-white flex items-center space-x-1.5">
                  <TrendingUp size={16} className="text-brand-500" />
                  <span>{t('pages.analytics.chartVolumeTitle', 'Daily Queue Volume')}</span>
                </h3>
                <p className="text-xs text-slate-450 dark:text-slate-400 mt-1">
                  {t('pages.analytics.chartVolumeDesc', 'Total ticket count created per day')}
                </p>
              </div>

              {/* SVG Area Chart */}
              <div className="h-64 mt-6 relative">
                <svg viewBox="0 0 500 200" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal grid lines */}
                  <line x1="40" y1="20" x2="480" y2="20" stroke="#f1f5f9" className="dark:stroke-slate-800/50" strokeDasharray="4 4" />
                  <line x1="40" y1="90" x2="480" y2="90" stroke="#f1f5f9" className="dark:stroke-slate-800/50" strokeDasharray="4 4" />
                  <line x1="40" y1="160" x2="480" y2="160" stroke="#e2e8f0" className="dark:stroke-slate-800" />

                  {/* Fill Area */}
                  {chartData.area && (
                    <path d={chartData.area} fill="url(#area-grad)" />
                  )}

                  {/* Line Path */}
                  {chartData.line && (
                    <path d={chartData.line} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
                  )}

                  {/* Dots & Labels */}
                  {chartData.points?.map((p, idx) => (
                    <g key={idx} className="group cursor-pointer">
                      <circle cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke="#6366f1" strokeWidth="2" />
                      
                      {/* Tooltip on hover */}
                      <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <rect x={p.x - 25} y={p.y - 30} width="50" height="20" rx="4" fill="#0f172a" />
                        <text x={p.x} y={p.y - 17} textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
                          {metrics[idx].totalQueuesCreated}
                        </text>
                      </g>

                      {/* X Axis Labels */}
                      {(idx === 0 || idx === metrics.length - 1 || idx === Math.floor(metrics.length / 2)) && (
                        <text x={p.x} y="180" textAnchor="middle" className="fill-slate-400 dark:fill-slate-500 text-[9px] font-medium">
                          {metrics[idx].date.substring(5)}
                        </text>
                      )}
                    </g>
                  ))}
                </svg>
              </div>
            </div>

            {/* Service Breakdown */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-850 dark:text-white flex items-center space-x-1.5">
                  <BarChart3 size={16} className="text-brand-500" />
                  <span>{t('pages.analytics.serviceBreakdownTitle', 'Service Breakdown')}</span>
                </h3>
                <p className="text-xs text-slate-450 dark:text-slate-400 mt-1">
                  {t('pages.analytics.serviceBreakdownDesc', 'Distribution of tickets across service types')}
                </p>
              </div>

              <div className="space-y-4 mt-6 flex-1 overflow-y-auto max-h-[220px]">
                {serviceBreakdownList.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-600 text-center py-8">{t('pages.analytics.noServices', 'No service data')}</p>
                ) : (
                  serviceBreakdownList.map((item) => (
                    <div key={item.id} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-700 dark:text-slate-300 truncate max-w-[70%]">{item.name}</span>
                        <span className="text-slate-500 dark:text-slate-400">{item.count} ({item.percentage}%)</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${item.percentage}%`,
                            backgroundColor: item.color || '#6366f1'
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Heatmap Row */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-slate-850 dark:text-white flex items-center space-x-1.5">
                <Calendar size={16} className="text-brand-500" />
                <span>{t('pages.analytics.heatmapTitle', 'Hourly Traffic Distribution')}</span>
              </h3>
              <p className="text-xs text-slate-450 dark:text-slate-400 mt-1">
                {t('pages.analytics.heatmapDesc', 'Hourly ticket creation pattern across the operating window')}
              </p>
            </div>

            <div className="grid grid-cols-11 gap-2 mt-6 overflow-x-auto min-w-[500px]">
              {hourKeys.map(h => (
                <div key={h} className="text-center">
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-450 mb-2">{h}</div>
                  <div
                    className="h-16 w-full rounded-lg flex items-center justify-center transition-all shadow-inner border border-slate-100 dark:border-slate-800/80"
                    style={{
                      backgroundColor: `rgba(99, 102, 241, ${hourlyStats[h] > 0 ? 0.08 + (hourlyStats[h] / maxHourValue) * 0.92 : 0.02})`
                    }}
                  >
                    <span className="text-xs font-extrabold text-brand-900 dark:text-white opacity-80">
                      {hourlyStats[h] || 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsPage;
