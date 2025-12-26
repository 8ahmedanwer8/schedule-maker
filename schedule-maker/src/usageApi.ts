import { api } from "./api";

export type UsageStatus = {
  dailyCount: number;
  totalCount: number;
  remainingFree: number;
  adCredits: number;
  canUseService: boolean;
  needsAd: boolean;
  limits: {
    dailyFreeLimit: number;
    maxDailyUsage: number;
    creditsPerAd: number;
  };
};

export async function fetchUsageStatus(): Promise<UsageStatus> {
  const res = await api.get("/api/usage/status");
  return res.data;
}

export async function reportAdCompleted(): Promise<{ totalCredits: number }> {
  const res = await api.post("/api/usage/ad-completed", {
    adNetwork: "mock",
    adId: `mock_${Date.now()}`,
  });
  return res.data;
}
