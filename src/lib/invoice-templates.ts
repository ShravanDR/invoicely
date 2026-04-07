import { amountInWords } from "@/lib/utils";

interface TemplateLineItem {
  description: string;
  details?: string | null;
  qty: number;
  rate: number;
  amount: number;
}

interface TemplateData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: string;
  forPdf?: boolean;
  business: {
    name: string;
    address: string;
    phone: string;
    email: string;
    bank: string;
    ifsc: string;
    accountNo: string;
    accountName: string;
    accountType: string;
    pan: string;
  };
  client: {
    name: string;
    email?: string | null;
    address?: string | null;
  };
  items: TemplateLineItem[];
  total: number;
  notes?: string | null;
  // Payment details (only for paid invoices)
  payment?: {
    paidDate: string;
    tdsSection?: string | null;
    tdsRate?: number | null;
    tdsAmount: number;
    netReceived: number;
  } | null;
  signatureBase64?: string | null;
}

function fmtCurr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function escHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
}

// Simple markdown-ish to HTML (bold, italic, bullets)
function richText(s: string): string {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")     // **bold**
    .replace(/\*(.+?)\*/g, "<em>$1</em>")                  // *italic*
    .replace(/^  [-•] (.+)$/gm, '<div style="padding-left:24px;text-indent:-12px">• $1</div>') // indented bullet (check first)
    .replace(/^[-•] (.+)$/gm, '<div style="padding-left:12px;text-indent:-12px">• $1</div>')  // - bullet
    .replace(/<\/div>\n/g, "</div>")                        // strip \n after bullet divs
    .replace(/\n/g, "<br>");
}

function itemRows(d: TemplateData) {
  const showQtyRate = d.items.some((li) => li.qty !== 1);
  return { showQtyRate, rows: d.items };
}

// Shared payment/TDS summary block
function paymentSummaryHtml(d: TemplateData, accentColor: string) {
  if (!d.payment) return "";
  const p = d.payment;
  const tdsLabel = p.tdsAmount
    ? `TDS Withheld${p.tdsSection ? ` (${p.tdsSection}${p.tdsRate ? ` @ ${p.tdsRate}%` : ""})` : ""}: ${fmtCurr(p.tdsAmount)}`
    : "";
  return `
  <div style="margin-top:16px;padding-top:12px;border-top:1px solid ${accentColor}20">
    <div style="font-size:9px;font-weight:600;color:${accentColor};text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Payment Received</div>
    <div style="font-size:10px;line-height:1.8">
      <div>Date: ${p.paidDate} &nbsp;&middot;&nbsp; Mode: Bank Transfer</div>
      <div>Amount Received: ${fmtCurr(p.netReceived)}${tdsLabel ? ` &nbsp;&middot;&nbsp; ${tdsLabel}` : ""}</div>
    </div>
  </div>`;
}

// Status badge (preview only — hidden in PDF downloads)
function statusBadgeHtml(status: string, forPdf?: boolean) {
  if (forPdf) return "";
  const colors: Record<string, { bg: string; text: string }> = {
    draft: { bg: "#fee2e2", text: "#b91c1c" },
    sent: { bg: "#fef9c3", text: "#854d0e" },
    paid: { bg: "#dcfce7", text: "#16a34a" },
    cancelled: { bg: "#f3f4f6", text: "#6b7280" },
  };
  const c = colors[status] || colors.sent;
  return `<span style="background:${c.bg};color:${c.text};font-size:13px;font-weight:700;padding:5px 14px;border-radius:6px;margin-left:14px;vertical-align:middle;text-transform:capitalize;letter-spacing:0.5px">${status}</span>`;
}

// Signature block
function signatureHtml(d: TemplateData) {
  if (!d.signatureBase64) return "";
  return `
  <div style="text-align:left">
    <img src="${d.signatureBase64}" style="height:50px;opacity:0.85" />
    <div style="font-size:8px;color:#999;margin-top:2px">Authorised Signatory</div>
  </div>`;
}

// ─────────────────────────────────────────────
// TEMPLATE: ARTISTIC (warm, editorial, inspired by mymind + Athulya's illustration style)
// Warm tones, serif headings, generous spacing, soft shapes
// ─────────────────────────────────────────────

