/**
 * 房贷计算器 - 核心逻辑
 * 支持: Fixed/Variable 利率, Monthly/Bi-weekly 还款, 滑块, 还款明细表
 */

/**
 * 等额本息 - 通用公式
 * @param {number} principal - 本金
 * @param {number} ratePerPeriod - 每期利率 (小数)
 * @param {number} numPayments - 总期数
 */
function calcPayment(principal, ratePerPeriod, numPayments) {
    if (ratePerPeriod === 0) return principal / numPayments;
    return principal * (ratePerPeriod * Math.pow(1 + ratePerPeriod, numPayments)) /
        (Math.pow(1 + ratePerPeriod, numPayments) - 1);
}

/**
 * 生成还款计划 - 支持固定/可变利率, Monthly/Bi-weekly
 * Bi-weekly 加速: 每期=月供/2, 每年26期, 等效13个月供, 缩短还款期
 */
function generateSchedule(principal, annualRate, loanTermYears, freq, variableOpt) {
    const periodsPerYear = freq === 'biweekly' ? 26 : 12;
    const numPayments = loanTermYears * periodsPerYear;
    const ratePerPeriod = annualRate / 100 / periodsPerYear;

    let payment;
    if (freq === 'biweekly') {
        const monthlyPayment = calcPayment(principal, annualRate / 100 / 12, loanTermYears * 12);
        payment = monthlyPayment / 2;
    } else {
        payment = calcPayment(principal, ratePerPeriod, numPayments);
    }

    const schedule = [];
    let balance = principal;
    let totalInterest = 0;
    let currentRate = ratePerPeriod;
    const maxIterations = numPayments + 100;

    for (let i = 1; i <= maxIterations && balance > 0.01; i++) {
        if (variableOpt && i > variableOpt.adjustAfterPeriods) {
            currentRate = variableOpt.postRate / 100 / periodsPerYear;
            const remaining = Math.max(1, numPayments - i + 1);
            if (freq === 'biweekly') {
                const remainingMonths = Math.ceil(remaining / 26 * 12);
                const newMonthly = calcPayment(balance, variableOpt.postRate / 100 / 12, Math.max(1, remainingMonths));
                payment = newMonthly / 2;
            } else {
                payment = calcPayment(balance, currentRate, remaining);
            }
        }

        const interest = balance * currentRate;
        const principalPaid = Math.min(Math.max(0, payment - interest), balance);
        balance -= principalPaid;
        totalInterest += interest;

        schedule.push({
            period: i,
            payment,
            principal: principalPaid,
            interest,
            balance: Math.max(0, balance)
        });
    }

    const totalPayment = schedule.reduce((s, r) => s + r.payment, 0);
    const firstPayment = schedule[0] ? schedule[0].payment : payment;
    const monthlyEquivalent = freq === 'biweekly' ? firstPayment * 26 / 12 : firstPayment;
    return {
        schedule,
        monthlyEquivalent,
        paymentPerPeriod: firstPayment,
        totalPayment,
        totalInterest,
        actualPeriods: schedule.length
    };
}

/**
 * 格式化金额
 */
function formatCurrency(num) {
    if (num === undefined || isNaN(num)) return '$0';
    return '$' + Math.round(num).toLocaleString('en-US');
}

/**
 * 初始化
 */
function initYearSelect() {
    const select = document.getElementById('startYear');
    const currentYear = new Date().getFullYear();
    select.innerHTML = '';
    for (let y = currentYear; y <= currentYear + 35; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        if (y === currentYear) opt.selected = true;
        select.appendChild(opt);
    }
}

function getPayoffDate(startMonth, startYear, totalYears) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const m = parseInt(startMonth, 10) - 1;
    const y = parseInt(startYear, 10) + Math.ceil(totalYears);
    return months[m] + '. ' + y;
}

function updateDonutChart(pni, tax, ins, other, total) {
    const chart = document.getElementById('donutChart');
    if (!chart || total <= 0) {
        chart.style.background = 'conic-gradient(#e5e7eb 0deg 360deg)';
        return;
    }
    const p1 = (pni / total) * 100;
    const p2 = (tax / total) * 100;
    const p3 = (ins / total) * 100;
    const p4 = (other / total) * 100;
    chart.style.background = `conic-gradient(
        #3b82f6 0deg ${p1 * 3.6}deg,
        #86efac ${p1 * 3.6}deg ${(p1 + p2) * 3.6}deg,
        #b45309 ${(p1 + p2) * 3.6}deg ${(p1 + p2 + p3) * 3.6}deg,
        #93c5fd ${(p1 + p2 + p3) * 3.6}deg 360deg
    )`;
}

/**
 * 同步滑块与输入框
 */
