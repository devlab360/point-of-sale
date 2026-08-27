import { useEffect, useRef } from "react";
import { getSalesFn } from "@/api/sales";
import { getProductsFn } from "@/api/products";
import { getSettingsFn } from "@/api/settings";
import { sendAutomatedReport } from "@/lib/automation/report-bot";
import { PersistStore } from "@/lib/session-store";
import { useAuth } from "@/contexts/AuthContext";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Module-level flag: survives Strict Mode double-mount within the same session
let _sessionRan = false;

export function ReportAutomation() {
  const hasRun = useRef(false);
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      hasRun.current = false;
      return;
    }

    // Double-guard: ref (per-instance) + module-level (per-session)
    if (hasRun.current || _sessionRan) return;
    hasRun.current = true;
    _sessionRan = true;

    const runAutomation = async () => {
      try {
        const orgId = PersistStore.getOrgId() || "default";

        // Fetch Settings for Admin Phone fallback
        let adminPhone = user?.phone;
        if (!adminPhone) {
          const settingsRes: any = await getSettingsFn({ data: {} });
          adminPhone = settingsRes?.data?.phone;
        }

        if (!adminPhone || adminPhone.trim() === "") {
          console.log("[ReportAutomation] No admin phone configured, skipping auto-report.");
          return;
        }

        const now = new Date();

        const lastWeeklyStr = localStorage.getItem(`last_weekly_report_date_${orgId}`);
        const lastMonthlyStr = localStorage.getItem(`last_monthly_report_date_${orgId}`);

        let needsWeekly = false;
        let needsMonthly = false;

        if (!lastWeeklyStr) {
          // If first time login, set flag and trigger the initial weekly summary
          needsWeekly = true;
        } else {
          const lastWeekly = new Date(lastWeeklyStr);
          if (now.getTime() - lastWeekly.getTime() >= SEVEN_DAYS_MS) {
            needsWeekly = true;
          }
        }

        if (!lastMonthlyStr) {
          // First time ever — set the date now without sending
          localStorage.setItem(`last_monthly_report_date_${orgId}`, now.toISOString());
        } else {
          const lastMonthly = new Date(lastMonthlyStr);
          const differentMonth = now.getMonth() !== lastMonthly.getMonth() || now.getFullYear() !== lastMonthly.getFullYear();
          if (differentMonth) {
            needsMonthly = true;
          }
        }

        if (!needsWeekly && !needsMonthly) return;

        // Fetch Data for Reports
        const salesRes: any = await getSalesFn({ data: { pageSize: 1000 } });
        const productsRes: any = await getProductsFn({ data: { pageSize: 1000 } });

        const sales = salesRes?.data || [];
        const products = productsRes?.data || [];

        // Helper to generate report data based on date filter
        const generateReportData = (startDate: Date) => {
          const filteredSales = sales.filter((s: any) => new Date(s.date) >= startDate);

          const totalRevenue = filteredSales.reduce((sum: number, s: any) => sum + (Number(s.total) || 0), 0);
          const totalOrders = filteredSales.length;

          const productSalesMap = new Map<string, number>();
          filteredSales.forEach((sale: any) => {
            if (sale.saleItems) {
              sale.saleItems.forEach((item: any) => {
                productSalesMap.set(
                  item.productId,
                  (productSalesMap.get(item.productId) || 0) + Number(item.quantity || 1)
                );
              });
            }
          });

          const topSelling = [...products]
            .map((p: any) => ({ ...p, sold: productSalesMap.get(p.id) || 0 }))
            .sort((a, b) => b.sold - a.sold)
            .slice(0, 3)
            .map(p => p.name);

          return { totalRevenue, totalOrders, topItems: topSelling };
        };

        // Send Monthly Report
        if (needsMonthly) {
          const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const data = generateReportData(startOfLastMonth);

          const success = await sendAutomatedReport(adminPhone, "Monthly" as any, data);
          if (success) {
            localStorage.setItem(`last_monthly_report_date_${orgId}`, now.toISOString());
          }
        }

        // Send Weekly Report (wait a bit if monthly was just sent)
        if (needsWeekly) {
          if (needsMonthly) {
            await new Promise(resolve => setTimeout(resolve, 5000));
          }

          const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS_MS);
          const data = generateReportData(sevenDaysAgo);

          const success = await sendAutomatedReport(adminPhone, "Weekly", data);
          if (success) {
            localStorage.setItem(`last_weekly_report_date_${orgId}`, now.toISOString());
          }
        }

      } catch (error) {
        console.error("ReportAutomation Error:", error);
      }
    };

    setTimeout(runAutomation, 5000);
  }, [isAuthenticated]);

  return null;
}
