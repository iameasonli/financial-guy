# Financial Guy — Quantitative Financial Modeling & Market Analytics Platform

[![Live Website](https://img.shields.io/badge/Live_Platform-GitHub_Pages-2ea44f?style=for-the-badge&logo=github)](https://iameasonli.github.io/financial-guy/index.html)
[![Tech Stack](https://img.shields.io/badge/Stack-HTML5_%7C_CSS3_%7C_Vanilla_JS-15171a?style=for-the-badge)]()
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)]()

> **Operational Status:** Previously operated under an independent production domain; migrated to **GitHub Pages** in October 2026 as a permanent, open-source quantitative finance portfolio and toolset.

**Financial Guy** is a lightweight, zero-dependency web platform designed to make corporate valuation, personal wealth planning, and global market monitoring intuitive and clutter-free. Created and maintained by **Mingyu Li**.

---

## Core Modules & Financial Methodology

### 1. Real-Time Global Market Dashboard (`index.html`)
* **Global Exchange Status Map:** Built with `Leaflet.js` and `Intl.DateTimeFormat` timezone engines to monitor real-time trading statuses (`Open` / `Closed` / `Weekend`) across **14 major global exchanges** (NYSE/NASDAQ, TSX, LSE, XETRA, Euronext, TSE, HKEX, SSE, SGX, KRX, NSE, ASX, NZX, B3).
* **Fault-Tolerant Financial News Engine:** Integrates Benzinga RSS feeds using an asynchronous multi-proxy fallback architecture (`rss2json` + 4 CORS failover proxies) with automated 15-minute polling.
* **Market Heatmaps & Ticker Tape:** Embedded TradingView S&P 500 sector treemaps and real-time G10 currency strength matrices.

### 2. Corporate Valuation: DCF & WACC Model (`dcf.html`)
* **CAPM & WACC Engine:** Automatically computes Cost of Equity ($R_e = R_f + \beta \times ERP$) and after-tax Weighted Average Cost of Capital:

$$WACC = \left(\frac{E}{V} \times R_e\right) + \left(\frac{D}{V} \times R_d \times (1 - T)\right)$$

* **5-Year FCFF Projection:** Derives Free Cash Flow to Firm ($FCFF = \text{EBIT}(1 - T) + \text{DA} - \text{CapEx} - \Delta \text{NWC}$) and discounts cash flows to Present Value.
* **Dual Terminal Value Methods:** Supports both **Perpetuity Growth** ($TV = \frac{FCFF_n(1+g)}{WACC - g}$) and **Exit Multiple** ($\text{EV} / \text{EBITDA}$) approaches.
* **Sensitivity & Scenario Analysis:** Instant switching between `Base`, `Optimistic` (+5% rev growth, +2% EBIT margin, -1% WACC), and `Pessimistic` scenarios, complete with preset benchmark financial data (Amazon.com, Inc.).

### 3. Personal Wealth & Financial Planning Suite (`tools.html`)
* **Mortgage Amortization Engine (`mortgage.html`):** Supports Fixed vs. Variable interest rate adjustments, Monthly vs. Bi-weekly payment schedules, property tax/PMI/HOA inclusions, interactive CSS `conic-gradient` cost distribution charts, and full Year/Month amortization tables.
* **Investment Return Calculator (`investment.html`):** Models lump-sum ($PV$) + periodic annuity ($PMT$) compounding across customizable frequencies alongside Rule of 72 payback estimation.
* **Inflation-Adjusted Retirement Planner (`retirement.html`):** Projects required retirement corpus ($FV$) adjusted for inflation ($\pi$) and solves for required monthly savings ($PMT$) to bridge funding shortfalls.
* **Income Tax & Monthly Budget Planners (`tax.html`, `budget.html`):** Multi-bracket marginal tax rate calculator (comprehensive salary vs. standalone bonus) and categorical cash-flow surplus/deficit analyzer.

---

## Project Structure

```text
financial-guy/
├── index.html / index.css          # Real-Time Market Dashboard
├── dashboard.js                    # 14-Exchange Timezone & Leaflet Map Engine
├── benzinga-rss.js                 # Multi-Proxy Fault-Tolerant RSS News Parser
├── tools.html / tools.css          # Financial Calculators Hub (6 Core Tools)
├── dcf.html / dcf.css / dcf.js     # 5-Year DCF Valuation & WACC Sensitivity Model
├── mortgage.html / .css / .js      # Fixed/Variable Mortgage & Amortization Engine
├── investment.html / .css / .js    # Compounding & Annuity Return Calculator
├── retirement.html / .css / .js    # Inflation-Adjusted Retirement Corpus Planner
├── tax.html / .css / .js           # Progressive Marginal Tax Calculator
├── budget.html / .css / .js        # Personal Cash Flow & Budget Analyzer
├── costofauto.css / calc-compact.css # Shared Base & Compact UI Stylesheets
├── about.html / about.css          # Creator Profile & Product Changelog
└── picture/user.jpeg & logo.jpg    # Brand & Profile Assets
