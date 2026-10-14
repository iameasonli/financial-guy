/**
 * 个人所得税计算器 - 核心逻辑
 * 基于中国个税累进税率表（综合所得）
 * 税率表：0-36k 3%, 36k-144k 10%, 144k-300k 20%, 300k-420k 25%, 420k-660k 30%, 660k-960k 35%, 960k+ 45%
 */

/** 综合所得累进税率表 (threshold, rate, quickDeduction) */
const TAX_BRACKETS = [
    { max: 36000, rate: 0.03, quickDeduction: 0 },
    { max: 144000, rate: 0.10, quickDeduction: 2520 },
    { max: 300000, rate: 0.20, quickDeduction: 16920 },
    { max: 420000, rate: 0.25, quickDeduction: 31920 },
    { max: 660000, rate: 0.30, quickDeduction: 52920 },
    { max: 960000, rate: 0.35, quickDeduction: 85920 },
    { max: Infinity, rate: 0.45, quickDeduction: 181920 }
];

/**
 * 计算综合所得个税（速算扣除法）
 * @param {number} taxableIncome - 应纳税所得额
 * @returns {number} 应纳税额
 */
function calculateComprehensiveTax(taxableIncome) {
    if (taxableIncome <= 0) return 0;

    for (const bracket of TAX_BRACKETS) {
        if (taxableIncome <= bracket.max) {
            return taxableIncome * bracket.rate - bracket.quickDeduction;
        }
    }
    return 0;
}

/**
 * 年终奖单独计税（除以12找税率，再按全额计算）
 * @param {number} bonus - 年终奖金额
 * @returns {number} 应纳税额
 */
function calculateBonusTax(bonus) {
    if (bonus <= 0) return 0;
    const monthly = bonus / 12;

    let rate = 0;
    let quickDeduction = 0;
    for (const bracket of TAX_BRACKETS) {
        if (monthly <= bracket.max) {
            rate = bracket.rate;
            quickDeduction = bracket.quickDeduction;
            break;
        }
    }

    return bonus * rate - quickDeduction;
}

/**
 * 主计算函数
 */
function calculateTax() {
    const calcType = document.getElementById('calcType').value;

    if (calcType === 'salary') {
        const monthlySalary = parseFloat(document.getElementById('monthlySalary').value) || 0;
        const months = parseInt(document.getElementById('months').value, 10) || 12;
        const standardDeduction = parseFloat(document.getElementById('standardDeduction').value) || 60000;
        const specialDeduction = parseFloat(document.getElementById('specialDeduction').value) || 0;

        const grossIncome = monthlySalary * months;
        const taxableIncome = Math.max(0, grossIncome - standardDeduction - specialDeduction);
        const tax = calculateComprehensiveTax(taxableIncome);
        const afterTax = grossIncome - tax;
        const effectiveRate = grossIncome > 0 ? (tax / grossIncome * 100) : 0;

        document.getElementById('taxPayable').textContent = formatCurrency(tax);
        document.getElementById('taxableIncome').textContent = formatCurrency(taxableIncome);
        document.getElementById('afterTaxIncome').textContent = formatCurrency(afterTax);
        document.getElementById('effectiveRate').textContent = effectiveRate.toFixed(2) + '%';
    } else {
        const bonusAmount = parseFloat(document.getElementById('bonusAmount').value) || 0;
        const tax = calculateBonusTax(bonusAmount);
        const afterTax = bonusAmount - tax;
        const effectiveRate = bonusAmount > 0 ? (tax / bonusAmount * 100) : 0;

        document.getElementById('taxPayable').textContent = formatCurrency(tax);
        document.getElementById('taxableIncome').textContent = formatCurrency(bonusAmount);
        document.getElementById('afterTaxIncome').textContent = formatCurrency(afterTax);
        document.getElementById('effectiveRate').textContent = effectiveRate.toFixed(2) + '%';
    }

    document.getElementById('resultSection').style.display = 'block';
    document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth' });
}

function formatCurrency(num) {
    return Math.round(num).toLocaleString('zh-CN');
}

function resetForm() {
    document.getElementById('taxForm').reset();
    document.getElementById('resultSection').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function () {
    const calcType = document.getElementById('calcType');
    const salarySection = document.getElementById('salarySection');
    const bonusSection = document.getElementById('bonusSection');
    const monthlySalary = document.getElementById('monthlySalary');
    const bonusAmount = document.getElementById('bonusAmount');

    function toggleSections() {
        if (calcType.value === 'salary') {
            salarySection.style.display = 'block';
            bonusSection.style.display = 'none';
            monthlySalary.required = true;
            bonusAmount.required = false;
        } else {
            salarySection.style.display = 'none';
            bonusSection.style.display = 'block';
            monthlySalary.required = false;
            bonusAmount.required = true;
        }
    }

    calcType.addEventListener('change', toggleSections);
    toggleSections(); // 初始化

    document.getElementById('taxForm').addEventListener('submit', function (e) {
        e.preventDefault();
        calculateTax();
    });
});
