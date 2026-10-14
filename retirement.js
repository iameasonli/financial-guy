/**
 * 退休规划计算器 - 核心逻辑
 * 基于退休后支出需求，计算所需退休金及月储蓄目标
 */

/**
 * 计算退休所需资金（考虑通胀，退休期间支出现值）
 * 使用年金现值公式: PV = PMT * [1 - (1+r)^(-n)] / r
 * 其中 PMT 为退休后首月实际支出（已按通胀调整到退休时）
 * @param {number} monthlyExpense - 退休后期望月支出（当前价格）
 * @param {number} retirementYears - 退休年数
 * @param {number} annualReturn - 投资年化回报(%)
 * @param {number} inflationRate - 通胀率(%)
 * @param {number} yearsToRetirement - 距离退休年数
 * @returns {number} 退休时所需资金
 */
function calculateRequiredFund(monthlyExpense, retirementYears, annualReturn, inflationRate, yearsToRetirement) {
    // 退休时首月支出（按通胀调整）
    const monthlyAtRetirement = monthlyExpense * Math.pow(1 + inflationRate / 100, yearsToRetirement);
    const monthlyRate = annualReturn / 100 / 12;
    const months = retirementYears * 12;

    if (monthlyRate === 0) {
        return monthlyAtRetirement * months;
    }

    // 年金现值（退休时点的资金需求）
    const pv = monthlyAtRetirement * (1 - Math.pow(1 + monthlyRate, -months)) / monthlyRate;
    return pv;
}

/**
 * 计算为达到目标金额所需的月储蓄额
 * FV = PV(1+r)^n + PMT * [((1+r)^n - 1) / r]
 * => PMT = (FV - PV(1+r)^n) / [((1+r)^n - 1) / r]
 * @param {number} targetFV - 目标终值
 * @param {number} currentPV - 当前储蓄
 * @param {number} annualReturn - 年化回报
 * @param {number} years - 储蓄年数
 * @returns {number} 月储蓄额
 */
function calculateMonthlySavings(targetFV, currentPV, annualReturn, years) {
    const months = years * 12;
    const monthlyRate = annualReturn / 100 / 12;

    const fvOfCurrent = currentPV * Math.pow(1 + monthlyRate, months);
    const shortfall = targetFV - fvOfCurrent;

    if (shortfall <= 0) {
        return 0;
    }

    if (monthlyRate === 0) {
        return shortfall / months;
    }

    const pmt = shortfall / ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
    return pmt;
}

/**
 * 主计算函数
 */
function calculateRetirement() {
    const currentAge = parseInt(document.getElementById('currentAge').value, 10);
    const retirementAge = parseInt(document.getElementById('retirementAge').value, 10);
    const currentSavings = parseFloat(document.getElementById('currentSavings').value) || 0;
    const monthlyExpense = parseFloat(document.getElementById('monthlyExpense').value);
    const annualReturn = parseFloat(document.getElementById('annualReturn').value) || 6;
    const inflationRate = parseFloat(document.getElementById('inflationRate').value) || 3;
    const retirementYears = parseInt(document.getElementById('retirementYears').value, 10) || 25;

    if (retirementAge <= currentAge) {
        alert('Retirement age must be greater than current age.');
        return;
    }

    const yearsToRetirement = retirementAge - currentAge;

    // 退休时所需资金
    const requiredFund = calculateRequiredFund(
        monthlyExpense, retirementYears, annualReturn, inflationRate, yearsToRetirement
    );

    // 当前储蓄到退休时的终值
    const futureSavings = currentSavings * Math.pow(1 + annualReturn / 100, yearsToRetirement);
    const shortfall = Math.max(0, requiredFund - futureSavings);

    // 所需月储蓄
    const monthlySavings = calculateMonthlySavings(
        requiredFund, currentSavings, annualReturn, yearsToRetirement
    );

    document.getElementById('requiredFund').textContent = formatCurrency(requiredFund);
    document.getElementById('monthlySavings').textContent = formatCurrency(monthlySavings);
    document.getElementById('yearsToSave').textContent = yearsToRetirement;
    document.getElementById('futureSavings').textContent = formatCurrency(futureSavings);
    document.getElementById('shortfall').textContent = formatCurrency(shortfall);

    document.getElementById('resultSection').style.display = 'block';
    document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth' });
}

function formatCurrency(num) {
    return Math.round(num).toLocaleString('zh-CN');
}

function resetForm() {
    document.getElementById('retirementForm').reset();
    document.getElementById('resultSection').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('retirementForm').addEventListener('submit', function (e) {
        e.preventDefault();
        calculateRetirement();
    });
});
