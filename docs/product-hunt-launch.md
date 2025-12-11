# CSVLens Product Hunt Launch Package

## Tagline (60 chars max)
**"Analyze CSVs with AI. No upload. Data never leaves your browser."**

---

## One-liner Description
Ask questions about your data in plain English, get instant charts. Your CSV stays on your computer—powered by DuckDB WASM and Claude AI.

---

## Full Description

**The problem:** Every time you need to explore a CSV, you're stuck choosing between:
- Uploading sensitive data to cloud tools (privacy nightmare)
- Wrestling with Excel formulas for an hour
- Spinning up a database just to run a few queries
- Learning SQL when you just want an answer

**CSVLens fixes this.**

Drop your CSV. Ask "What were our top 10 customers last quarter?" Get an instant chart. Done.

### How it works:
1. **Drag & drop your CSV** — Files load in seconds, not hours. Even massive datasets.
2. **Ask in plain English** — "Show revenue by month" or "Which products are underperforming?"
3. **Get instant insights** — AI generates SQL, runs it locally, and picks the perfect chart.

### Why CSVLens is different:

**Your data never leaves your browser.** We use DuckDB WASM to run SQL entirely client-side. No upload. No server storage. No privacy risk. This isn't a premium feature—it's how we're built.

**No SQL required.** Claude AI translates your questions into queries. Power users can see and edit the generated SQL.

**Blazing fast.** No waiting for uploads. No ETL pipelines. No infrastructure. Just answers.

### Features:
- Natural language queries powered by Claude AI
- Auto-generated charts (bar, line, pie, scatter, tables)
- Load up to 5 CSVs and join them on the fly
- Agentic analysis mode for complex, multi-step reasoning
- Pin insights to build dashboards
- 100% browser-based—works on laptop or tablet

### Pricing:
- **Free:** All features included, generous monthly usage
- **Pro ($12/mo):** Unlimited datasets, PDF/PNG export, priority support

We built CSVLens because we were tired of choosing between privacy and productivity. Now you don't have to.

---

## Maker Comment (First Comment)

Hey Product Hunt! 👋

I'm the maker of CSVLens. Here's the story:

I kept running into the same frustration: I'd get a CSV export from our CRM/database/whatever, and I just wanted to ask "what's our revenue trend?" But my options were:

1. Upload it to some SaaS tool (not happening with customer data)
2. Spend 30 mins in Excel pivot table hell
3. Fire up a Jupyter notebook

None of these felt right for a 2-minute question.

So I built CSVLens. The key insight: **DuckDB can run entirely in your browser via WebAssembly.** That means we can execute real SQL on your data without it ever leaving your computer.

Combine that with Claude AI for natural language → SQL translation, and you get something magical: drop a CSV, ask a question, get a chart. No upload. No infrastructure. No SQL knowledge needed.

**Some things I'm proud of:**
- Privacy isn't a setting—it's the architecture
- Large files load in seconds (try it with a 100MB CSV!)
- The AI picks the right chart type automatically
- You can load multiple CSVs and join them

**What I'd love feedback on:**
- What features would make this indispensable for you?
- Any edge cases where the AI struggles?

Happy to answer any questions. Thanks for checking it out! 🙏

---

## Image Descriptions (5 Images)

### Image 1: Hero Shot (1270x760)
**Filename:** `csvlens-hero.png`