function syncSliders() {
    const homePrice = document.getElementById('homePrice');
    const homeSlider = document.getElementById('homePriceSlider');
    const downPct = document.getElementById('downPaymentPct');
    const downSlider = document.getElementById('downPaymentSlider');

    homeSlider.addEventListener('input', function () {
        homePrice.value = this.value;
        document.getElementById('homePriceVal').textContent = formatCurrency(parseFloat(this.value));
        calculateMortgage();
    });
    homePrice.addEventListener('input', function () {
        const v = Math.min(2000000, Math.max(50000, parseFloat(this.value) || 50000));
        homeSlider.value = v;
        this.value = v;
        document.getElementById('homePriceVal').textContent = formatCurrency(v);
    });

    downSlider.addEventListener('input', function () {
        downPct.value = this.value;
        document.getElementById('downPaymentVal').textContent = this.value + '%';
        calculateMortgage();
    });
    downPct.addEventListener('input', function () {
        const v = Math.min(100, Math.max(0, parseFloat(this.value) || 0));
        downSlider.value = v;
        document.getElementById('downPaymentVal').textContent = v + '%';
        calculateMortgage();
    });
}

/**
 * 渲染还款明细表
 */
function renderAmortizationSchedule(result, freq) {
    const tbody = document.getElementById('amortizationBody');
    const viewBtns = document.querySelectorAll('.view-btn');
    let currentView = 'year';

    function render(view) {
        tbody.innerHTML = '';
        const sched = result.schedule;
        if (!sched || sched.length === 0) return;

        if (view === 'month') {
            const maxRows = 60;
            const toShow = sched.slice(0, maxRows);
            toShow.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${row.period}</td><td>${formatCurrency(row.payment)}</td><td>${formatCurrency(row.principal)}</td><td>${formatCurrency(row.interest)}</td><td>${formatCurrency(row.balance)}</td>`;
                tbody.appendChild(tr);
            });
            if (sched.length > maxRows) {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td colspan="5" style="text-align:center;color:var(--text-muted)">... ${sched.length - maxRows} more rows</td>`;
                tbody.appendChild(tr);
            }
        } else {
            const periodsPerYear = freq === 'biweekly' ? 26 : 12;
            const years = Math.ceil(sched.length / periodsPerYear);
            for (let y = 1; y <= years; y++) {
                const start = (y - 1) * periodsPerYear;
                const end = Math.min(y * periodsPerYear, sched.length);
                const yearRows = sched.slice(start, end);
                const principal = yearRows.reduce((s, r) => s + r.principal, 0);
                const interest = yearRows.reduce((s, r) => s + r.interest, 0);
                const balance = yearRows[yearRows.length - 1].balance;
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>Year ${y}</td><td>${formatCurrency(principal + interest)}</td><td>${formatCurrency(principal)}</td><td>${formatCurrency(interest)}</td><td>${formatCurrency(balance)}</td>`;
                tbody.appendChild(tr);
            }
        }
    }

    render('year');

    viewBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            viewBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentView = this.dataset.view;
            render(currentView);
        });
    });
}

/**
 * 主计算
 */
function calculateMortgage() {
    const homePrice = parseFloat(document.getElementById('homePrice').value) || 0;
    const downPaymentPct = parseFloat(document.getElementById('downPaymentPct').value) || 0;
    const loanTerm = parseInt(document.getElementById('loanTerm').value, 10) || 30;
    const rateType = document.getElementById('rateType').value;
    const paymentFreq = document.getElementById('paymentFreq').value;
    const includeTaxes = document.getElementById('includeTaxes').checked;

    const downPayment = homePrice * (downPaymentPct / 100);
    const loanAmount = homePrice - downPayment;

    if (homePrice <= 0 || loanAmount <= 0) return;

    let interestRate;
    let variableOpt = null;

    if (rateType === 'fixed') {
        interestRate = parseFloat(document.getElementById('interestRate').value) || 0;
    } else {
        const initialRate = parseFloat(document.getElementById('initialRate').value) || 0;
        const adjustYears = parseInt(document.getElementById('adjustYears').value, 10) || 5;
        const postRate = parseFloat(document.getElementById('postAdjustRate').value) || 0;
        interestRate = initialRate;
        const periodsPerYear = paymentFreq === 'biweekly' ? 26 : 12;
        variableOpt = {
            adjustAfterPeriods: adjustYears * periodsPerYear,
            postRate
        };
    }

    const periodsPerYear = paymentFreq === 'biweekly' ? 26 : 12;

    const result = generateSchedule(loanAmount, interestRate, loanTerm, paymentFreq, variableOpt);
    const mortgagePayment = result.paymentPerPeriod;
    const mortgageMonthly = result.monthlyEquivalent;
    const mortgageTotal = result.totalPayment;
    const actualYears = result.actualPeriods / (paymentFreq === 'biweekly' ? 26 : 12);

    let propertyTaxMonthly = 0, propertyTaxTotal = 0;
    let insuranceMonthly = 0, insuranceTotal = 0;
    let otherMonthly = 0, otherTotal = 0;

    if (includeTaxes) {
        const propertyTaxPct = parseFloat(document.getElementById('propertyTax').value) || 0;
        const homeInsurance = parseFloat(document.getElementById('homeInsurance').value) || 0;
        const pmi = parseFloat(document.getElementById('pmi').value) || 0;
        const hoaFee = parseFloat(document.getElementById('hoaFee').value) || 0;
        const otherCosts = parseFloat(document.getElementById('otherCosts').value) || 0;

        propertyTaxMonthly = (homePrice * propertyTaxPct / 100) / 12;
        propertyTaxTotal = propertyTaxMonthly * actualYears * 12;
        insuranceMonthly = (homeInsurance + pmi + hoaFee) / 12;
        insuranceTotal = insuranceMonthly * actualYears * 12;
        otherMonthly = otherCosts / 12;
        otherTotal = otherMonthly * actualYears * 12;
    }

    const totalMonthly = mortgageMonthly + propertyTaxMonthly + insuranceMonthly + otherMonthly;
    const totalAll = mortgageTotal + propertyTaxTotal + insuranceTotal + otherTotal;

    document.getElementById('payLabel').textContent = paymentFreq === 'biweekly' ? 'Bi-weekly Pay' : 'Monthly Pay';
    document.getElementById('monthlyPayTotal').textContent = paymentFreq === 'biweekly' ? formatCurrency(mortgagePayment) : formatCurrency(mortgageMonthly);
    document.getElementById('mortgageMonthly').textContent = formatCurrency(mortgageMonthly);
    document.getElementById('mortgageTotal').textContent = formatCurrency(mortgageTotal);
    document.getElementById('propertyTaxMonthly').textContent = formatCurrency(propertyTaxMonthly);
    document.getElementById('propertyTaxTotal').textContent = formatCurrency(propertyTaxTotal);
    document.getElementById('insuranceMonthly').textContent = formatCurrency(insuranceMonthly);
    document.getElementById('insuranceTotal').textContent = formatCurrency(insuranceTotal);
    document.getElementById('otherMonthly').textContent = formatCurrency(otherMonthly);
    document.getElementById('otherTotal').textContent = formatCurrency(otherTotal);
    document.getElementById('totalMonthly').textContent = formatCurrency(totalMonthly);
    document.getElementById('totalAll').textContent = formatCurrency(totalAll);

    document.getElementById('summaryHousePrice').textContent = formatCurrency(homePrice);
    document.getElementById('summaryLoanAmount').textContent = formatCurrency(loanAmount);
    document.getElementById('summaryDownPayment').textContent = formatCurrency(downPayment);
    document.getElementById('summaryMortgageTotal').textContent = formatCurrency(mortgageTotal);
    document.getElementById('summaryTotalInterest').textContent = formatCurrency(result.totalInterest);

    const startMonth = document.getElementById('startMonth').value;
    const startYear = document.getElementById('startYear').value;
    document.getElementById('summaryPayoffDate').textContent = getPayoffDate(startMonth, startYear, actualYears);

    updateDonutChart(mortgageMonthly, propertyTaxMonthly, insuranceMonthly, otherMonthly, totalMonthly);
    renderAmortizationSchedule(result, paymentFreq);
}

function resetForm() {
    document.getElementById('mortgageForm').reset();
    document.getElementById('rateType').value = 'fixed';
    document.getElementById('paymentFreq').value = 'monthly';
    document.getElementById('includeTaxes').checked = true;
    document.getElementById('taxCostBlock').style.display = 'block';
    document.getElementById('fixedRateBlock').style.display = 'block';
    document.getElementById('variableRateBlock').style.display = 'none';
    document.getElementById('homePrice').value = 400000;
    document.getElementById('homePriceSlider').value = 400000;
    document.getElementById('homePriceVal').textContent = formatCurrency(400000);
    document.getElementById('downPaymentPct').value = 20;
    document.getElementById('downPaymentSlider').value = 20;
    document.getElementById('downPaymentVal').textContent = '20%';
    document.getElementById('loanTerm').value = 30;
    document.getElementById('interestRate').value = 6.017;
    document.getElementById('propertyTax').value = 1.2;
    document.getElementById('homeInsurance').value = 1500;
    document.getElementById('otherCosts').value = 4000;
    initYearSelect();
    calculateMortgage();
}

document.addEventListener('DOMContentLoaded', function () {
    initYearSelect();
    syncSliders();

    document.getElementById('rateType').addEventListener('change', function () {
        const isVar = this.value === 'variable';
        document.getElementById('fixedRateBlock').style.display = isVar ? 'none' : 'block';
        document.getElementById('variableRateBlock').style.display = isVar ? 'block' : 'none';
        calculateMortgage();
    });

    document.getElementById('mortgageForm').addEventListener('submit', function (e) {
        e.preventDefault();
        calculateMortgage();
    });

    document.getElementById('includeTaxes').addEventListener('change', function () {
        document.getElementById('taxCostBlock').style.display = this.checked ? 'block' : 'none';
        calculateMortgage();
    });

    document.getElementById('paymentFreq').addEventListener('change', calculateMortgage);
    document.getElementById('loanTerm').addEventListener('change', calculateMortgage);
    document.getElementById('interestRate').addEventListener('change', calculateMortgage);
    document.getElementById('initialRate').addEventListener('change', calculateMortgage);
    document.getElementById('adjustYears').addEventListener('change', calculateMortgage);
    document.getElementById('postAdjustRate').addEventListener('change', calculateMortgage);
    ['propertyTax', 'homeInsurance', 'pmi', 'hoaFee', 'otherCosts'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', calculateMortgage);
    });

    calculateMortgage();
});
