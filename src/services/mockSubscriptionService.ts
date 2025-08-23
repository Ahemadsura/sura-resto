// Mock Subscription Service
// TODO: Replace with real API integration when payment system is ready (SURA website)

export type SubscriptionStatus = 'active' | 'expired' | 'expiring';

export interface Subscription {
  planName: string;
  startDate: string; // ISO string
  endDate: string; // ISO string
  status: SubscriptionStatus | 'active';
}

// Simulate network latency for better UX
const simulateLatency = async (minMs = 500, maxMs = 1200) =>
  new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs));

// Default mock API as per requirements
export async function fetchSubscription(): Promise<Subscription> {
  // TODO: Replace with real API call: await api.get('/owner/subscription')
  await simulateLatency();
  return {
    planName: 'Pro Plan',
    startDate: '2025-07-01T00:00:00Z',
    endDate: '2025-08-31T23:59:59Z',
    status: 'active',
  };
}

// Additional helper for QA to test scenarios without changing the component
// Not used by default rendering; pass a scenario flag to component if needed for manual QA
export type SubscriptionScenario = 'active' | 'expiring' | 'expired';

export async function fetchSubscriptionScenario(scenario: SubscriptionScenario): Promise<Subscription> {
  await simulateLatency();

  const now = new Date();
  let end: Date = new Date(now);
  let start: Date = new Date(now);
  let status: SubscriptionStatus = 'active';

  if (scenario === 'active') {
    // 30 days remaining
    start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    end = new Date(now);
    end.setDate(now.getDate() + 30);
    status = 'active';
  } else if (scenario === 'expiring') {
    // 5 days remaining
    start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    end = new Date(now);
    end.setDate(now.getDate() + 5);
    status = 'expiring';
  } else {
    // expired yesterday
    start = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());
    end = new Date(now);
    end.setDate(now.getDate() - 1);
    status = 'expired';
  }

  return {
    planName: 'Pro Plan',
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    status,
  };
}