**Description:** Full browser screenshot showing the main app interface. Left sidebar shows a loaded CSV file called "sales_2024.csv". Center shows a natural language input with the query "Show me revenue by month for 2024". Below is a beautiful gradient bar chart with 12 bars (Jan-Dec) in blue-to-gold gradient, trending upward. The chart has clean labels and a "Monthly Revenue" title. Top-right corner shows the privacy badge "Data stays local". Dark theme with the signature gold (#f0b429) accent color.

**Purpose:** Shows the core value prop in one glance—ask a question, get a chart.

---

### Image 2: The "No Upload" Differentiator (1270x760)
**Filename:** `csvlens-privacy.png`

**Description:** Split-screen comparison.

Left side (labeled "Other Tools"): Shows a loading spinner with "Uploading 250MB file... 47% complete" and estimated time "~8 minutes remaining". Red warning icon.

Right side (labeled "CSVLens"): Shows the same file loaded instantly with a green checkmark and text "Loaded in 1.2 seconds". Below: "Your data stays in your browser. Zero upload. Zero risk."

Bottom banner: "Powered by DuckDB WASM — SQL runs entirely client-side"

**Purpose:** Visually hammers the speed + privacy advantage.

---

### Image 3: Natural Language → SQL → Chart Flow (1270x760)
**Filename:** `csvlens-flow.png`

**Description:** Three-panel horizontal flow with arrows between each:

**Panel 1 - "Ask":** Shows the chat input with query "Which customers spent the most last quarter?"

**Panel 2 - "AI Generates SQL":** Shows generated SQL code:
```sql
SELECT customer_name, SUM(amount) as total
FROM sales
WHERE date >= '2024-07-01'
GROUP BY customer_name
ORDER BY total DESC
LIMIT 10
```
With a small Claude AI logo.

**Panel 3 - "Get Insights":** Shows a horizontal bar chart of top 10 customers with company names and revenue bars.

**Purpose:** Demystifies the AI—shows it's real SQL under the hood, not magic.

---

### Image 4: Multi-Dataset Analysis (1270x760)
**Filename:** `csvlens-multi-dataset.png`

**Description:** App interface showing three CSV files loaded in the sidebar:
- `customers.csv` (1,247 rows)
- `orders.csv` (15,832 rows)
- `products.csv` (89 rows)

Center shows query: "Show total revenue by customer segment, including product category breakdown"

Result displays a stacked bar chart with customer segments (Enterprise, SMB, Startup) on X-axis, revenue on Y-axis, with stacked colors for product categories.

Small callout bubble: "AI automatically joins your tables"

**Purpose:** Shows power-user capability—multi-file analysis without manual joins.

---

### Image 5: Dashboard Builder (1270x760)
**Filename:** `csvlens-dashboard.png`

**Description:** Dashboard view with 4 pinned cards in a grid layout:

1. **Top-left:** Line chart "Revenue Trend (12 months)"
2. **Top-right:** Pie chart "Revenue by Region"
3. **Bottom-left:** Number card "Total Revenue: $2.4M" with +12% indicator
4. **Bottom-right:** Bar chart "Top 5 Products"

Each card has a small pin icon and refresh button. Header shows "My Dashboard" with export button.

**Purpose:** Shows CSVLens isn't just for one-off queries—you can build persistent views.

---

## Social Media Teasers

### Twitter/X Launch Thread

**Tweet 1:**
```
Just launched CSVLens on Product Hunt 🚀

Drop a CSV. Ask "what's my revenue by month?" Get a chart.

No upload. No SQL. No Excel formulas.

Your data literally never leaves your browser.

[Link] 👇
```

**Tweet 2:**
```
How it works:

1. DuckDB runs entirely in your browser (WebAssembly)
2. Claude AI translates English → SQL
3. Query executes locally, chart appears

Privacy isn't a feature. It's the architecture.
```

**Tweet 3:**
```
Built this because I was tired of:

❌ Uploading sensitive data to cloud tools
❌ 30-min Excel pivot table sessions
❌ Spinning up Jupyter for a 2-min question

Now I just ask the question. Try it free 👇
```

---

### LinkedIn Post

```
I just launched CSVLens on Product Hunt.

Here's the problem I kept running into:

I'd get a CSV export—sales data, customer list, whatever—and I just wanted a quick answer. "What's our revenue trend?" "Which products are underperforming?"

But my options were:
→ Upload to a cloud tool (not happening with sensitive data)
→ Battle Excel formulas for an hour
→ Set up a whole analytics pipeline

For a 2-minute question? Ridiculous.

So I built CSVLens.

The key insight: DuckDB can run SQL entirely in your browser via WebAssembly. No upload needed. Your data never touches a server.

Combine that with AI for natural language queries, and you get:
• Drop CSV
• Ask "show revenue by month"
• Get chart instantly

Free to start. Pro tier for power users at $12/month.

Check it out on Product Hunt today: [Link]

Would love your feedback—what would make this indispensable for your workflow?
```

---

## Suggested Launch Day Schedule

| Time (PT) | Action |
|-----------|--------|
| 12:01 AM | Launch goes live |
| 6:00 AM | First social push (Twitter thread) |
| 8:00 AM | LinkedIn post |
| 9:00 AM | Reply to early comments on PH |
| 12:00 PM | Second Twitter push with demo GIF |
| 3:00 PM | Engage with related communities (Reddit r/dataisbeautiful, HN) |
| 6:00 PM | Thank supporters, share progress |
| 9:00 PM | Final push before day ends |

---

## Recommended Product Hunt Categories
1. **Productivity** (primary)
2. **Data Analytics**
3. **Artificial Intelligence**
4. **Developer Tools**
5. **Privacy**

---

## Hashtags
`#buildinpublic` `#AI` `#dataanalytics` `#privacyfirst` `#nocode` `#productivity` `#CSV` `#DuckDB`

---

## FAQ Responses (For Product Hunt Comments)

**Q: How does the AI work without seeing my data?**
> Great question! We only send your column names and your question to Claude AI. The AI generates SQL based on the schema, then that SQL runs entirely in your browser using DuckDB WASM. Your actual data rows never leave your computer.

**Q: What's the file size limit?**
> There's no hard limit—it depends on your browser's available memory. We've tested with files up to 500MB successfully. Most users work with files in the 10-100MB range without any issues.

**Q: Can I use this with Excel files?**
> Currently we support CSV files. Excel support (.xlsx) is on our roadmap! For now, you can export your Excel sheet to CSV and drop it in.

**Q: How is this different from ChatGPT's data analysis?**
> Two big differences: (1) Your data stays local—ChatGPT requires uploading your file to their servers. (2) We use DuckDB for SQL execution, which is much faster for large datasets than Python-based analysis.

**Q: Is there an API?**
> Not yet, but it's on the roadmap. If you have a specific use case, let us know—we'd love to hear what you'd build with it.

**Q: Can I self-host this?**
> The current version is SaaS-only, but we're considering an open-source or self-hosted option for enterprise customers. Reach out if that's important for your team.
