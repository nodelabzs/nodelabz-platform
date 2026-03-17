import { task, logger } from "@trigger.dev/sdk";
import { prisma } from "@nodelabz/db";
import { Prisma } from "@nodelabz/db";

interface ShopifyOrder {
  id: number;
  name: string;
  created_at: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  customer?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  line_items: Array<{
    quantity: number;
    price: string;
  }>;
}

interface ShopifyCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  orders_count: number;
  total_spent: string;
  created_at: string;
}

export const syncShopify = task({
  id: "sync-shopify",
  run: async (payload: { tenantId: string; integrationId: string }) => {
    const { tenantId, integrationId } = payload;

    // Step 1: Fetch Integration record
    const integration = await prisma.integration.findFirst({
      where: { id: integrationId, tenantId },
    });

    if (!integration) {
      logger.error("Integration not found", { integrationId, tenantId });
      return { success: false, error: "Integration not found" };
    }

    const shop = integration.accountId;
    if (!shop) {
      logger.error("No accountId (shop) on integration", { integrationId });
      return { success: false, error: "Missing shop domain" };
    }

    try {
      // Step 2: Sync Orders
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const allOrders: ShopifyOrder[] = [];
      let ordersUrl: string | null =
        `https://${shop}/admin/api/2024-01/orders.json?status=any&created_at_min=${thirtyDaysAgo.toISOString()}&limit=250`;

      while (ordersUrl) {
        const response = await fetch(ordersUrl, {
          headers: {
            "X-Shopify-Access-Token": integration.accessToken,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Shopify API error ${response.status}: ${errorText}`);
        }

        const json = await response.json();
        const orders: ShopifyOrder[] = json.orders ?? [];
        allOrders.push(...orders);

        // Handle pagination via Link header
        const linkHeader = response.headers.get("link");
        ordersUrl = null;
        if (linkHeader) {
          const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
          if (nextMatch) {
            ordersUrl = nextMatch[1];
          }
        }
      }

      logger.info("Fetched Shopify orders", { orderCount: allOrders.length });

      // Step 3: Upsert orders as CampaignMetric rows
      // Group orders by date for daily aggregation
      const dailyTotals = new Map<
        string,
        { revenue: number; orderCount: number }
      >();

      for (const order of allOrders) {
        const dateStr = order.created_at.split("T")[0];
        const existing = dailyTotals.get(dateStr) || {
          revenue: 0,
          orderCount: 0,
        };
        existing.revenue += parseFloat(order.total_price) || 0;
        existing.orderCount += 1;
        dailyTotals.set(dateStr, existing);
      }

      let syncedCount = 0;

      for (const [dateStr, totals] of dailyTotals) {
        const date = new Date(dateStr);

        await prisma.campaignMetric.upsert({
          where: {
            tenantId_integrationId_campaignId_date: {
              tenantId,
              integrationId,
              campaignId: "orders",
              date,
            },
          },
          update: {
            campaignName: "Shopify Orders",
            impressions: 0,
            clicks: 0,
            spend: new Prisma.Decimal(0),
            conversions: totals.orderCount,
            revenue: new Prisma.Decimal(totals.revenue),
            ctr: new Prisma.Decimal(0),
            cpc: new Prisma.Decimal(0),
            roas: new Prisma.Decimal(0),
          },
          create: {
            tenantId,
            integrationId,
            platform: "shopify",
            campaignId: "orders",
            campaignName: "Shopify Orders",
            date,
            impressions: 0,
            clicks: 0,
            spend: new Prisma.Decimal(0),
            conversions: totals.orderCount,
            revenue: new Prisma.Decimal(totals.revenue),
            ctr: new Prisma.Decimal(0),
            cpc: new Prisma.Decimal(0),
            roas: new Prisma.Decimal(0),
          },
        });

        syncedCount++;
      }

      // Step 4: Sync customers — match by email to existing contacts
      let customersUrl: string | null =
        `https://${shop}/admin/api/2024-01/customers.json?limit=250`;

      while (customersUrl) {
        const response = await fetch(customersUrl, {
          headers: {
            "X-Shopify-Access-Token": integration.accessToken,
          },
        });

        if (!response.ok) {
          logger.warn("Failed to fetch Shopify customers", {
            status: response.status,
          });
          break;
        }

        const json = await response.json();
        const customers: ShopifyCustomer[] = json.customers ?? [];

        for (const customer of customers) {
          if (!customer.email) continue;

          // Try to find existing contact by email and update source
          await prisma.contact.updateMany({
            where: {
              tenantId,
              email: customer.email.toLowerCase(),
            },
            data: {
              source: "shopify",
            },
          });
        }

        // Handle pagination via Link header
        const linkHeader = response.headers.get("link");
        customersUrl = null;
        if (linkHeader) {
          const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
          if (nextMatch) {
            customersUrl = nextMatch[1];
          }
        }
      }

      // Step 5: Update Integration lastSyncAt and status
      await prisma.integration.update({
        where: { id: integrationId },
        data: {
          lastSyncAt: new Date(),
          status: "active",
        },
      });

      // Step 6: Return result
      logger.info("Shopify sync complete", { tenantId, syncedCount });
      return { success: true, synced: syncedCount };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Shopify sync failed", { integrationId, error: message });

      await prisma.integration.update({
        where: { id: integrationId },
        data: { status: "error" },
      });

      return { success: false, error: message };
    }
  },
});
