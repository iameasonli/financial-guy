/**
 * DCF Discounted Cash Flow Model - Core Calculation Logic
 * Supports WACC calculation, multiple discount methods, and scenario analysis
 */

// Global variables
let currentScenario = 'base';

/**
 * Preset Company Financial Data
 * Note: Original data unit is million USD ($M), converted to M (million CNY)
 * Conversion formula: million USD × exchange rate (7) = M CNY
 * Example: $386,064M = 386,064 × 7 = 2,702,448 M
 */
const PRESET_COMPANIES = {
    amazon: {
        name: 'Amazon',
        currency: 'USD',
        exchangeRate: 7.0, // USD to CNY exchange rate (adjustable)
        // Forecast financial data (5 years, unit: M)
        forecastData: [
            {
                year: 2020,
                revenue: 2702448,      // $386,064M × 7 = 2,702,448 M
                ebit: 160293,         // $22,899M × 7 = 160,293 M
                depreciation: 176260,  // $25,180M × 7 = 176,260 M
                capex: 280980,        // ~$40,140M × 7 = 280,980 M
                wcChange: 94367,       // +$13,481M × 7 = 94,367 M
                taxRate: 25
            },
            {
                year: 2021,
                revenue: 3288754,      // $469,822M × 7 = 3,288,754 M
                ebit: 174153,         // $24,879M × 7 = 174,153 M
                depreciation: 241031,  // $34,433M × 7 = 241,031 M
                capex: 427371,        // ~$61,053M × 7 = 427,371 M
                wcChange: -137277,     // -$19,611M × 7 = -137,277 M
                taxRate: 25
            },
            {
                year: 2022,
                revenue: 3597881,      // $513,983M × 7 = 3,597,881 M
                ebit: 85736,          // $12,248M × 7 = 85,736 M
                depreciation: 293447,  // $41,921M × 7 = 293,447 M
                capex: 445515,        // ~$63,645M × 7 = 445,515 M
                wcChange: -146202,     // -$20,886M × 7 = -146,202 M
                taxRate: 25
            },
            {
                year: 2023,
                revenue: 4023495,      // $574,785M × 7 = 4,023,495 M
                ebit: 257964,         // $36,852M × 7 = 257,964 M
                depreciation: 340641,  // $48,663M × 7 = 340,641 M
                capex: 369103,        // ~$52,729M × 7 = 369,103 M
                wcChange: -80787,      // -$11,541M × 7 = -80,787 M
                taxRate: 25
            },
            {
                year: 2024,
                revenue: 4465713,      // $637,959M × 7 = 4,465,713 M
                ebit: 480151,         // $68,593M × 7 = 480,151 M
                depreciation: 363125,  // $51,875M × 7 = 363,125 M
                capex: 580993,        // ~$82,999M × 7 = 580,993 M
                wcChange: -108787,     // -$15,541M × 7 = -108,787 M
                taxRate: 25
            }
        ],
        // Latest financial data (2024)
        latestData: {
            totalDebt: 946540,         // ~$135,220M (median) × 7 = 946,540 M
            sharePrice: 150.0,         // Example share price in USD
            dilutedShares: 13345.27,   // Calculated: totalEquity / sharePrice = 2,001,790 / 150
            cash: 551453              // $78,779M × 7 = 551,453 M
        }
    }
    // More preset companies can be added here
};

/**
 * Initialize page
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded, initializing...');
    try {
        initializePage();
        setupEventListeners();
        
        // Ensure functions are available in global scope (for onclick)
        window.calculateDCF = calculateDCF;
        window.loadPresetData = loadPresetData;
        window.resetCalculation = resetCalculation;
        
        console.log('Initialization complete, global functions registered');
        console.log('loadPresetData function type:', typeof window.loadPresetData);
        console.log('PRESET_COMPANIES available companies:', Object.keys(PRESET_COMPANIES));
    } catch (error) {
        console.error('Initialization error:', error);
        alert('Page initialization error: ' + error.message);
    }
});

/**
 * Initialize page
 */
