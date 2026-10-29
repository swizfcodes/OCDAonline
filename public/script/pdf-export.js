/* OCDA branded PDF reports.
   One renderer (OCDAPDF.report) gives every export the same layout: navy header band with the seal,
   title block, summary figures, styled tables with totals, and a footer with page numbers.
   OCDAReports.* fetch the data for each report and call the renderer. Requires jsPDF + jspdf-autotable.
   Note: the built-in PDF fonts can't draw the naira sign, so amounts are labelled NGN. */
(function () {
  "use strict";

  const C = {
    navy: "#081b29",
    navy2: "#112e42",
    sky: "#94c2d8",
    cyan: "#00bcd4",
    ink: "#0f1f2b",
    muted: "#5a6b79",
    line: "#dbe3ea",
    paper: "#f4f7fa",
    tint: "#e7f1f7",
  };
  const ORG = "OYIN-AKOKO COMMUNITY DEVELOPMENT ASSOCIATION";
  const ADDRESS = "Oloyin Palace, Oyin-Akoko, Ondo State, Nigeria";
  const SITE = "oyinakokocda.org";
  const HEADER_H = 24; // mm
  const TOP = HEADER_H + 10;

  // ------------------------------------------------------------------ formatting helpers
  const num = (v) =>
    Number(v || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const ngn = (v) => `NGN ${num(v)}`;
  const date = (v) => {
    if (!v) return "";
    const d = new Date(v);
    return isNaN(d) ? String(v) : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };
  const period = (from, to) =>
    from && to ? `${date(from)} to ${date(to)}` : from ? `From ${date(from)}` : to ? `Up to ${date(to)}` : "All dates";
  const titleCase = (t) => String(t || "").toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase());
  const slug = (t) => String(t).replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "");
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // ------------------------------------------------------------------ logo (webp -> png data URL, cached)
  let logoPromise = null;
  function loadLogo() {
    if (logoPromise) return logoPromise;
    logoPromise = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const c = document.createElement("canvas");
          c.width = c.height = 240;
          c.getContext("2d").drawImage(img, 0, 0, 240, 240);
          resolve(c.toDataURL("image/png"));
        } catch (_) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = "/photos/ocda-seal-480.webp";
    });
    return logoPromise;
  }

  function jsPDFCtor() {
    const J = window.jspdf && window.jspdf.jsPDF;
    if (!J) throw new Error("The PDF library didn't load. Check your connection and try again.");
    return J;
  }

  // ------------------------------------------------------------------ page chrome
  function drawHeader(doc, logo) {
    const W = doc.internal.pageSize.getWidth();
    let x = 12;
    if (logo) {
      doc.addImage(logo, "PNG", 12, 4.5, 15, 15);
      x = 31;
    }
    doc.setTextColor(C.navy2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(ORG, x, 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(C.muted);
    doc.text(ADDRESS, x, 16);
    doc.text(SITE, W - 12, 16, { align: "right" });
    doc.setDrawColor(C.line);
    doc.setLineWidth(0.4);
    doc.line(12, HEADER_H - 1, W - 12, HEADER_H - 1);
  }

  function drawFooter(doc, page, total, stamp) {
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    doc.setDrawColor(C.line);
    doc.setLineWidth(0.3);
    doc.line(12, H - 13, W - 12, H - 13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(C.muted);
    doc.text(`Generated ${stamp} from OCDA Online`, 12, H - 8);
    doc.text(`Page ${page} of ${total}`, W - 12, H - 8, { align: "right" });
  }

  // ------------------------------------------------------------------ renderer
  /**
   * spec = {
   *   title, subtitle, filename, orientation: "portrait"|"landscape",
   *   meta: [[label, value], ...],              // small facts under the title
   *   summary: [{ label, value }, ...],          // up to 4 highlighted figures
   *   blocks: [
   *     { type: "heading", text, note },
   *     { type: "table", head: [...], body: [[...]], foot: [[...]], align: { colIndex: "right" }, widths: { colIndex: mm } },
   *     { type: "kv", rows: [[label, value, { strong, indent }]] },   // statement-style rows
   *     { type: "total", label, value },
   *     { type: "note", text },
   *   ],
   * }
   */
  async function report(spec) {
    const JsPDF = jsPDFCtor();
    const logo = await loadLogo();
    const doc = new JsPDF({ unit: "mm", format: "a4", orientation: spec.orientation || "portrait" });
    if (typeof doc.autoTable !== "function") throw new Error("The PDF table plug-in didn't load.");

    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const L = 12;
    const R = W - 12;
    const bottomLimit = H - 22;
    let y = TOP;

    const ensure = (space) => {
      if (y + space > bottomLimit) {
        doc.addPage();
        y = TOP;
      }
    };

    // Title block
    doc.setTextColor(C.navy2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text(spec.title, L, y);
    y += 6.5;
    if (spec.subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(C.muted);
      doc.text(spec.subtitle, L, y);
      y += 6;
    }

    // Meta facts in a single band
    const meta = (spec.meta || []).filter((m) => m && m[1] !== undefined && m[1] !== "");
    if (meta.length) {
      y += 1;
      const colW = (R - L) / Math.min(meta.length, 4);
      const rows = Math.ceil(meta.length / 4);
      doc.setFillColor("#fafcfd");
      doc.setDrawColor(C.line);
      doc.setLineWidth(0.3);
      doc.roundedRect(L, y, R - L, 11 * rows + 2, 2, 2, "FD");
      meta.forEach(([label, value], i) => {
        const cx = L + 4 + (i % 4) * colW;
        const cy = y + 5 + Math.floor(i / 4) * 11;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(C.muted);
        doc.text(String(label).toUpperCase(), cx, cy);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(C.ink);
        doc.text(doc.splitTextToSize(String(value), colW - 6)[0], cx, cy + 4.6);
      });
      y += 11 * rows + 8;
    }

    // Highlighted figures
    const summary = (spec.summary || []).slice(0, 4);
    if (summary.length) {
      const gap = 4;
      const boxW = (R - L - gap * (summary.length - 1)) / summary.length;
      summary.forEach((s, i) => {
        const bx = L + i * (boxW + gap);
        const highlight = i === 0;
        doc.setFillColor("#ffffff");
        doc.setDrawColor(C.line);
        doc.setLineWidth(0.3);
        doc.roundedRect(bx, y, boxW, 18, 2, 2, "FD");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(C.muted);
        doc.text(String(s.label), bx + 4, y + 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(highlight ? C.navy2 : C.ink);
        doc.text(doc.splitTextToSize(String(s.value), boxW - 8)[0], bx + 4, y + 13);
      });
      y += 26;
    }

    const tableBase = {
      theme: "grid",
      margin: { left: L, right: 12, top: TOP, bottom: 20 },
      styles: { font: "helvetica", fontSize: 8.6, cellPadding: { top: 2, bottom: 2, left: 2.4, right: 2.4 }, textColor: C.ink, lineColor: C.line, lineWidth: 0.2, valign: "middle" },
      headStyles: { fillColor: "#eef3f7", textColor: C.navy2, fontStyle: "bold", fontSize: 8.4, lineColor: C.line, lineWidth: 0.2 },
      footStyles: { fillColor: "#f4f7fa", textColor: C.navy2, fontStyle: "bold", lineColor: C.line, lineWidth: 0.2 },
      alternateRowStyles: { fillColor: "#fbfcfd" },
      showHead: "everyPage",
      showFoot: "lastPage",
      rowPageBreak: "avoid",
    };

    for (const b of spec.blocks || []) {
      if (b.type === "heading") {
        ensure(22);
        y += 2;
        doc.setFillColor(C.sky);
        doc.rect(L, y - 3.6, 1.2, 5, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(C.navy2);
        doc.text(b.text, L + 4, y);
        if (b.note) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(C.muted);
          doc.text(b.note, R, y, { align: "right" });
        }
        y += 4;
      } else if (b.type === "table") {
        const columnStyles = {};
        Object.entries(b.align || {}).forEach(([i, a]) => (columnStyles[i] = Object.assign(columnStyles[i] || {}, { halign: a })));
        Object.entries(b.widths || {}).forEach(([i, w]) => (columnStyles[i] = Object.assign(columnStyles[i] || {}, { cellWidth: w })));
        doc.autoTable(
          Object.assign({}, tableBase, {
            startY: y,
            head: b.head ? [b.head] : undefined,
            body: b.body && b.body.length ? b.body : [[{ content: b.empty || "No records for this selection.", colSpan: (b.head || [1]).length, styles: { halign: "center", textColor: C.muted } }]],
            foot: b.foot,
            columnStyles,
            didParseCell(data) {
              // Totals rows in the body (marked with a leading "__total") get the foot look
              if (data.section === "body" && data.row.raw && data.row.raw.__total) {
                data.cell.styles.fillColor = "#f4f7fa";
                data.cell.styles.fontStyle = "bold";
              }
              if ((data.section === "foot" || data.section === "head") && columnStyles[data.column.index] && columnStyles[data.column.index].halign) {
                data.cell.styles.halign = columnStyles[data.column.index].halign;
              }
            },
          }),
        );
        y = doc.lastAutoTable.finalY + 8;
      } else if (b.type === "kv") {
        doc.autoTable({
          startY: y,
          margin: { left: L, right: 12, top: TOP, bottom: 20 },
          theme: "plain",
          styles: { font: "helvetica", fontSize: 9.5, cellPadding: { top: 2.6, bottom: 2.6, left: 3, right: 3 }, textColor: C.ink },
          columnStyles: { 1: { halign: "right", cellWidth: 55 } },
          body: b.rows.map(([label, value, opt = {}]) => [
            { content: label, styles: { fontStyle: opt.strong ? "bold" : "normal", cellPadding: { top: 2.6, bottom: 2.6, left: opt.indent ? 10 : 3, right: 3 }, textColor: opt.indent ? C.muted : C.ink, fillColor: opt.fill || false } },
            { content: value, styles: { fontStyle: opt.strong ? "bold" : "normal", textColor: opt.indent ? C.muted : C.ink, fillColor: opt.fill || false } },
          ]),
          didDrawCell(data) {
            const opt = b.rows[data.row.index][2] || {};
            if (opt.rule && data.column.index === 0) {
              doc.setDrawColor(opt.rule === "strong" ? C.navy2 : C.line);
              doc.setLineWidth(opt.rule === "strong" ? 0.6 : 0.25);
              doc.line(L, data.cell.y, R, data.cell.y);
            }
          },
        });
        y = doc.lastAutoTable.finalY + 8;
      } else if (b.type === "total") {
        ensure(16);
        const w = 92;
        doc.setFillColor("#f4f7fa");
        doc.setDrawColor(C.line);
        doc.setLineWidth(0.3);
        doc.roundedRect(R - w, y, w, 12, 2, 2, "FD");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(C.muted);
        doc.text(b.label, R - w + 4, y + 7.6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(C.navy2);
        doc.text(b.value, R - 4, y + 7.8, { align: "right" });
        y += 18;
      } else if (b.type === "note") {
        ensure(10);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8.5);
        doc.setTextColor(C.muted);
        doc.text(doc.splitTextToSize(b.text, R - L), L, y);
        y += 8;
      }
    }

    // Header and footer on every page
    const stamp = new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      drawHeader(doc, logo);
      drawFooter(doc, p, pages, stamp);
    }

    doc.setProperties({ title: `OCDA - ${spec.title}`, author: ORG, creator: "OCDA Online" });
    doc.save(spec.filename || `OCDA_${slug(spec.title)}_${today()}.pdf`);
  }

  // ------------------------------------------------------------------ data
  async function getJSON(url) {
    const token = localStorage.getItem("adminToken");
    const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: "same-origin" });
    let data = null;
    try { data = await res.json(); } catch (_) { /* ignore */ }
    if (!res.ok) throw new Error((data && data.message) || `Request failed (${res.status})`);
    return data;
  }
  const preparedBy = () => localStorage.getItem("adminName") || "";
  const sum = (rows, key = "amount") => rows.reduce((t, r) => t + Number(r[key] || 0), 0);
  const total = (cells) => Object.assign(cells, { __total: true });

  // ------------------------------------------------------------------ reports
  const OCDAReports = {
    async members() {
      const data = await getJSON("/admin/members");
      if (!Array.isArray(data) || !data.length) throw new Error("There are no members to export.");
      const wards = new Set(data.map((m) => m.Ward).filter(Boolean)).size;
      const male = data.filter((m) => m.Sex === "M").length;
      return report({
        title: "Register of Members",
        subtitle: "All registered members of the association",
        orientation: "landscape",
        filename: `OCDA_Members_${today()}.pdf`,
        meta: [["Prepared by", preparedBy()], ["Date", date(new Date())]],
        summary: [
          { label: "Registered members", value: data.length.toLocaleString() },
          { label: "Male", value: male.toLocaleString() },
          { label: "Female", value: data.filter((m) => m.Sex === "F").length.toLocaleString() },
          { label: "Wards represented", value: wards.toLocaleString() },
        ],
        blocks: [{
          type: "table",
          head: ["#", "Phone no.", "Surname", "Other names", "Title", "Sex", "Quarter", "Ward", "Town", "State"],
          body: data.map((m, i) => [i + 1, m.PhoneNumber || "", m.Surname || "", m.othernames || "", m.Title || "", m.Sex || "", m.Quarters || "", m.Ward || "", m.Town || "", m.State || ""]),
          align: { 0: "center", 5: "center" },
          widths: { 0: 10 },
        }],
      });
    },

    async memberLedger({ start, end } = {}) {
      const url = start && end ? `/admin/member-recordledger?from=${encodeURIComponent(start)}&to=${encodeURIComponent(end)}` : "/admin/memberledger";
      const data = await getJSON(url);
      if (!Array.isArray(data) || !data.length) throw new Error("No ledger records in this period.");
      const amount = sum(data);
      return report({
        title: "Member Ledger",
        subtitle: "Payments recorded against members",
        orientation: "landscape",
        filename: `OCDA_Member_Ledger_${start || "all"}_${end || "all"}.pdf`,
        meta: [["Period", period(start, end)], ["Prepared by", preparedBy()], ["Records", data.length.toLocaleString()]],
        summary: [
          { label: "Total received", value: ngn(amount) },
          { label: "Entries", value: data.length.toLocaleString() },
          { label: "Members who paid", value: new Set(data.map((r) => r.phoneno)).size.toLocaleString() },
        ],
        blocks: [{
          type: "table",
          head: ["#", "Phone no.", "Transaction date", "Description", "Amount (NGN)", "Recorded"],
          body: data.map((r, i) => [i + 1, r.phoneno || "", date(r.transdate), titleCase(r.remark), num(r.amount), date(r.paydate)]),
          foot: [["", "", "", "Total", num(amount), ""]],
          align: { 0: "center", 4: "right" },
          widths: { 0: 10 },
        }],
      });
    },

    async monthlySummary() {
      const data = await getJSON("/admin/monthlysummary");
      if (!Array.isArray(data) || !data.length) throw new Error("No monthly summaries have been generated yet.");
      const fmtPeriod = (p) => {
        const s = String(p || "");
        if (!/^\d{6}$/.test(s)) return s;
        return new Date(+s.slice(0, 4), +s.slice(4) - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
      };
      const latest = data[0];
      return report({
        title: "Monthly Summary",
        subtitle: "Opening balance, receipts, payments and closing balance by month",
        filename: `OCDA_Monthly_Summary_${today()}.pdf`,
        meta: [["Periods", data.length.toLocaleString()], ["Latest period", fmtPeriod(latest.period)], ["Prepared by", preparedBy()]],
        summary: [
          { label: `Net balance, ${fmtPeriod(latest.period)}`, value: ngn(latest.Netbalance) },
          { label: "Receipts that month", value: ngn(latest.Debitbalance) },
          { label: "Payments that month", value: ngn(latest.Creditbalance) },
        ],
        blocks: [{
          type: "table",
          head: ["Period", "Opening balance", "Receipts (debit)", "Payments (credit)", "Net balance"],
          body: data.map((r) => [fmtPeriod(r.period), num(r.openbalance), num(r.Debitbalance), num(r.Creditbalance), num(r.Netbalance)]),
          align: { 1: "right", 2: "right", 3: "right", 4: "right" },
        }, { type: "note", text: "All amounts in Nigerian naira (NGN)." }],
      });
    },

    async finalAccount({ from, to }) {
      if (!from || !to) throw new Error("Choose the start and end dates first.");
      const [acc, income, expenses] = await Promise.all([
        getJSON(`/admin/final-account?from=${from}&to=${to}`),
        getJSON(`/admin/ocda-income-analysis?start=${from}&end=${to}&mode=summary`).catch(() => []),
        getJSON(`/admin/ocda-expenses-analysis?start=${from}&end=${to}&mode=summary`).catch(() => []),
      ]);
      const inc = Array.isArray(income) ? income : [];
      const exp = Array.isArray(expenses) ? expenses : [];
      const rows = [
        [`Opening balance as at ${date(acc.fromDate || from)}`, num(acc.openingBalance), { strong: true, rule: "line" }],
        ["Add: Income", "", { strong: true, rule: "line" }],
        ...inc.map((r) => [titleCase(r.description?.trim() || r.code || "Other"), num(r.amount), { indent: true }]),
        ["Total income", num(acc.totalIncome), { strong: true, fill: "#f4f7fa" }],
        ["Less: Expenses", "", { strong: true, rule: "line" }],
        ...exp.map((r) => [titleCase(r.description?.trim() || r.code || "Other"), num(r.amount), { indent: true }]),
        ["Total expenses", num(acc.totalExpenses), { strong: true, fill: "#f4f7fa" }],
        [`Current balance as at ${date(acc.toDate || to)}`, num(acc.currentBalance), { strong: true, rule: "strong" }],
      ];
      return report({
        title: "Final Account",
        subtitle: "Statement of income and expenditure",
        filename: `OCDA_Final_Account_${from}_${to}.pdf`,
        meta: [["Period", period(from, to)], ["Prepared by", preparedBy()], ["Currency", "Nigerian naira (NGN)"]],
        summary: [
          { label: "Current balance", value: ngn(acc.currentBalance) },
          { label: "Opening balance", value: ngn(acc.openingBalance) },
          { label: "Total income", value: ngn(acc.totalIncome) },
          { label: "Total expenses", value: ngn(acc.totalExpenses) },
        ],
        blocks: [{ type: "heading", text: "Statement" }, { type: "kv", rows }],
      });
    },

    async expensesAnalysis({ mode = "summary", start, end, code = "ALL" }) {
      const params = new URLSearchParams({ start: start || "", end: end || "", code: code || "ALL", mode });
      const data = await getJSON(`/admin/ocda-expenses-analysis?${params}`);
      if (!Array.isArray(data) || !data.length) throw new Error("No expenses in this selection.");
      const grand = sum(data);
      const blocks = [];
      if (mode === "summary") {
        blocks.push({
          type: "table",
          head: ["Code", "Description", "Amount (NGN)"],
          body: data.map((r) => [r.code || "", titleCase(r.description), num(r.amount)]),
          foot: [["", "Total", num(grand)]],
          align: { 0: "center", 2: "right" },
          widths: { 0: 24, 2: 40 },
        });
      } else {
        const groups = {};
        data.forEach((r) => { const k = `${titleCase(r.description || r.code)} (${r.code})`; (groups[k] = groups[k] || []).push(r); });
        Object.entries(groups).forEach(([heading, rows]) => {
          blocks.push({ type: "heading", text: heading, note: ngn(sum(rows)) });
          blocks.push({
            type: "table",
            head: ["Date", "Voucher no.", "Remarks", "Amount (NGN)"],
            body: rows.map((r) => [date(r.date), r.voucher || "", r.remark || "", num(r.amount)]),
            foot: [["", "", "Subtotal", num(sum(rows))]],
            align: { 1: "center", 3: "right" },
            widths: { 0: 28, 1: 26, 3: 40 },
          });
        });
      }
      blocks.push({ type: "total", label: "Total expenses", value: ngn(grand) });
      return report({
        title: "Expenses Analysis",
        subtitle: mode === "summary" ? "Expenditure by expense code" : "Expenditure by expense code, with every voucher",
        orientation: "portrait",
        filename: `OCDA_Expenses_Analysis_${mode}_${start || "all"}_${end || "all"}.pdf`,
        meta: [["Period", period(start, end)], ["Mode", titleCase(mode)], ["Expense code", code || "ALL"], ["Prepared by", preparedBy()]],
        summary: [{ label: "Total expenses", value: ngn(grand) }, { label: mode === "summary" ? "Expense codes" : "Vouchers", value: data.length.toLocaleString() }],
        blocks,
      });
    },

    async incomeAnalysis({ mode = "summary", start, end, code = "ALL" }) {
      const params = new URLSearchParams({ start: start || "", end: end || "", code: code || "ALL", mode });
      const data = await getJSON(`/admin/ocda-income-analysis?${params}`);
      if (!Array.isArray(data) || !data.length) throw new Error("No income in this selection.");
      const blocks = [];
      let grand = 0;
      let count = 0;
      if (mode === "summary") {
        grand = sum(data);
        count = data.reduce((t, r) => t + Number(r.transaction_count || 0), 0);
        blocks.push({
          type: "table",
          head: ["Code", "Description", "Transactions", "Amount (NGN)"],
          body: data.map((r) => [r.code || "-", titleCase(r.description?.trim() || r.code || "N/A"), r.transaction_count || "", num(r.amount)]),
          foot: [["", "Total", count ? count.toLocaleString() : "", num(grand)]],
          align: { 0: "center", 2: "center", 3: "right" },
          widths: { 0: 24, 2: 28, 3: 40 },
        });
      } else {
        data.forEach((g) => {
          const txs = Array.isArray(g.transactions) ? g.transactions : [];
          const sub = sum(txs);
          grand += sub;
          count += txs.length;
          blocks.push({ type: "heading", text: titleCase(g.code), note: `${txs.length} payment${txs.length === 1 ? "" : "s"}  |  ${ngn(sub)}` });
          blocks.push({
            type: "table",
            head: ["Date", "Member", "Comment", "Amount (NGN)"],
            body: txs.map((t) => [date(t.date), t.phoneno_name || "", t.comment || "", num(t.amount)]),
            foot: [["", "", "Subtotal", num(sub)]],
            align: { 3: "right" },
            widths: { 0: 26, 3: 36 },
          });
        });
      }
      blocks.push({ type: "total", label: "Total income", value: ngn(grand) });
      return report({
        title: "Income Analysis",
        subtitle: mode === "summary" ? "Income by classification" : "Income by classification, with every payment",
        orientation: mode === "summary" ? "portrait" : "landscape",
        filename: `OCDA_Income_Analysis_${mode}_${start || "all"}_${end || "all"}.pdf`,
        meta: [["Period", period(start, end)], ["Mode", titleCase(mode)], ["Classification", code || "ALL"], ["Prepared by", preparedBy()]],
        summary: [{ label: "Total income", value: ngn(grand) }, { label: "Payments", value: count.toLocaleString() }],
        blocks,
      });
    },

    async enquiry({ type = "member", param = "ALL", mode = "summary", start, end }) {
      const params = new URLSearchParams({ type, param, mode });
      if (start) params.append("start", start);
      if (end) params.append("end", end);
      const data = await getJSON(`/admin/enquiry?${params}`);
      const summary = (Array.isArray(data.summary) ? data.summary : []).filter((r) => (r.PhoneNumber || r.Ward || r.Quarters || r.Quarter) !== "ALL");
      const detail = Array.isArray(data.detail) ? data.detail : [];
      const label = { member: "Member", ward: "Ward", quarter: "Quarter" }[type] || "Member";
      const grand = summary.reduce((t, r) => t + Number(r.total || 0), 0);
      const blocks = [{ type: "heading", text: `${label} summary` }];

      if (type === "member") {
        blocks.push({ type: "table", head: ["#", "Phone no.", "Name", "Total (NGN)"], body: summary.map((r, i) => [i + 1, r.PhoneNumber || r.phoneno || "", r.fullname || "", num(r.total)]), foot: [["", "", "Total", num(grand)]], align: { 0: "center", 3: "right" }, widths: { 0: 10, 3: 40 } });
      } else {
        const key = type === "ward" ? (r) => r.Ward : (r) => r.Quarters || r.Quarter;
        blocks.push({ type: "table", head: [label, "Total (NGN)"], body: summary.map((r) => [key(r) || "", num(r.total)]), foot: [["Total", num(grand)]], align: { 1: "right" }, widths: { 1: 50 } });
      }

      if (mode === "detail" && detail.length) {
        const perMember = (txs) => {
          const g = {};
          txs.forEach((t) => { g[t.phoneno] = g[t.phoneno] || { phoneno: t.phoneno, fullname: t.fullname, total: 0 }; g[t.phoneno].total += Number(t.amount || 0); });
          return Object.values(g);
        };
        if (type === "member") {
          const groups = {};
          detail.forEach((t) => (groups[t.phoneno] = groups[t.phoneno] || []).push(t));
          Object.entries(groups).forEach(([phone, txs]) => {
            blocks.push({ type: "heading", text: `${txs[0]?.fullname || ""}  (${phone})`, note: ngn(sum(txs)) });
            blocks.push({ type: "table", head: ["Date", "Description", "Amount (NGN)"], body: txs.map((t) => [date(t.transdate), titleCase(t.remark), num(t.amount)]), foot: [["", "Subtotal", num(sum(txs))]], align: { 2: "right" }, widths: { 0: 30, 2: 40 } });
          });
        } else if (type === "ward") {
          detail.forEach((w) => {
            const members = perMember(Array.isArray(w.members) ? w.members : []);
            blocks.push({ type: "heading", text: `Ward: ${w.ward}`, note: ngn(sum(members, "total")) });
            blocks.push({ type: "table", head: ["Phone no.", "Name", "Total (NGN)"], body: members.map((m) => [m.phoneno, m.fullname, num(m.total)]), foot: [["", "Ward total", num(sum(members, "total"))]], align: { 2: "right" }, widths: { 2: 40 } });
          });
        } else {
          detail.forEach((q) => {
            const wards = Array.isArray(q.wards) ? q.wards : [];
            const qTotal = wards.reduce((t, w) => t + sum(Array.isArray(w.members) ? w.members : []), 0);
            blocks.push({ type: "heading", text: `Quarter: ${q.quarter}`, note: ngn(qTotal) });
            const body = [];
            wards.forEach((w) => {
              const members = perMember(Array.isArray(w.members) ? w.members : []);
              body.push(total([{ content: `Ward: ${w.ward}`, colSpan: 2 }, num(sum(members, "total"))]));
              members.forEach((m) => body.push([m.phoneno, m.fullname, num(m.total)]));
            });
            blocks.push({ type: "table", head: ["Phone no.", "Name", "Total (NGN)"], body, align: { 2: "right" }, widths: { 2: 40 } });
          });
        }
      }
      blocks.push({ type: "total", label: "Grand total", value: ngn(grand) });

      return report({
        title: `${label} Enquiry`,
        subtitle: mode === "detail" ? "Contributions with transaction detail" : "Contributions summary",
        orientation: "portrait",
        filename: `OCDA_Enquiry_${type}_${mode}_${start || "all"}_${end || "all"}.pdf`,
        meta: [["Period", period(start, end)], ["Filter", param === "ALL" ? `All ${label.toLowerCase()}s` : param], ["Mode", titleCase(mode)], ["Prepared by", preparedBy()]],
        summary: [{ label: "Grand total", value: ngn(grand) }, { label: `${label}s listed`, value: summary.length.toLocaleString() }],
        blocks,
      });
    },

    async paymentSchedule({ fromMonth, fromYear, toMonth, toYear, remark = "ALL", remarkLabel }) {
      if (!fromYear || !toYear) throw new Error("Enter both the From year and the To year.");
      const params = new URLSearchParams({ fromMonth, fromYear, toMonth, toYear, remark });
      const data = await getJSON(`/admin/payment-schedule?${params}`);
      const cols = Array.isArray(data.columns) ? data.columns : [];
      const members = Array.isArray(data.members) ? data.members : [];
      if (!members.length) throw new Error("No payments in this period.");
      const M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const head = ["#", "Member", ...cols.map((c) => `${M[c.month - 1]} ${String(c.year).slice(2)}`), "Total"];
      const colTotals = cols.map((_, i) => members.reduce((t, m) => t + Number(m.monthly[i] || 0), 0));
      const align = { 0: "center" };
      head.forEach((_, i) => { if (i >= 2) align[i] = "right"; });
      const label = remark === "ALL" ? "All income" : remarkLabel || remark;
      const fromLabel = `${M[fromMonth - 1]} ${fromYear}`;
      const toLabel = `${M[toMonth - 1]} ${toYear}`;
      return report({
        title: "Member Payment Schedule",
        subtitle: `${label}, month by month`,
        orientation: "landscape",
        filename: `OCDA_Payment_Schedule_${fromYear}-${fromMonth}_${toYear}-${toMonth}.pdf`,
        meta: [["Period", `${fromLabel} to ${toLabel}`], ["Income", label], ["Members", members.length.toLocaleString()], ["Prepared by", preparedBy()]],
        summary: [{ label: "Total received", value: ngn(data.grandTotal) }, { label: "Members who paid", value: members.length.toLocaleString() }, { label: "Months", value: cols.length.toLocaleString() }],
        blocks: [{
          type: "table",
          head,
          body: members.map((m, i) => [i + 1, m.fullname, ...m.monthly.map((v) => (Number(v) ? num(v) : "-")), num(m.total)]),
          foot: [["", "Total", ...colTotals.map(num), num(data.grandTotal)]],
          align,
          widths: { 0: 9, 1: 52 },
        }],
      });
    },

    /** Member portal statement. `me` = /api/me, `rows` = receipts already filtered. */
    async memberStatement({ me, rows, from, to }) {
      const amount = sum(rows);
      const name = [me.title, me.othernames, me.surname].filter(Boolean).join(" ");
      return report({
        title: "Statement of Contributions",
        subtitle: name,
        filename: `OCDA_Statement_${me.phoneNumber}_${today()}.pdf`,
        meta: [["Member ID", me.id], ["Phone", me.phoneNumber], ["Ward / quarter", [me.ward, me.quarters].filter(Boolean).join(", ")], ["Period", period(from, to)]],
        summary: [{ label: "Total contributed", value: ngn(amount) }, { label: "Payments", value: rows.length.toLocaleString() }, { label: "Last payment", value: rows[0] ? date(rows[0].transdate) : "-" }],
        blocks: [{
          type: "table",
          head: ["#", "Date", "Description", "Amount (NGN)", "Recorded"],
          body: rows.map((r, i) => [i + 1, date(r.transdate), titleCase(r.remark), num(r.amount), date(r.paydate)]),
          foot: [["", "", "Total", num(amount), ""]],
          align: { 0: "center", 3: "right" },
          widths: { 0: 10 },
          empty: "No payments in this period.",
        }, { type: "note", text: "This statement lists payments recorded by the association's treasurer. Contact the secretariat if anything is missing." }],
      });
    },
  };

  /** Wrap an export button: shows progress, keeps the button's icon, reports errors. */
  async function run(button, task, onError) {
    const original = button ? button.innerHTML : "";
    if (button) {
      button.disabled = true;
      button.textContent = "Preparing PDF…";
    }
    try {
      await task();
    } catch (err) {
      console.error("PDF export failed:", err);
      (onError || ((m) => alert(m)))(err.message || "The PDF couldn't be created.");
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML = original;
      }
    }
  }

  window.OCDAPDF = { report, run, format: { num, ngn, date, period, titleCase } };
  window.OCDAReports = OCDAReports;
})();