function artistic(d: TemplateData): string {
  const { showQtyRate, rows } = itemRows(d);
  const addr = d.business.address.replace(/\n/g, "<br>");
  const clientAddr = d.client.address ? d.client.address.replace(/\n/g, "<br>") : "";
  const accent = "#c2703e";

  const descWidth = showQtyRate ? "width:55%" : "width:75%";
  const itemsHtml = rows.map((li) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f5ebe0;font-size:11px;vertical-align:top;${descWidth}">
        <div style="font-weight:500;color:#3d2c1e">${escHtml(li.description)}</div>
        ${li.details ? `<div style="margin-top:4px;font-size:10px;color:#a08b76;line-height:1.6">${richText(li.details)}</div>` : ""}
      </td>
      ${showQtyRate ? `<td style="padding:10px 16px;border-bottom:1px solid #f5ebe0;font-size:11px;text-align:right;vertical-align:top;color:#a08b76;white-space:nowrap">${li.qty}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #f5ebe0;font-size:11px;text-align:right;vertical-align:top;color:#a08b76;white-space:nowrap">${fmtCurr(li.rate)}</td>` : ""}
      <td style="padding:10px 0;border-bottom:1px solid #f5ebe0;font-size:11px;text-align:right;vertical-align:top;font-weight:500;color:#3d2c1e;white-space:nowrap">${fmtCurr(li.amount)}</td>
    </tr>`).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500&family=Inter:wght@400;500;600&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;font-size:11px;color:#3d2c1e;padding:40px;max-width:800px;margin:0 auto;background:#fffbf7}
table{table-layout:fixed;width:100%;border-collapse:collapse}
</style></head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px">
  <div>
    <div style="font-family:'Playfair Display',Georgia,serif;font-size:28px;font-weight:700;color:${accent};letter-spacing:-0.5px">Invoice${statusBadgeHtml(d.status, d.forPdf)}</div>
    <div style="font-size:10px;color:#a08b76;margin-top:4px;letter-spacing:1px">${d.invoiceNumber}</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:9px;color:#a08b76;text-transform:uppercase;letter-spacing:1px">Date</div>
    <div style="font-size:11px;font-weight:500;margin-top:2px">${d.invoiceDate}</div>
    <div style="font-size:9px;color:#a08b76;text-transform:uppercase;letter-spacing:1px;margin-top:10px">Due</div>
    <div style="font-size:11px;font-weight:500;margin-top:2px">${d.dueDate}</div>
  </div>
</div>

<div style="display:flex;gap:40px;margin-bottom:28px">
  <div style="flex:1">
    <div style="font-size:9px;color:#a08b76;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px">From</div>
    <div style="font-weight:600;font-size:12px">${d.business.name}</div>
    <div style="font-size:9px;color:#a08b76;margin-top:6px;line-height:1.7">${addr}</div>
    ${d.business.email ? `<div style="font-size:9px;color:#a08b76;margin-top:2px">${d.business.email}</div>` : ""}
    ${d.business.phone ? `<div style="font-size:9px;color:#a08b76;margin-top:2px">${d.business.phone}</div>` : ""}
  </div>
  <div style="flex:1">
    <div style="font-size:9px;color:#a08b76;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px">To</div>
    <div style="font-weight:600;font-size:12px">${d.client.name}</div>
    ${d.client.email ? `<div style="font-size:9px;color:#a08b76;margin-top:6px">${d.client.email}</div>` : ""}
    ${clientAddr ? `<div style="font-size:9px;color:#a08b76;margin-top:4px;line-height:1.7">${clientAddr}</div>` : ""}
  </div>
</div>

<div style="width:40px;height:2px;background:${accent};margin-bottom:16px"></div>

<table>
  <thead><tr>
    <th style="text-align:left;font-size:9px;padding:10px 0;border-bottom:1px solid #e8ddd0;text-transform:uppercase;letter-spacing:1.5px;color:#a08b76;font-weight:500;${descWidth}">Description</th>
    ${showQtyRate ? '<th style="text-align:right;font-size:9px;padding:10px 16px;border-bottom:1px solid #e8ddd0;text-transform:uppercase;letter-spacing:1.5px;color:#a08b76;font-weight:500;width:60px">Qty</th><th style="text-align:right;font-size:9px;padding:10px 16px;border-bottom:1px solid #e8ddd0;text-transform:uppercase;letter-spacing:1.5px;color:#a08b76;font-weight:500;width:100px">Rate</th>' : ''}
    <th style="text-align:right;font-size:9px;padding:10px 0;border-bottom:1px solid #e8ddd0;text-transform:uppercase;letter-spacing:1.5px;color:#a08b76;font-weight:500;width:110px">Amount</th>
  </tr></thead>
  <tbody>
    ${itemsHtml}
  </tbody>
</table>

<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:14px;padding-top:12px;border-top:2px solid ${accent}">
  ${signatureHtml(d) || '<div></div>'}
  <div style="text-align:right">
    <div style="font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:700;color:${accent}">${fmtCurr(d.total)}</div>
    <div style="font-size:8px;color:#a08b76;margin-top:4px;letter-spacing:0.5px">${amountInWords(d.total)}</div>
  </div>
</div>

${d.notes ? `<div style="margin-top:20px;padding-top:12px;border-top:1px solid #f5ebe0"><div style="font-size:9px;color:#a08b76;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">Terms &amp; Conditions</div><div style="font-size:10px;color:#7a6b5d;line-height:1.6">${richText(d.notes)}</div></div>` : ""}

<div style="margin-top:20px;padding-top:12px;border-top:1px solid #f5ebe0">
  <div style="font-size:9px;color:#a08b76;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px">Payment Details</div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px 24px;font-size:10px">
    <div><span style="color:#a08b76">Account Name</span><br><span style="font-weight:500">${d.business.accountName}</span></div>
    <div><span style="color:#a08b76">Account No</span><br><span style="font-weight:500">${d.business.accountNo}</span></div>
    <div><span style="color:#a08b76">Bank</span><br><span style="font-weight:500">${d.business.bank}</span></div>
    <div><span style="color:#a08b76">IFSC</span><br><span style="font-weight:500">${d.business.ifsc}</span></div>
    <div><span style="color:#a08b76">Account Type</span><br><span style="font-weight:500">${d.business.accountType}</span></div>
    <div><span style="color:#a08b76">PAN</span><br><span style="font-weight:500">${d.business.pan}</span></div>
  </div>
</div>
${paymentSummaryHtml(d, accent)}
</body></html>`;
}


// ─────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────

const templates: Record<string, (d: TemplateData) => string> = {
  artistic,
};

function cancelledWatermarkHtml(): string {
  return `<div style="position:fixed;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:9999">
    <div style="transform:rotate(-35deg);font-size:100px;font-weight:900;color:rgba(220,38,38,0.08);text-transform:uppercase;letter-spacing:12px;white-space:nowrap">Cancelled</div>
  </div>`;
}

export function renderInvoiceHtml(templateName: string, data: TemplateData): string {
  const fn = templates[templateName] || templates.artistic;
  let html = fn(data);
  if (data.status === "cancelled") {
    html = html.replace("</body>", cancelledWatermarkHtml() + "</body>");
  }
  return html;
}

export type { TemplateData, TemplateLineItem };