function initializePage() {
    console.log('Starting page initialization');
    
    // Wait a bit to ensure DOM is fully loaded
    setTimeout(() => {
        // Preset company selection event
        const presetSelect = document.getElementById('presetCompany');
        if (presetSelect) {
            console.log('Found preset company selector, binding event');
            presetSelect.addEventListener('change', function(e) {
                console.log('Preset company selection changed:', e.target.value);
                loadPresetData();
            });
            console.log('Preset company selection event bound');
            
            // Test: check if function is available
            console.log('loadPresetData function type:', typeof loadPresetData);
            console.log('PRESET_COMPANIES content:', PRESET_COMPANIES);
        } else {
            console.error('Preset company selector not found, retrying...');
            // Retry with delay
            setTimeout(() => {
                const retrySelect = document.getElementById('presetCompany');
                if (retrySelect) {
                    retrySelect.addEventListener('change', function(e) {
                        console.log('Preset company selection changed (retry):', e.target.value);
                        loadPresetData();
                    });
                    console.log('Preset company selection event bound (retry)');
                } else {
                    console.error('Preset company selector still not found after retry');
                }
            }, 500);
        }
    }, 100);
    
    // Terminal value method toggle
    const terminalMethod = document.getElementById('terminalValueMethod');
    if (terminalMethod) {
        terminalMethod.addEventListener('change', function(e) {
            const method = e.target.value;
            if (method === 'perpetuity') {
                document.getElementById('perpetuityGroup').style.display = 'block';
                document.getElementById('exitMultipleGroup').style.display = 'none';
            } else {
                document.getElementById('perpetuityGroup').style.display = 'none';
                document.getElementById('exitMultipleGroup').style.display = 'block';
            }
        });
    }
    
    // Scenario analysis toggle
    document.querySelectorAll('.scenario-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            switchScenario(this.dataset.scenario);
        });
    });
    
}


/**
 * Calculate Total Equity from Share Price and Diluted Shares
 */
function calculateTotalEquity() {
    const sharePrice = parseFloat(document.getElementById('sharePrice').value) || 0;
    const dilutedShares = parseFloat(document.getElementById('dilutedShares').value) || 0;
    const totalEquity = sharePrice * dilutedShares;
    
    const totalEquityInput = document.getElementById('totalEquity');
    if (totalEquityInput) {
        totalEquityInput.value = totalEquity.toFixed(2);
    }
    
    return totalEquity;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Auto-calculate Total Equity when share price or diluted shares change
    const sharePriceInput = document.getElementById('sharePrice');
    const dilutedSharesInput = document.getElementById('dilutedShares');
    
    if (sharePriceInput) {
        sharePriceInput.addEventListener('input', function() {
            calculateTotalEquity();
            calculateWACC();
        });
    }
    
    if (dilutedSharesInput) {
        dilutedSharesInput.addEventListener('input', function() {
            calculateTotalEquity();
            calculateWACC();
        });
    }
    
    // Auto-calculate WACC when parameters change
    const waccInputs = ['riskFreeRate', 'marketRiskPremium', 'beta', 'costOfDebt', 'taxRate', 'totalDebt', 'totalEquity'];
    waccInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', calculateWACC);
        }
    });
    
    // Initial calculation of Total Equity
    calculateTotalEquity();
}


/**
 * Get scenario adjustments
 */
function getScenarioAdjustments() {
    const scenarios = {
        base: { revenueGrowth: 0, ebitMargin: 0, wacc: 0 },
        optimistic: { revenueGrowth: 5, ebitMargin: 2, wacc: -1 },
        pessimistic: { revenueGrowth: -5, ebitMargin: -2, wacc: 1 }
    };
    
    return scenarios[currentScenario] || scenarios.base;
}

/**
 * Calculate WACC
 */
