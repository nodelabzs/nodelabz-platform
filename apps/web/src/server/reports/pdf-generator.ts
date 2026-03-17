import React from "react";
import {
  renderToBuffer,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { prisma } from "@nodelabz/db";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  header: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "bold", color: "#1a1a1a" },
  subtitle: { fontSize: 12, color: "#666", marginTop: 4 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    paddingBottom: 6,
  },
  row: { flexDirection: "row", marginBottom: 4 },
  label: { fontSize: 10, color: "#666", width: 120 },
  value: { fontSize: 10, color: "#1a1a1a", fontWeight: "bold" },
  kpiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  kpiCard: {
    width: "23%",
    padding: 12,
    backgroundColor: "#f8f8f8",
    borderRadius: 4,
  },
  kpiValue: { fontSize: 20, fontWeight: "bold", color: "#1a1a1a" },
  kpiLabel: { fontSize: 8, color: "#888", marginTop: 2 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    padding: 6,
    borderRadius: 2,
  },
  tableRow: {
    flexDirection: "row",
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  tableCell: { fontSize: 9, color: "#333", flex: 1 },
  tableCellHeader: {
    fontSize: 8,
    color: "#666",
    fontWeight: "bold",
    flex: 1,
    textTransform: "uppercase",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#999",
  },
});

export async function generateReportPDF(params: {
  tenantId: string;
  dateRange: { from: Date; to: Date };
}): Promise<Buffer> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: params.tenantId },
  });

  // Fetch metrics
  const metrics = await prisma.campaignMetric.findMany({
    where: {
      tenantId: params.tenantId,
      date: { gte: params.dateRange.from, lte: params.dateRange.to },
    },
  });

  const totalSpend = metrics.reduce((s, m) => s + Number(m.spend), 0);
  const totalRevenue = metrics.reduce((s, m) => s + Number(m.revenue), 0);
  const totalConversions = metrics.reduce((s, m) => s + m.conversions, 0);
  const totalClicks = metrics.reduce((s, m) => s + m.clicks, 0);
  const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  // Aggregate by platform
  const byPlatform: Record<
    string,
    { spend: number; revenue: number; conversions: number; clicks: number }
  > = {};
  for (const m of metrics) {
    if (!byPlatform[m.platform])
      byPlatform[m.platform] = {
        spend: 0,
        revenue: 0,
        conversions: 0,
        clicks: 0,
      };
    const entry = byPlatform[m.platform]!;
    entry.spend += Number(m.spend);
    entry.revenue += Number(m.revenue);
    entry.conversions += m.conversions;
    entry.clicks += m.clicks;
  }

  const contactCount = await prisma.contact.count({
    where: { tenantId: params.tenantId },
  });
  const dealCount = await prisma.deal.count({
    where: { tenantId: params.tenantId },
  });

  const fromStr = params.dateRange.from.toLocaleDateString("es-CR");
  const toStr = params.dateRange.to.toLocaleDateString("es-CR");

  const doc = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(
          Text,
          { style: styles.title },
          `Reporte - ${tenant?.name || "NodeLabz"}`
        ),
        React.createElement(
          Text,
          { style: styles.subtitle },
          `Periodo: ${fromStr} - ${toStr}`
        )
      ),
      // KPIs
      React.createElement(
        View,
        { style: styles.kpiRow },
        React.createElement(
          View,
          { style: styles.kpiCard },
          React.createElement(
            Text,
            { style: styles.kpiValue },
            `$${totalRevenue.toLocaleString()}`
          ),
          React.createElement(Text, { style: styles.kpiLabel }, "Revenue")
        ),
        React.createElement(
          View,
          { style: styles.kpiCard },
          React.createElement(
            Text,
            { style: styles.kpiValue },
            `$${totalSpend.toLocaleString()}`
          ),
          React.createElement(Text, { style: styles.kpiLabel }, "Gasto Total")
        ),
        React.createElement(
          View,
          { style: styles.kpiCard },
          React.createElement(
            Text,
            { style: styles.kpiValue },
            totalConversions.toString()
          ),
          React.createElement(
            Text,
            { style: styles.kpiLabel },
            "Conversiones"
          )
        ),
        React.createElement(
          View,
          { style: styles.kpiCard },
          React.createElement(
            Text,
            { style: styles.kpiValue },
            `${roas.toFixed(1)}x`
          ),
          React.createElement(Text, { style: styles.kpiLabel }, "ROAS")
        )
      ),
      // Channel table
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(
          Text,
          { style: styles.sectionTitle },
          "Performance por Canal"
        ),
        React.createElement(
          View,
          { style: styles.tableHeader },
          React.createElement(
            Text,
            { style: styles.tableCellHeader },
            "Canal"
          ),
          React.createElement(
            Text,
            { style: styles.tableCellHeader },
            "Gasto"
          ),
          React.createElement(
            Text,
            { style: styles.tableCellHeader },
            "Revenue"
          ),
          React.createElement(
            Text,
            { style: styles.tableCellHeader },
            "Conv."
          ),
          React.createElement(Text, { style: styles.tableCellHeader }, "ROAS")
        ),
        ...Object.entries(byPlatform).map(([platform, data]) =>
          React.createElement(
            View,
            { key: platform, style: styles.tableRow },
            React.createElement(Text, { style: styles.tableCell }, platform),
            React.createElement(
              Text,
              { style: styles.tableCell },
              `$${data.spend.toLocaleString()}`
            ),
            React.createElement(
              Text,
              { style: styles.tableCell },
              `$${data.revenue.toLocaleString()}`
            ),
            React.createElement(
              Text,
              { style: styles.tableCell },
              data.conversions.toString()
            ),
            React.createElement(
              Text,
              { style: styles.tableCell },
              data.spend > 0
                ? `${(data.revenue / data.spend).toFixed(1)}x`
                : "-"
            )
          )
        )
      ),
      // Summary
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(
          Text,
          { style: styles.sectionTitle },
          "Resumen CRM"
        ),
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(
            Text,
            { style: styles.label },
            "Total Contactos:"
          ),
          React.createElement(
            Text,
            { style: styles.value },
            contactCount.toString()
          )
        ),
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, { style: styles.label }, "Total Deals:"),
          React.createElement(
            Text,
            { style: styles.value },
            dealCount.toString()
          )
        )
      ),
      // Footer
      React.createElement(
        Text,
        { style: styles.footer },
        `Generado por NodeLabz | ${new Date().toLocaleDateString("es-CR")}`
      )
    )
  );

  return renderToBuffer(doc);
}
