import { useEffect, useRef } from "react";
import { getSalesFn } from "@/api/sales";
import { getProductsFn } from "@/api/products";
import { getSettingsFn } from "@/api/settings";
import { sendAutomatedReport } from "@/lib/automation/report-bot";
import { PersistStore } from "@/lib/session-store";
import { useAuth } from "@/contexts/AuthContext";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function ReportAutomation() {
  const hasRun = useRef(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      hasRun.current = false; // Reset if logged out
      return;
    }

    if (hasRun.current) return;
    hasRun.current = true;

    const runAutomation = async () => {
      try {
        const orgId = PersistStore.getOrgId() || "default";

        // Fetch Settings for Admin Phone
        const settingsRes: any = await getSettingsFn({ data: {} });
        const settings = settingsRes?.data;
        const adminPhone = settings?.phone;

        if (!adminPhone) return;

        const now = new Date();

        const lastWeeklyStr = localStorage.getItem("last_weekly_report_date");
        const lastMonthlyStr = localStorage.getItem("last_monthly_report_date");

        let needsWeekly = false;
        let needsMonthly = false;

        if (!lastWeeklyStr) {
          needsWeekly = true;
        } else {
          const lastWeekly = new Date(lastWeeklyStr);
          if (now.getTime() - lastWeekly.getTime() >= SEVEN_DAYS_MS) {
            needsWeekly = true;
          }
        }

        if (!lastMonthlyStr) {
          needsMonthly = true;
        } else {
          const lastMonthly = new Date(lastMonthlyStr);
          if (now.getMonth() !== lastMonthly.getMonth()) {
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
                  (productSalesMap.get(item.productId) || 0) + item.quantity
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
            localStorage.setItem("last_monthly_report_date", now.toISOString());
          }
        }

        // Send Weekly Report (Wait a bit if monthly was just sent to avoid overlapping spam)
        if (needsWeekly) {
          if (needsMonthly) {
            await new Promise(resolve => setTimeout(resolve, 5000));
          }

          const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS_MS);
          const data = generateReportData(sevenDaysAgo);

          const success = await sendAutomatedReport(adminPhone, "Weekly", data);
          if (success) {
            localStorage.setItem("last_weekly_report_date", now.toISOString());
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