function calculateWACC() {
    // Get parameters
    const riskFreeRate = parseFloat(document.getElementById('riskFreeRate').value) || 0;
    const marketRiskPremium = parseFloat(document.getElementById('marketRiskPremium').value) || 0;
    const beta = parseFloat(document.getElementById('beta').value) || 0;
    const costOfDebt = parseFloat(document.getElementById('costOfDebt').value) || 0;
    const taxRate = parseFloat(document.getElementById('taxRate').value) || 0;
    const totalDebt = parseFloat(document.getElementById('totalDebt').value) || 0;
    const totalEquity = parseFloat(document.getElementById('totalEquity').value) || 0;
    
    // Calculate cost of equity (CAPM model)
    const costOfEquity = riskFreeRate + beta * marketRiskPremium;
    
    // Calculate capital structure
    const totalCapital = totalDebt + totalEquity;
    const debtWeight = totalCapital > 0 ? totalDebt / totalCapital : 0;
    const equityWeight = totalCapital > 0 ? totalEquity / totalCapital : 0;
    
    // Calculate base WACC
    // Cost of Debt is pre-tax, so we apply tax shield: Rd × (1 - T)
    let wacc = equityWeight * costOfEquity + debtWeight * costOfDebt * (1 - taxRate / 100);
    
    // Apply scenario adjustment to WACC
    const scenarioAdj = getScenarioAdjustments();
    wacc = wacc + scenarioAdj.wacc;
    
    // Display results
    document.getElementById('costOfEquity').textContent = (costOfEquity).toFixed(2) + '%';
    document.getElementById('costOfDebtDisplay').textContent = (costOfDebt).toFixed(2) + '%';
    document.getElementById('taxRateDisplay').textContent = (taxRate).toFixed(2) + '%';
    document.getElementById('debtWeight').textContent = (debtWeight * 100).toFixed(2) + '%';
    document.getElementById('equityWeight').textContent = (equityWeight * 100).toFixed(2) + '%';
    document.getElementById('waccResult').textContent = (wacc).toFixed(2) + '%';
    
    return wacc;
}

/**
 * Calculate DCF (global function)
 */
