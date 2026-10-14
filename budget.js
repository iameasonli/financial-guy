/**
 * 预算规划工具 - 核心逻辑
 * 分析收入与支出，计算结余及各类支出占比
 */

/** 支出类别配置 */
const EXPENSE_CATEGORIES = [
    { id: 'housing', label: 'Housing / Rent' },
    { id: 'utilities', label: 'Utilities' },
    { id: 'food', label: 'Food & Groceries' },
    { id: 'transport', label: 'Transportation' },
    { id: 'insurance', label: 'Insurance' },
    { id: 'healthcare', label: 'Healthcare' },
    { id: 'entertainment', label: 'Entertainment' },
    { id: 'savings', label: 'Savings Goal' },
    { id: 'other', label: 'Other' }
];

/**
 * 主计算函数
 */
function calculateBudget() {
    const income = parseFloat(document.getElementById('monthlyIncome').value) || 0;

    let totalExpenses = 0;
    const breakdown = [];

    EXPENSE_CATEGORIES.forEach(function (cat) {
        const el = document.getElementById(cat.id);
        const amount = el ? parseFloat(el.value) || 0 : 0;
        if (amount > 0) {
            totalExpenses += amount;
            breakdown.push({ label: cat.label, amount });
        }
    });

    const remaining = income - totalExpenses;

    document.getElementById('totalIncome').textContent = formatCurrency(income);
    document.getElementById('totalExpenses').textContent = formatCurrency(totalExpenses);
    document.getElementById('savingsGoal').textContent = formatCurrency(
        parseFloat(document.getElementById('savings').value) || 0
    );

    const remainingEl = document.getElementById('remaining');
    remainingEl.textContent = formatCurrency(remaining);
    remainingEl.parentElement.classList.remove('positive', 'negative');
    remainingEl.parentElement.classList.add(remaining >= 0 ? 'positive' : 'negative');

    // 支出明细
    const breakdownContainer = document.getElementById('expenseBreakdown');
    breakdownContainer.innerHTML = '';

    if (breakdown.length === 0) {
        breakdownContainer.innerHTML = '<p class="no-data">No expense categories filled.</p>';
    } else {
        breakdown.forEach(function (item) {
            const pct = totalExpenses > 0 ? (item.amount / totalExpenses * 100).toFixed(1) : 0;
            const div = document.createElement('div');
            div.className = 'breakdown-item';
            div.innerHTML = `
                <span class="breakdown-label">${item.label}</span>
                <span class="breakdown-value">${formatCurrency(item.amount)}</span>
                <span class="breakdown-unit">${pct}%</span>
            `;
            breakdownContainer.appendChild(div);
        });
    }

    document.getElementById('resultSection').style.display = 'block';
    document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth' });
}

function formatCurrency(num) {
    return Math.round(num).toLocaleString('zh-CN');
}

function resetForm() {
    document.getElementById('budgetForm').reset();
    document.getElementById('resultSection').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('budgetForm').addEventListener('submit', function (e) {
        e.preventDefault();
        calculateBudget();
    });
});
