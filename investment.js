/**
 * 投资收益计算器 - 核心逻辑
 * 支持一次性投资和定期定额投资，复利计算
 */

/**
 * 计算复利终值（含定期定额）
 * 月供时使用月度复利: FV = PV(1+r)^n + PMT * [((1+r)^n - 1) / r]
 * @param {number} pv - 初始投资
 * @param {number} annualRate - 年化收益率(%)
 * @param {number} years - 投资年限
 * @param {number} pmt - 每月追加金额
 * @param {number} compoundPerYear - 每年复利次数（仅用于无月供时）
 * @returns {Object} 计算结果
 */
function calculateInvestmentReturn(pv, annualRate, years, pmt, compoundPerYear) {
    const months = years * 12;
    const monthlyRate = annualRate / 100 / 12;

    let fv;
    if (pmt > 0) {
        // 有月供：使用月度复利，年金终值公式
        const fvLump = pv * Math.pow(1 + monthlyRate, months);
        const fvAnnuity = monthlyRate === 0
            ? pmt * months
            : pmt * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
        fv = fvLump + fvAnnuity;
    } else {
        // 仅一次性投资：按用户选择的复利频率
        const n = years * compoundPerYear;
        const r = annualRate / 100 / compoundPerYear;
        fv = pv * Math.pow(1 + r, n);
    }

    const totalContributions = pv + pmt * months;
    const totalReturn = fv - totalContributions;
    const returnRate = totalContributions > 0 ? (totalReturn / totalContributions) * 100 : 0;

    // 回本年限：72法则近似（年化收益翻倍所需年数）
    const paybackYears = annualRate > 0 ? (72 / annualRate).toFixed(1) : '-';

    return {
        futureValue: fv,
        totalInvested: totalContributions,
        totalReturn,
        returnRate,
        paybackYears
    };
}

/**
 * 格式化金额
 */
function formatCurrency(num) {
    return Math.round(num).toLocaleString('zh-CN');
}

/**
 * 主计算函数
 */
function calculateInvestment() {
    const initial = parseFloat(document.getElementById('initialInvestment').value);
    const annualReturn = parseFloat(document.getElementById('annualReturn').value);
    const years = parseInt(document.getElementById('years').value, 10);
    const monthlyContribution = parseFloat(document.getElementById('monthlyContribution').value) || 0;
    const compoundFreq = parseInt(document.getElementById('compoundFrequency').value, 10);

    if (isNaN(initial) || initial < 0) {
        alert('Please enter a valid initial investment.');
        return;
    }

    const result = calculateInvestmentReturn(
        initial, annualReturn, years, monthlyContribution, compoundFreq
    );

    document.getElementById('futureValue').textContent = formatCurrency(result.futureValue);
    document.getElementById('totalInvested').textContent = formatCurrency(result.totalInvested);
    document.getElementById('totalReturn').textContent = formatCurrency(result.totalReturn);
    document.getElementById('returnRate').textContent = result.returnRate.toFixed(2) + '%';
    document.getElementById('paybackPeriod').textContent = result.paybackYears;

    document.getElementById('resultSection').style.display = 'block';
    document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth' });
}

/**
 * 重置表单
 */
function resetForm() {
    document.getElementById('investmentForm').reset();
    document.getElementById('resultSection').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('investmentForm').addEventListener('submit', function (e) {
        e.preventDefault();
        calculateInvestment();
    });
});