function calculateDCF() {
    console.log('Starting DCF calculation');
    
    // Validate required inputs
    const totalDebt = parseFloat(document.getElementById('totalDebt').value) || 0;
    const totalEquity = parseFloat(document.getElementById('totalEquity').value) || 0;
    
    if (totalDebt <= 0 && totalEquity <= 0) {
        alert('Please enter total debt and/or total equity');
        return;
    }
    
    // Get forecast data
    const cashflows = getForecastData();
    
    if (cashflows.length === 0) {
        alert('Please enter forecast data for at least one year');
        return;
    }
    
    // Get all parameters
    const params = getCalculationParams();
    
    // Calculate WACC
    const wacc = calculateWACC() / 100;
    
    if (wacc <= 0) {
        alert('WACC must be greater than 0. Please check your WACC parameters.');
        return;
    }
    
    // Calculate present values for forecast period
    const pvForecast = calculatePresentValue(cashflows, wacc);
    
    // Calculate terminal value
    const terminalValue = calculateTerminalValue(params, cashflows, wacc);
    
    // Calculate terminal value present value
    const pvTerminal = terminalValue / Math.pow(1 + wacc, cashflows.length);
    
    // Calculate enterprise value
    const enterpriseValue = pvForecast + pvTerminal;
    
    // Calculate equity value
    const netDebt = params.totalDebt - params.cash;
    const equityValue = enterpriseValue - netDebt;
    
    // Calculate value per share using diluted shares outstanding (in M)
    const dilutedShares = parseFloat(document.getElementById('dilutedShares').value) || 0;
    const valuePerShare = dilutedShares > 0 ? equityValue / dilutedShares : 0;
    
    // Display results
    displayResults({
        enterpriseValue,
        equityValue,
        valuePerShare,
        pvForecast,
        terminalValue,
        pvTerminal,
        netDebt,
        cashflows
    });
    
    // Show result section
    const resultSection = document.getElementById('resultSection');
    if (resultSection) {
        resultSection.style.display = 'block';
        // Scroll to results
        setTimeout(() => {
            resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
}

/**
 * Get forecast data from the transposed table
 * Table structure: rows = financial items, columns = years
 * Returns array of cashflow objects with year, revenue, ebit, etc.
 */
function getForecastData() {
    const cashflows = [];
    const tbody = document.getElementById('forecastDataBody');
    
    if (!tbody) {
        console.error('Forecast data table not found');
        return cashflows;
    }
    
    // Get scenario adjustments
    const scenarioAdj = getScenarioAdjustments();
    
    // Get all input fields by year (columns)
    // Year 1 is column index 1, Year 2 is column index 2, etc.
    for (let year = 1; year <= 5; year++) {
        // Find inputs with data-year attribute matching this year
        const revenueInput = tbody.querySelector(`.forecast-revenue[data-year="${year}"]`);
        const ebitInput = tbody.querySelector(`.forecast-ebit[data-year="${year}"]`);
        const depInput = tbody.querySelector(`.forecast-depreciation[data-year="${year}"]`);
        const capexInput = tbody.querySelector(`.forecast-capex[data-year="${year}"]`);
        const wcInput = tbody.querySelector(`.forecast-wc-change[data-year="${year}"]`);
        const taxInput = tbody.querySelector(`.forecast-tax-rate[data-year="${year}"]`);
        
        if (!revenueInput) continue;
        
        let revenue = parseFloat(revenueInput.value) || 0;
        let ebit = ebitInput ? parseFloat(ebitInput.value) || 0 : 0;
        const depreciation = depInput ? parseFloat(depInput.value) || 0 : 0;
        const capex = capexInput ? parseFloat(capexInput.value) || 0 : 0;
        const wcChange = wcInput ? parseFloat(wcInput.value) || 0 : 0;
        const taxRate = taxInput ? parseFloat(taxInput.value) || 25 : 25;
        
        // Apply scenario adjustments
        // Revenue growth adjustment (applied cumulatively)
        if (year > 1 && scenarioAdj.revenueGrowth !== 0) {
            const growthFactor = Math.pow(1 + scenarioAdj.revenueGrowth / 100, year - 1);
            revenue = revenue * growthFactor;
        }
        
        // EBIT margin adjustment
        if (scenarioAdj.ebitMargin !== 0) {
            // Adjust EBIT based on revenue and margin change
            const baseEBITMargin = revenue > 0 ? (ebit / revenue) * 100 : 0;
            const adjustedEBITMargin = baseEBITMargin + scenarioAdj.ebitMargin;
            ebit = revenue * (adjustedEBITMargin / 100);
        }
        
        // Only add if revenue is provided
        if (revenue > 0) {
            // Calculate EBIT(1-T)
            const ebitAfterTax = ebit * (1 - taxRate / 100);
            
            // FCFF = EBIT(1-T) + D&A - CapEx - Working Capital Change
            const fcff = ebitAfterTax + depreciation - capex - wcChange;
            
            cashflows.push({
                year,
                revenue,
                ebit: ebit,
                ebitAfterTax: ebitAfterTax,
                depreciation: depreciation,
                capex: capex,
                workingCapitalChange: wcChange,
                fcff: fcff,
                pv: 0 // Will be calculated later
            });
        }
    }
    
    // Calculate present values
    const wacc = calculateWACC() / 100;
    cashflows.forEach(cf => {
        cf.pv = cf.fcff / Math.pow(1 + wacc, cf.year);
    });
    
    return cashflows;
}

/**
 * Get calculation parameters
 */
function getCalculationParams() {
    // Calculate total equity if not already calculated
    const totalEquity = calculateTotalEquity();
    
    return {
        totalDebt: parseFloat(document.getElementById('totalDebt').value) || 0,
        totalEquity: totalEquity,
        cash: parseFloat(document.getElementById('cash').value) || 0,
        taxRate: parseFloat(document.getElementById('taxRate').value) || 25,
        terminalValueMethod: document.getElementById('terminalValueMethod').value,
        perpetualGrowthRate: parseFloat(document.getElementById('perpetualGrowthRate').value) || 0,
        exitMultiple: parseFloat(document.getElementById('exitMultiple').value) || 0,
        scenario: currentScenario // Include current scenario
    };
}


/**
 * Calculate terminal value
 */
function calculateTerminalValue(params, cashflows, wacc) {
    const lastFCFF = cashflows[cashflows.length - 1].fcff;
    const lastRevenue = cashflows[cashflows.length - 1].revenue;
    const lastEBIT = cashflows[cashflows.length - 1].ebit;
    const lastDepreciation = cashflows[cashflows.length - 1].depreciation;
    const lastEBITDA = lastEBIT + lastDepreciation;
    
    if (params.terminalValueMethod === 'perpetuity') {
        // Perpetuity growth method: based on last year FCFF
        const growthRate = params.perpetualGrowthRate / 100;
        if (wacc <= growthRate) {
            alert('Warning: WACC must be greater than perpetual growth rate!');
            return 0;
        }
        return lastFCFF * (1 + growthRate) / (wacc - growthRate);
    } else {
        // Exit multiple method: based on last year EBITDA
        return lastEBITDA * params.exitMultiple;
    }
}

/**
 * Calculate present value
 */
function calculatePresentValue(cashflows, wacc) {
    return cashflows.reduce((sum, cf) => sum + cf.pv, 0);
}

/**
 * Display results
 */
function displayResults(results) {
    // Display main results
    document.getElementById('enterpriseValue').textContent = formatNumber(results.enterpriseValue);
    document.getElementById('equityValue').textContent = formatNumber(results.equityValue);
    document.getElementById('valuePerShare').textContent = formatNumber(results.valuePerShare, 2);
    
    // Display detailed calculations
    document.getElementById('pvForecastPeriod').textContent = formatNumber(results.pvForecast) + ' M';
    document.getElementById('terminalValue').textContent = formatNumber(results.terminalValue) + ' M';
    document.getElementById('pvTerminalValue').textContent = formatNumber(results.pvTerminal) + ' M';
    document.getElementById('enterpriseValueDetail').textContent = formatNumber(results.enterpriseValue) + ' M';
    document.getElementById('netDebt').textContent = formatNumber(results.netDebt) + ' M';
    document.getElementById('equityValueDetail').textContent = formatNumber(results.equityValue) + ' M';
    
    // Display cash flow table
    displayCashflowTable(results.cashflows);
}

/**
 * Display cash flow table
 */
function displayCashflowTable(cashflows) {
    const tbody = document.querySelector('#cashflowTable tbody');
    let html = '';
    
    cashflows.forEach(cf => {
        html += `
            <tr>
                <td>Year ${cf.year}</td>
                <td>${formatNumber(cf.revenue, 0)}</td>
                <td>${formatNumber(cf.ebit, 0)}</td>
                <td>${formatNumber(cf.ebitAfterTax, 0)}</td>
                <td>${formatNumber(cf.depreciation, 0)}</td>
                <td>${formatNumber(cf.capex, 0)}</td>
                <td>${formatNumber(cf.workingCapitalChange, 0)}</td>
                <td><strong>${formatNumber(cf.fcff, 0)}</strong></td>
                <td>${formatNumber(cf.pv, 0)}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

/**
 * Switch scenario
 */
function switchScenario(scenario) {
    currentScenario = scenario;
    
    // Update tabs
    document.querySelectorAll('.scenario-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-scenario="${scenario}"]`).classList.add('active');
    
    // Generate scenario adjustment parameters
    generateScenarioAdjustments(scenario);
    
    // Recalculate
    calculateDCF();
}

/**
 * Generate scenario adjustment parameters
 */
function generateScenarioAdjustments(scenario) {
    const adjustments = document.getElementById('scenarioAdjustments');
    if (!adjustments) return;
    
    let html = '';
    
    const adj = getScenarioAdjustments();
    
    html = `
        <div class="form-grid">
            <div class="form-group">
                <label>Revenue Growth Adjustment: ${adj.revenueGrowth > 0 ? '+' : ''}${adj.revenueGrowth}%</label>
                <small class="form-hint">Applied cumulatively to each forecast year</small>
            </div>
            <div class="form-group">
                <label>EBIT Margin Adjustment: ${adj.ebitMargin > 0 ? '+' : ''}${adj.ebitMargin}%</label>
                <small class="form-hint">Applied to EBIT margin for all forecast years</small>
            </div>
            <div class="form-group">
                <label>WACC Adjustment: ${adj.wacc > 0 ? '+' : ''}${adj.wacc}%</label>
                <small class="form-hint">Applied to discount rate</small>
            </div>
        </div>
    `;
    
    adjustments.innerHTML = html;
}

/**
 * Load preset company data (global function)
 */
function loadPresetData() {
    console.log('loadPresetData function called');
    
    const presetSelect = document.getElementById('presetCompany');
    if (!presetSelect) {
        console.error('Preset company selector not found');
        alert('Preset company selector not found, please refresh the page and try again');
        return;
    }
    
    const companyKey = presetSelect.value;
    console.log('Selected company key:', companyKey);
    
    if (!companyKey || !PRESET_COMPANIES[companyKey]) {
        console.log('No preset company selected or company does not exist, available companies:', Object.keys(PRESET_COMPANIES));
        if (companyKey) {
            alert('Selected preset company does not exist, please refresh the page and try again');
        }
        return;
    }
    
    const company = PRESET_COMPANIES[companyKey];
    console.log('Loading preset data:', company.name);
    console.log('Forecast data count:', company.forecastData.length);
    
    // Confirm if existing data should be overwritten
    const tbody = document.getElementById('forecastDataBody');
    if (!tbody) {
        console.error('Forecast data table tbody not found');
        alert('Forecast data table not found, please refresh the page and try again');
        return;
    }
    
    const hasExistingData = Array.from(tbody.querySelectorAll('input')).some(input => {
        const val = input.value;
        return val && val.trim() !== '' && parseFloat(val) > 0;
    });
    
    if (hasExistingData) {
        const confirmLoad = confirm(`Are you sure you want to overwrite current input data with ${company.name}'s preset data?`);
        if (!confirmLoad) {
            presetSelect.value = '';
            return;
        }
    }
    
    // Fill forecast data table (transposed structure)
    // Find inputs by data-year attribute instead of row index
    let filledCount = 0;
    company.forecastData.forEach((data, index) => {
        const year = index + 1;
        
        // Find inputs by data-year attribute (transposed table structure)
        const revenueInput = tbody.querySelector(`.forecast-revenue[data-year="${year}"]`);
        const ebitInput = tbody.querySelector(`.forecast-ebit[data-year="${year}"]`);
        const depInput = tbody.querySelector(`.forecast-depreciation[data-year="${year}"]`);
        const capexInput = tbody.querySelector(`.forecast-capex[data-year="${year}"]`);
        const wcInput = tbody.querySelector(`.forecast-wc-change[data-year="${year}"]`);
        const taxInput = tbody.querySelector(`.forecast-tax-rate[data-year="${year}"]`);
        
        // Fill revenue
        if (revenueInput) {
            revenueInput.value = data.revenue;
            revenueInput.dispatchEvent(new Event('input', { bubbles: true }));
            console.log(`Filled Year ${year} revenue: ${data.revenue}`);
        }
        
        // Fill EBIT
        if (ebitInput) {
            ebitInput.value = data.ebit;
            ebitInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        // Fill depreciation & amortization
        if (depInput) {
            depInput.value = data.depreciation;
            depInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        // Fill capital expenditure
        if (capexInput) {
            capexInput.value = data.capex;
            capexInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        // Fill working capital change
        if (wcInput) {
            wcInput.value = data.wcChange;
            wcInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        // Fill tax rate
        if (taxInput) {
            taxInput.value = data.taxRate || 25;
            taxInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        filledCount++;
        console.log(`✓ Successfully filled Year ${year} data`);
    });
    
    console.log(`Successfully filled ${filledCount} rows of forecast data`);
    
    // Fill capital structure data
    const latest = company.latestData;
    const totalDebtEl = document.getElementById('totalDebt');
    const sharePriceEl = document.getElementById('sharePrice');
    const dilutedSharesEl = document.getElementById('dilutedShares');
    const cashEl = document.getElementById('cash');
    
    if (totalDebtEl) {
        totalDebtEl.value = latest.totalDebt;
        totalDebtEl.dispatchEvent(new Event('input', { bubbles: true }));
        console.log('Filled total debt:', latest.totalDebt);
    }
    
    if (sharePriceEl) {
        sharePriceEl.value = latest.sharePrice;
        sharePriceEl.dispatchEvent(new Event('input', { bubbles: true }));
        console.log('Filled share price:', latest.sharePrice);
    }
    
    if (dilutedSharesEl) {
        dilutedSharesEl.value = latest.dilutedShares;
        dilutedSharesEl.dispatchEvent(new Event('input', { bubbles: true }));
        console.log('Filled diluted shares:', latest.dilutedShares);
    }
    
    // Calculate total equity automatically
    calculateTotalEquity();
    
    if (cashEl) {
        cashEl.value = latest.cash;
        cashEl.dispatchEvent(new Event('input', { bubbles: true }));
        console.log('Filled cash:', latest.cash);
    }
    
    // Show success notification
    showNotification(`Loaded ${company.name}'s preset data! Filled ${filledCount} years of forecast data`, 'success');
    console.log('Preset data loading complete');
}

/**
 * Reset calculation
 */
function resetCalculation() {
    // Hide result section
    const resultSection = document.getElementById('resultSection');
    if (resultSection) {
        resultSection.style.display = 'none';
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Show notification message
 */
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
        color: white;
        border-radius: 0.5rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

/**
 * Format number
 */
function formatNumber(num, decimals = 0) {
    if (isNaN(num)) return '0.00';
    return num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}
