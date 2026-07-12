import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTenant } from '@/context/TenantContext';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/config/firebase';
import { CreditCard, Check, Shield, AlertTriangle, ArrowRight, RefreshCw, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

export const SubscriptionPage: React.FC = () => {
  const { t } = useTranslation();
  const { tenant, subscription, loading: tenantLoading } = useTenant();
  const [searchParams, setSearchParams] = useSearchParams();

  const [branchCount, setBranchCount] = useState<number>(0);
  const [serviceCount, setServiceCount] = useState<number>(0);
  const [staffCount, setStaffCount] = useState<number>(0);
  const [loadingUsage, setLoadingUsage] = useState<boolean>(true);
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);

  // Stripe Checkout Modal State (For Mocking)
  const [showMockCheckout, setShowMockCheckout] = useState<boolean>(false);
  const [mockPlanId, setMockPlanId] = useState<string>('');
  const [mockEmail, setMockEmail] = useState<string>('');
  const mockCardNum = '4242 •••• •••• 4242';
  const [mockCardName, setMockCardName] = useState<string>('');
  const [processingMockPay, setProcessingMockPay] = useState<boolean>(false);

  // Load actual usage counts
  useEffect(() => {
    if (!tenant?.id) return;

    const loadUsage = async () => {
      setLoadingUsage(true);
      try {
        const branchQ = query(collection(db, 'branches'), where('tenantId', '==', tenant.id));
        const branchSnap = await getDocs(branchQ);
        setBranchCount(branchSnap.size);

        const serviceQ = query(collection(db, 'services'), where('tenantId', '==', tenant.id));
        const serviceSnap = await getDocs(serviceQ);
        setServiceCount(serviceSnap.size);

        const staffQ = query(collection(db, 'users'), where('tenantId', '==', tenant.id), where('role', 'in', ['admin', 'manager', 'staff']));
        const staffSnap = await getDocs(staffQ);
        setStaffCount(staffSnap.size);
      } catch (err) {
        console.error('Error fetching usage stats:', err);
      } finally {
        setLoadingUsage(false);
      }
    };

    loadUsage();
  }, [tenant?.id, subscription]);

  // Check URL query parameters for redirect from createCheckoutSession
  useEffect(() => {
    const mockParam = searchParams.get('mock_checkout');
    const planParam = searchParams.get('planId');
    if (mockParam === 'true' && planParam) {
      setMockPlanId(planParam);
      setMockEmail(tenant?.email || '');
      setMockCardName(tenant?.name || '');
      setShowMockCheckout(true);
      
      // Clean query params so refresh doesn't pop it open again
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('mock_checkout');
      newParams.delete('planId');
      setSearchParams(newParams);
    }
  }, [searchParams, tenant]);

  const handleUpgrade = async (planId: string) => {
    setUpgradingPlanId(planId);
    try {
      const createSession = httpsCallable<{ planId: string; successUrl: string; cancelUrl: string }, { url: string }>(
        functions,
        'createCheckoutSession'
      );

      const successUrl = window.location.origin + '/dashboard/subscription';
      const cancelUrl = window.location.origin + '/dashboard/subscription';

      const res = await createSession({
        planId,
        successUrl,
        cancelUrl
      });

      if (res.data?.url) {
        // In mock mode or real mode, redirect to the URL returned
        if (res.data.url.includes('mock_checkout=true')) {
          // If it's a mock local checkout, handle locally to avoid actual redirects
          const urlObj = new URL(res.data.url);
          setMockPlanId(urlObj.searchParams.get('planId') || planId);
          setMockEmail(tenant?.email || '');
          setMockCardName(tenant?.name || '');
          setShowMockCheckout(true);
        } else {
          // Redirect to Stripe Checkout page in production
          window.location.href = res.data.url;
        }
      }
    } catch (err) {
      console.error('Upgrade session creation failed:', err);
      alert('Checkout failed: ' + (err as Error).message);
    } finally {
      setUpgradingPlanId(null);
    }
  };

  const submitMockPayment = async () => {
    if (!tenant?.id) return;
    setProcessingMockPay(true);
    try {
      // Trigger the local emulator Stripe webhook endpoint directly!
      const webhookUrl = 'http://localhost:5001/service-os-3c62c/us-central1/stripeWebhook';
      
      const payload = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'mock_session_' + Date.now(),
            customer: 'mock_customer_' + tenant.id,
            subscription: 'mock_subscription_' + Date.now(),
            metadata: {
              tenantId: tenant.id,
              planId: mockPlanId
            }
          }
        }
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setShowMockCheckout(false);
      } else {
        const text = await response.text();
        throw new Error(text || 'Mock webhook response failed');
      }
    } catch (err) {
      console.error('Mock checkout processing failed:', err);
      alert('Mock payment processing failed: ' + (err as Error).message);
    } finally {
      setProcessingMockPay(false);
    }
  };

  const activePlan = subscription?.planId || 'starter';

  const planTiers = [
    {
      id: 'starter',
      name: t('pages.billing.planStarter', 'Starter (Free)'),
      price: '$0',
      period: t('pages.billing.pricePeriod', '/month'),
      features: [
        t('pages.billing.featBranchStarter', '1 Active Branch'),
        t('pages.billing.featServiceStarter', '2 Services per branch'),
        t('pages.billing.featStaffStarter', '5 Staff members'),
        t('pages.billing.featQueueStarter', '50 Tickets per day limit')
      ],
      limits: {
        branches: 1,
        services: 2,
        staff: 5
      }
    },
    {
      id: 'professional',
      name: t('pages.billing.planProfessional', 'Professional'),
      price: '$29',
      period: t('pages.billing.pricePeriod', '/month'),
      features: [
        t('pages.billing.featBranchPro', '10 Active Branches'),
        t('pages.billing.featServicePro', '20 Services per branch'),
        t('pages.billing.featStaffPro', '50 Staff members'),
        t('pages.billing.featQueuePro', '500 Tickets per day limit'),
        t('pages.billing.featWorkflowPro', 'Multi-Step Workflow Engine'),
        t('pages.billing.featAppointmentPro', 'Appointment Scheduler')
      ],
      limits: {
        branches: 10,
        services: 20,
        staff: 50
      }
    },
    {
      id: 'enterprise',
      name: t('pages.billing.planEnterprise', 'Enterprise'),
      price: '$99',
      period: t('pages.billing.pricePeriod', '/month'),
      features: [
        t('pages.billing.featBranchEnterprise', 'Unlimited Branches'),
        t('pages.billing.featServiceEnterprise', 'Unlimited Services'),
        t('pages.billing.featStaffEnterprise', 'Unlimited Staff members'),
        t('pages.billing.featQueueEnterprise', 'Unlimited Daily Tickets'),
        t('pages.billing.featApiEnterprise', 'Developer API & Webhooks'),
        t('pages.billing.featSmsEnterprise', '1,000 SMS per month included')
      ],
      limits: {
        branches: 9999,
        services: 9999,
        staff: 9999
      }
    }
  ];

  const currentSubscriptionLimits = subscription?.limits || {
    branches: 1,
    servicesPerBranch: 2,
    usersPerBranch: 5,
    queueItemsPerDay: 50
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950 dark:text-white flex items-center space-x-2">
          <CreditCard className="text-brand-500" size={24} />
          <span>{t('pages.billing.title', 'Subscription & Billing')}</span>
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t('pages.billing.subtitle', 'Manage your SaaS subscription, view pricing plans and account limits')}
        </p>
      </div>

      {tenantLoading || loadingUsage ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <RefreshCw className="animate-spin text-brand-500 mb-3" size={32} />
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('pages.billing.loading', 'Loading subscription plan details...')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel: Active subscription and limits info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-full">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('pages.billing.currentPlanHeader', 'Active Plan')}</h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-2xl font-black text-brand-650 dark:text-brand-400 capitalize">
                      {activePlan}
                    </span>
                    <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-500/10 rounded-full">
                      {subscription?.status || 'active'}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 border-t border-slate-100 dark:border-slate-800 pt-6">
                  <h4 className="text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">{t('pages.billing.usageLimits', 'Resource Limits')}</h4>
                  
                  {/* Branch Limit */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-650 dark:text-slate-400">{t('pages.billing.limitBranches', 'Branches')}</span>
                      <span>{branchCount} / {currentSubscriptionLimits.branches === 9999 ? '∞' : currentSubscriptionLimits.branches}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min((branchCount / (currentSubscriptionLimits.branches || 1)) * 100, 100)}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Services Limit */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-650 dark:text-slate-400">{t('pages.billing.limitServices', 'Services per Branch')}</span>
                      <span>{serviceCount} / {currentSubscriptionLimits.servicesPerBranch === 9999 ? '∞' : currentSubscriptionLimits.servicesPerBranch}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min((serviceCount / (currentSubscriptionLimits.servicesPerBranch || 1)) * 100, 100)}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Staff Limit */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-650 dark:text-slate-400">{t('pages.billing.limitStaff', 'Staff members')}</span>
                      <span>{staffCount} / {currentSubscriptionLimits.usersPerBranch === 9999 ? '∞' : currentSubscriptionLimits.usersPerBranch}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min((staffCount / (currentSubscriptionLimits.usersPerBranch || 1)) * 100, 100)}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {activePlan !== 'starter' && (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-6 mt-6">
                  <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-450 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                    <Shield size={14} className="text-brand-500 shrink-0" />
                    <span>
                      {t('pages.billing.billingPortalNote', 'Billing is managed securely via Stripe.')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
            {planTiers.map((plan) => {
              const isCurrent = plan.id === activePlan;
              const isHigher = planTiers.findIndex(p => p.id === plan.id) > planTiers.findIndex(p => p.id === activePlan);

              return (
                <div
                  key={plan.id}
                  className={`bg-white dark:bg-slate-900 p-6 rounded-xl border flex flex-col justify-between transition-all duration-200 ${
                    isCurrent
                      ? 'border-brand-500 dark:border-brand-500 ring-2 ring-brand-500/10'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{plan.name}</h4>
                      <div className="flex items-baseline space-x-1 mt-2">
                        <span className="text-3xl font-extrabold text-slate-950 dark:text-white">{plan.price}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{plan.period}</span>
                      </div>
                    </div>

                    <ul className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start space-x-2 text-xs text-slate-650 dark:text-slate-300">
                          <Check size={14} className="text-brand-500 mt-0.5 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                    {isCurrent ? (
                      <button
                        disabled
                        className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 cursor-default"
                      >
                        {t('pages.billing.currentPlan', 'Current Plan')}
                      </button>
                    ) : isHigher ? (
                      <button
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={upgradingPlanId !== null}
                        className="w-full py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-brand-600/10 flex items-center justify-center space-x-1"
                      >
                        {upgradingPlanId === plan.id ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <span>{t('pages.billing.upgradeBtn', 'Upgrade')}</span>
                        )}
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 cursor-not-allowed"
                        title="Downgrading is not supported dynamically in development."
                      >
                        {t('pages.billing.downgradeBtn', 'Downgrade')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mock Stripe Checkout Modal */}
      {showMockCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#f8f9fa] dark:bg-slate-900 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row relative">
            <button
              onClick={() => setShowMockCheckout(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 cursor-pointer z-10"
            >
              <X size={20} />
            </button>

            {/* Left Col: stripe-like plan card */}
            <div className="md:w-5/12 bg-white dark:bg-slate-950 p-8 md:p-12 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex items-center space-x-2 text-brand-600 dark:text-brand-400">
                  <CreditCard size={20} />
                  <span className="font-extrabold text-sm tracking-wide uppercase">Stripe Checkout</span>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-450 dark:text-slate-500 uppercase tracking-wider">
                    {t('pages.billing.subscribeTo', 'Subscribe to')}
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white capitalize">
                    {mockPlanId} Plan
                  </h3>
                  <div className="flex items-baseline space-x-1 mt-2">
                    <span className="text-3xl font-black text-slate-950 dark:text-white">
                      {mockPlanId === 'professional' ? '$29.00' : '$99.00'}
                    </span>
                    <span className="text-xs text-slate-450 dark:text-slate-550">USD / mo</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-900 flex items-center space-x-2 text-[10px] text-slate-450">
                <Shield size={12} className="text-brand-500 shrink-0" />
                <span>Powered by Stripe. Mock sandbox transaction.</span>
              </div>
            </div>

            {/* Right Col: mock payment form */}
            <div className="md:w-7/12 p-8 md:p-12 space-y-6 flex flex-col justify-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {t('pages.billing.paymentDetails', 'Payment Details')}
              </h3>

              <div className="space-y-4">
                {/* Email Field */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t('pages.billing.emailLabel', 'Email')}</label>
                  <input
                    type="email"
                    value={mockEmail}
                    onChange={(e) => setMockEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:text-slate-200"
                    placeholder="you@example.com"
                  />
                </div>

                {/* Card details */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t('pages.billing.cardInfoLabel', 'Card Information')}</label>
                  <div className="relative">
                    <input
                      type="text"
                      disabled
                      value={mockCardNum}
                      className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-250 dark:border-slate-700 rounded-lg dark:text-slate-400"
                    />
                    <CreditCard className="absolute right-3 top-3 text-slate-400" size={16} />
                  </div>
                </div>

                {/* Cardholder Name */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t('pages.billing.cardholderName', 'Name on card')}</label>
                  <input
                    type="text"
                    value={mockCardName}
                    onChange={(e) => setMockCardName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:text-slate-200"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              {/* Warning Alert */}
              <div className="flex items-start space-x-2 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-450 p-3 rounded-lg text-xs">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>
                  {t('pages.billing.mockAlert', 'This is a mock checkout flow. Clicking pay will send a simulated checkout.session.completed event directly to the webhook to update your subscription.')}
                </span>
              </div>

              {/* Pay Button */}
              <button
                onClick={submitMockPayment}
                disabled={processingMockPay}
                className="w-full py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-all shadow-md shadow-brand-600/10 flex items-center justify-center space-x-2"
              >
                {processingMockPay ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <>
                    <span>{t('pages.billing.payAndSubscribe', 'Pay and Subscribe')}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionPage;
