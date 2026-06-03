const STORAGE_KEY = "personalFinancePlanner.v3";
const LEGACY_STORAGE_KEY = "personalFinancePlanner.v2";

const TEXT = {
  phoneInstallment: "\u624b\u673a\u5206\u671f",
  bufferGoal: "FK Money \u76ee\u6807",
  deposit: "\u5b58\u6b3e",
  age25Goal: "25\u5c8115\u4e07\u5e95\u7ebf",
  longDeposit: "\u957f\u671f\u5b58\u6b3e",
  skinCare: "\u76ae\u80a4\u7ba1\u7406",
  aesthetic: "\u533b\u7f8e",
  travelWithPartner: "\u548c\u5bf9\u8c61\u65c5\u884c",
  travelWithFamily: "\u548c\u5bb6\u4eba\u65c5\u884c",
  travelWithFriends: "\u548c\u670b\u53cb\u65c5\u884c",
  yearTravel: "\u4eca\u5e74\u65c5\u884c\u4e00\u6b21",
  travel: "\u65c5\u884c",
  dadBirthday: "\u7238\u7238\u751f\u65e5",
  momBirthday: "\u5988\u5988\u751f\u65e5",
  partnerBirthday: "\u5bf9\u8c61\u751f\u65e5",
  friendBirthday8: "8\u6708\u670b\u53cb\u751f\u65e5",
  friendBirthday11: "11\u6708\u670b\u53cb\u751f\u65e5",
  friendBirthday12: "12\u6708\u670b\u53cb\u751f\u65e5",
  instax: "\u5bbd\u5e45\u62cd\u7acb\u5f97",
  equipment: "\u8bbe\u5907",
  clothesCosmetics: "\u672c\u6708\u8863\u670d/\u5316\u5986\u54c1",
  happySpend: "\u5feb\u4e50\u6d88\u8d39",
};

const currency = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 0,
});

const today = () => new Date();
const uid = () => crypto.randomUUID();

const defaults = {
  scenario: "normal",
  profile: {
    payday: 15,
    currentSavings: 0,
    lockedBuffer: 0,
    bufferTarget: 0,
    age25Target: 150000,
    planningYears: 3,
    savingPausedMonths: [],
  },
  incomePlan: {
    internSalary: 0,
    probationSalary: 0,
    regularSalary: 0,
    probationStart: "2026-07",
    regularMonth: "2026-09",
    performance: { conservative: 0, normal: 0, optimistic: 0 },
    extraSalaryByYear: { 1: 13, 2: 15, 3: 17 },
    contributionBase: 0,
    socialRate: 0,
    fundRate: 0,
  },
  expensePlan: {
    rent: 0,
    utilities: 0,
    phone: 0,
    commute: 0,
    breakfast: 0,
    lunch: 0,
    dinner: 0,
    happyBudget: 0,
    coolingDays: 7,
  },
  actualIncomeRecords: {},
  savingRecords: {},
  savingRecordMode: "monthly",
  extraExpenses: [],
  debtBills: [],
  goals: [
    { id: uid(), name: TEXT.age25Goal, category: TEXT.longDeposit, targetAmount: 150000, savedAmount: 0, monthlyReserve: 0, targetDate: "2029-06", priority: "high", status: "active", isMainSavingsGoal: true },
  ],
  giftEvents: [],
  wishItems: [],
};

let state = loadState();
let activeSection = "dashboard";
let dialogType = "";
let editingId = "";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY));
    return normalizeState(saved ? mergeState(clone(defaults), saved) : clone(defaults));
  } catch {
    return clone(defaults);
  }
}

function mergeState(base, saved) {
  return {
    ...base,
    ...saved,
    profile: { ...base.profile, ...saved.profile },
    incomePlan: {
      ...base.incomePlan,
      ...saved.incomePlan,
      performance: { ...base.incomePlan.performance, ...saved.incomePlan?.performance },
      extraSalaryByYear: { ...base.incomePlan.extraSalaryByYear, ...saved.incomePlan?.extraSalaryByYear },
    },
    expensePlan: { ...base.expensePlan, ...saved.expensePlan },
    actualIncomeRecords: saved.actualIncomeRecords ?? base.actualIncomeRecords,
    savingRecords: saved.savingRecords ?? base.savingRecords,
    savingRecordMode: saved.savingRecordMode,
    extraExpenses: saved.extraExpenses ?? base.extraExpenses,
    debtBills: saved.debtBills ?? base.debtBills,
    goals: saved.goals ?? base.goals,
    giftEvents: saved.giftEvents ?? base.giftEvents,
    wishItems: saved.wishItems ?? base.wishItems,
  };
}

function normalizeState(nextState) {
  nextState.profile.age25Target = 150000;
  nextState.profile.savingPausedMonths = nextState.profile.savingPausedMonths ?? [];
  if (nextState.savingRecordMode !== "monthly") {
    nextState.savingRecords = {};
    nextState.savingRecordMode = "monthly";
  }
  nextState.savingRecords = nextState.savingRecords ?? {};
  const mainGoal = nextState.goals.find((goal) => goal.isMainSavingsGoal || /25.*(\u4e07|150000|20\u4e07|15\u4e07)/.test(goal.name));
  if (mainGoal) {
    mainGoal.name = TEXT.age25Goal;
    mainGoal.category = TEXT.longDeposit;
    mainGoal.targetAmount = 150000;
    mainGoal.targetDate = mainGoal.targetDate || "2029-06";
    mainGoal.isMainSavingsGoal = true;
  }
  nextState.goals.forEach((goal) => {
    if (goal.name.includes("\u5b89\u5168\u57ab")) {
      goal.name = TEXT.bufferGoal;
      goal.category = TEXT.deposit;
    }
    if (goal.category === TEXT.aesthetic || goal.name.includes("\u76ae\u80a4") || goal.name.includes("\u533b\u7f8e")) {
      goal.priority = "high";
      goal.status = "active";
      goal.budgetMode = "priority";
      goal.monthlyReserve = Number(goal.monthlyReserve || 250);
    }
    if ([TEXT.travelWithPartner, TEXT.travelWithFamily, TEXT.travelWithFriends].includes(goal.name)) {
      goal.status = "archived";
      goal.priority = "low";
      goal.monthlyReserve = 0;
      goal.budgetMode = "paused";
    }
  });
  return nextState;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function yuan(value) {
  return currency.format(Math.round(Number(value) || 0));
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonth(key) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function addMonths(key, count) {
  const date = parseMonth(key);
  date.setMonth(date.getMonth() + count);
  return monthKey(date);
}

function cycleFor(date = today()) {
  const start = new Date(date.getFullYear(), date.getMonth(), state.profile.payday);
  if (date.getDate() < state.profile.payday) start.setMonth(start.getMonth() - 1);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  end.setDate(state.profile.payday - 1);
  return { start, end, key: monthKey(start), nextKey: monthKey(end) };
}

function baseSalaryFor(month) {
  if (month < state.incomePlan.probationStart) return state.incomePlan.internSalary;
  if (month < state.incomePlan.regularMonth) return state.incomePlan.probationSalary;
  return state.incomePlan.regularSalary;
}

function personalTax(taxableIncome) {
  if (taxableIncome <= 0) return 0;
  if (taxableIncome <= 3000) return taxableIncome * 0.03;
  if (taxableIncome <= 12000) return taxableIncome * 0.1 - 210;
  if (taxableIncome <= 25000) return taxableIncome * 0.2 - 1410;
  if (taxableIncome <= 35000) return taxableIncome * 0.25 - 2660;
  if (taxableIncome <= 55000) return taxableIncome * 0.3 - 4410;
  if (taxableIncome <= 80000) return taxableIncome * 0.35 - 7160;
  return taxableIncome * 0.45 - 15160;
}

function payrollBreakdownFor(month, scenario = state.scenario) {
  const base = baseSalaryFor(month);
  const performance = month < state.incomePlan.probationStart ? 0 : state.incomePlan.performance[scenario];
  const gross = base + performance;
  const contributionBase = Math.min(state.incomePlan.contributionBase, gross);
  const social = contributionBase * (state.incomePlan.socialRate / 100);
  const fund = contributionBase * (state.incomePlan.fundRate / 100);
  const tax = personalTax(gross - social - fund - 5000);
  return { base, performance, gross, social, fund, tax, net: Math.max(0, gross - social - fund - tax) };
}

function actualIncomeFor(month) {
  return state.actualIncomeRecords?.[month] ?? {};
}

function actualSavingsTotal() {
  const recordTotal = Object.values(state.savingRecords ?? {}).reduce((sum, value) => sum + Math.max(0, Number(value || 0)), 0);
  if (recordTotal > 0) return Number(state.profile.currentSavings || 0) + recordTotal;
  const mainGoal = mainSavingsGoal();
  return Number(mainGoal?.savedAmount || state.profile.currentSavings || 0);
}

function mainSavingsGoal() {
  return state.goals.find((goal) => goal.isMainSavingsGoal) ?? state.goals.find((goal) => goal.name.includes("25"));
}

function budgetIncomeFor(month, scenario = state.scenario) {
  const actual = actualIncomeFor(month);
  return Number(actual.netIncome || 0) > 0 ? Number(actual.netIncome) : payrollBreakdownFor(month, scenario).net;
}

function contributionBreakdownFor(month, scenario = state.scenario) {
  const actual = actualIncomeFor(month);
  const estimated = payrollBreakdownFor(month, scenario);
  const social = Number(actual.socialContribution || 0) > 0 ? Number(actual.socialContribution) : estimated.social;
  const fund = Number(actual.fundContribution || 0) > 0 ? Number(actual.fundContribution) : estimated.fund;
  const tax = Number(actual.tax || 0) > 0 ? Number(actual.tax) : estimated.tax;
  const hasActual = Number(actual.socialContribution || 0) > 0 || Number(actual.fundContribution || 0) > 0 || Number(actual.tax || 0) > 0;
  return { social, fund, tax, total: social + fund, source: hasActual ? "actual" : "estimated", estimated };
}

function monthlyFoodCost() {
  const e = state.expensePlan;
  return (Number(e.breakfast) + Number(e.lunch) + Number(e.dinner)) * 30;
}

function fixedMonthlyCost() {
  const e = state.expensePlan;
  return Number(e.rent) + Number(e.utilities) + Number(e.phone) + Number(e.commute) + monthlyFoodCost();
}

function activeBillsFor(month) {
  return state.debtBills.filter((bill) => bill.status === "active" && (!bill.endMonth || month <= bill.endMonth));
}

function activeExtraExpensesFor(month) {
  return (state.extraExpenses ?? []).filter((expense) => {
    if (expense.status !== "active") return false;
    if (expense.recurring) return !expense.startMonth || month >= expense.startMonth;
    return expense.month === month;
  });
}

function extraExpenseTotalFor(month) {
  return activeExtraExpensesFor(month).reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
}

function activeGoals() {
  return state.goals.filter((goal) => goal.status === "active");
}

function monthlyGoalReserve() {
  return activeGoals().reduce((sum, goal) => sum + Number(goal.monthlyReserve || 0), 0);
}

function monthlyOptionalGoalReserve() {
  return budgetedWishGoals().reduce((sum, goal) => sum + Number(goal.monthlyReserve || 0), 0);
}

function budgetedWishGoals() {
  return activeGoals().filter((goal) => !goal.isMainSavingsGoal && ["priority", "flex"].includes(goal.budgetMode));
}

function priorityWishReserve() {
  return budgetedWishGoals().filter((goal) => goal.budgetMode === "priority").reduce((sum, goal) => sum + Number(goal.monthlyReserve || 0), 0);
}

function flexWishReserve() {
  return budgetedWishGoals().filter((goal) => goal.budgetMode === "flex").reduce((sum, goal) => sum + Number(goal.monthlyReserve || 0), 0);
}

function giftReserveForMonth(month) {
  const monthNumber = parseMonth(month).getMonth() + 1;
  return state.giftEvents.filter((event) => Number(event.month) === monthNumber && !event.reserved).reduce((sum, event) => sum + Number(event.max || 0), 0);
}

function monthlyExpenseFor(month) {
  return (
    fixedMonthlyCost() +
    activeBillsFor(month).reduce((sum, bill) => sum + Number(bill.amount || 0), 0) +
    extraExpenseTotalFor(month) +
    monthlyOptionalGoalReserve() +
    giftReserveForMonth(month) +
    Number(state.expensePlan.happyBudget || 0)
  );
}

function targetPlan() {
  const now = cycleFor().key;
  const mainGoal = mainSavingsGoal();
  const target = Number(state.profile.age25Target || 150000);
  const saved = actualSavingsTotal();
  const targetDate = mainGoal?.targetDate || "2029-06";
  const monthsLeft = countSavingMonths(now, targetDate);
  const gap = Math.max(0, target - saved);
  const requiredMonthly = Math.ceil(gap / monthsLeft);
  const plannedMonthly = Number(mainGoal?.monthlyReserve || 0);
  return { target, saved, targetDate, monthsLeft, gap, requiredMonthly, plannedMonthly, mainGoal };
}

function currentCyclePlan() {
  const cycle = cycleFor();
  const income = budgetIncomeFor(cycle.key);
  const actual = actualIncomeFor(cycle.key);
  const fixed = fixedMonthlyCost();
  const bills = activeBillsFor(cycle.key).reduce((sum, bill) => sum + Number(bill.amount || 0), 0);
  const extra = extraExpenseTotalFor(cycle.key);
  const frozen = activeBillsFor(cycle.key).filter((bill) => bill.freezeNextCycle).reduce((sum, bill) => sum + Number(bill.amount || 0), 0);
  const goals = monthlyOptionalGoalReserve();
  const gifts = giftReserveForMonth(cycle.key);
  const happy = Number(state.expensePlan.happyBudget || 0);
  const payroll = contributionBreakdownFor(cycle.key);
  const target = targetPlan();
  const targetPressure = isSavingPausedMonth(cycle.key) ? 0 : target.requiredMonthly;
  const essentialSpendable = income - fixed - bills - extra - frozen;
  return {
    cycle,
    income,
    incomeSource: Number(actual.netIncome || 0) > 0 ? "actual" : "estimated",
    payroll,
    fixed,
    bills,
    extra,
    frozen,
    goals,
    gifts,
    happy,
    essentialSpendable,
    flexibleAfterHappy: essentialSpendable - happy,
    targetPressure,
    targetShortfall: Math.max(0, targetPressure - Math.max(0, essentialSpendable - gifts - happy - goals)),
    spendable: essentialSpendable,
  };
}

function annualProjection(scenario = state.scenario) {
  const year = today().getFullYear();
  let income = 0;
  let fixed = 0;
  let bills = 0;
  let goals = 0;
  let gifts = 0;
  let happy = 0;
  const rows = [];
  for (let i = 0; i < 12; i += 1) {
    const key = `${year}-${String(i + 1).padStart(2, "0")}`;
    const row = {
      key,
      income: budgetIncomeFor(key, scenario),
      fixed: fixedMonthlyCost(),
      bills: activeBillsFor(key).reduce((sum, bill) => sum + Number(bill.amount || 0), 0) + extraExpenseTotalFor(key),
      goals: monthlyOptionalGoalReserve(),
      gifts: giftReserveForMonth(key),
      happy: Number(state.expensePlan.happyBudget || 0),
    };
    row.surplus = row.income - row.fixed - row.bills - row.goals - row.gifts - row.happy;
    income += row.income;
    fixed += row.fixed;
    bills += row.bills;
    goals += row.goals;
    gifts += row.gifts;
    happy += row.happy;
    rows.push(row);
  }
  const contractYear = Math.max(1, Math.min(3, year - 2026 + 1));
  const extraMonths = Math.max(0, Number(state.incomePlan.extraSalaryByYear[contractYear] || 12) - 12);
  const extraSalary = extraMonths * baseSalaryFor(`${year}-12`);
  return { rows, income, fixed, bills, goals, gifts, happy, extraSalary, surplus: income + extraSalary - fixed - bills - goals - gifts - happy };
}

function threeYearProjection(scenario = state.scenario) {
  const start = monthKey(today());
  let savings = actualSavingsTotal();
  const yearly = [];
  for (let i = 0; i < state.profile.planningYears * 12; i += 1) {
    const key = addMonths(start, i);
    const date = parseMonth(key);
    savings +=
      budgetIncomeFor(key, scenario) -
      fixedMonthlyCost() -
      activeBillsFor(key).reduce((sum, bill) => sum + Number(bill.amount || 0), 0) -
      extraExpenseTotalFor(key) -
      monthlyOptionalGoalReserve() -
      giftReserveForMonth(key) -
      Number(state.expensePlan.happyBudget || 0);
    if (date.getMonth() === 0) {
      const contractYear = Math.max(1, Math.min(3, date.getFullYear() - 2026));
      const extraMonths = Math.max(0, Number(state.incomePlan.extraSalaryByYear[contractYear] || 12) - 12);
      savings += extraMonths * baseSalaryFor(addMonths(key, -1));
    }
    if (date.getMonth() === 11 || i === state.profile.planningYears * 12 - 1) yearly.push({ year: date.getFullYear(), savings });
  }
  return { savings, yearly };
}

function render() {
  normalizeState(state);
  saveState();
  renderNavigation();
  renderScenario();
  renderDashboard();
  renderGoals();
  renderBills();
  renderExpenses();
  renderWishes();
  renderSettings();
}

function renderNavigation() {
  document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.section === activeSection));
  document.querySelectorAll(".section-panel").forEach((section) => section.classList.toggle("active", section.id === activeSection));
}

function renderScenario() {
  document.querySelectorAll("[data-scenario]").forEach((button) => button.classList.toggle("active", button.dataset.scenario === state.scenario));
}

function renderDashboard() {
  const plan = currentCyclePlan();
  const annual = annualProjection();
  const projection = threeYearProjection();
  const target = targetPlan();
  const progress = Math.min(100, Math.max(0, (target.saved / target.target) * 100));
  setText("cycleLabel", `${formatDate(plan.cycle.start)} - ${formatDate(plan.cycle.end)}`);
  setText("spendableAmount", yuan(plan.spendable));
  setText("spendableHint", plan.spendable >= 0 ? "\u8fd9\u662f\u6263\u9664\u623f\u79df\u3001\u5403\u996d\u3001\u8d26\u5355\u548c\u4e0b\u6708\u51bb\u7ed3\u540e\u7684\u751f\u6d3b\u53ef\u652f\u914d\uff0c\u8fd8\u6ca1\u6263\u4eba\u60c5\u3001\u5feb\u4e50\u6d88\u8d39\u548c\u957f\u671f\u5b58\u6b3e\u76ee\u6807\u3002" : "\u751f\u6d3b\u73b0\u91d1\u6d41\u4e3a\u8d1f\uff1a\u662f\u5fc5\u8981\u652f\u51fa\u548c\u8d26\u5355\u5df2\u8d85\u8fc7\u6536\u5165\uff0c\u4e0d\u662f\u4f60\u5df2\u7ecf\u82b1\u8d85\u3002");
  setText("targetProgress", `${Math.round(progress)}%`);
  document.getElementById("targetBar").style.width = `${progress}%`;
  setText("annualSurplus", yuan(annual.surplus));
  setText("frozenBills", yuan(plan.frozen));
  setText("yearStatus", target.gap <= 0 ? "\u5df2\u8fbe\u523015\u4e07\u76ee\u6807" : `\u6bcf\u6708\u81f3\u5c11\u6512 ${yuan(target.requiredMonthly)}`);
  renderActualSalary(plan);
  renderSavingsTracker(target);
  renderMonthlyBarChart(target);
  renderAllocation(plan);
  renderExpenseSummary(plan);
  renderAnnualRoute(projection, target);
  renderNotices(plan);
}

function renderActualSalary(plan) {
  const actual = actualIncomeFor(plan.cycle.key);
  const form = document.getElementById("actualSalaryForm");
  const values = {
    actualNetIncome: actual.netIncome ?? "",
    actualSocialContribution: actual.socialContribution ?? "",
    actualFundContribution: actual.fundContribution ?? "",
    actualTax: actual.tax ?? "",
  };
  Object.entries(values).forEach(([name, value]) => {
    if (form.elements[name] && form.elements[name].value !== String(value)) form.elements[name].value = value;
  });
  setText("incomeSourceHint", plan.incomeSource === "actual" ? "\u6309\u5b9e\u53d1\u62c6\u89e3" : "\u6309\u9884\u6d4b\u62c6\u89e3");
  setText("contributionAmount", yuan(plan.payroll.total));
  setText("socialContributionAmount", yuan(plan.payroll.social));
  setText("fundContributionAmount", yuan(plan.payroll.fund));
  setText("taxAmount", yuan(plan.payroll.tax));
  setText("contributionHint", plan.payroll.source === "actual" ? "\u8fd9\u91cc\u663e\u793a\u4f60\u5f55\u5165\u7684\u5b9e\u9645\u7f34\u7eb3\u91d1\u989d\uff1b\u672a\u586b\u7684\u9879\u76ee\u4ecd\u6309\u53c2\u6570\u9884\u4f30\u3002" : "\u672a\u586b\u5199\u5b9e\u9645\u7f34\u7eb3\u91d1\u989d\u65f6\uff0c\u6309\u53c2\u6570\u9875\u7684\u7f34\u8d39\u57fa\u6570\u548c\u6bd4\u4f8b\u9884\u4f30\u3002");
}

function renderSavingsTracker(target) {
  const form = document.getElementById("actualSavingsForm");
  if (!form) return;
  const key = cycleFor().key;
  const actualThisMonth = state.savingRecords?.[key] ?? "";
  if (form.elements.actualSavings && form.elements.actualSavings.value !== String(actualThisMonth)) form.elements.actualSavings.value = actualThisMonth;
  setText("actualSavingsAmount", yuan(target.saved));
  setText("targetGapAmount", yuan(target.gap));
  setText("requiredMonthlyAmount", yuan(target.requiredMonthly));
  setText(
    "savingPlanHint",
    isSavingPausedMonth(key)
      ? `5\u6708/6\u6708\u662f\u5b9e\u4e60\u85aa\u8d44+\u8bf7\u5047\u5904\u7406\u4e8b\u60c5\u7684\u7f13\u51b2\u671f\uff0c\u672c\u6708\u4e0d\u8981\u6c42\u6512\u94b1\u3002\u4ece7\u6708\u8d77\uff0c\u53ef\u6512\u6708\u6bcf\u6708\u81f3\u5c11\u8981\u6512 ${yuan(target.requiredMonthly)}\u3002`
      : `\u5df2\u6309\u8d77\u59cb\u5b58\u6b3e + \u6bcf\u6708\u5b9e\u9645\u6512\u4e0b\u7684\u94b1\u7d2f\u52a0\u3002\u63a5\u4e0b\u6765\u53ef\u6512\u6708\u6bcf\u6708\u81f3\u5c11\u8981\u6512 ${yuan(target.requiredMonthly)}\u3002`
  );
}

function monthlyChartData(target) {
  const rows = [];
  const start = cycleFor().key;
  let saving = target.saved;
  for (let index = 0; index < 12; index += 1) {
    const key = addMonths(start, index);
    const income = budgetIncomeFor(key);
    const expense = monthlyExpenseFor(key);
    saving += income - expense;
    const passedSavingMonths = countSavingMonths(cycleFor().key, key);
    const targetSaving = isSavingPausedMonth(key) ? target.saved : Math.min(target.target, target.saved + target.requiredMonthly * passedSavingMonths);
    rows.push({ key, income, expense, saving: Math.max(0, saving), targetSaving });
  }
  return rows;
}

function renderMonthlyBarChart(target) {
  const rows = monthlyChartData(target);
  const maxValue = Math.max(1, ...rows.flatMap((row) => [row.income, row.expense, row.saving, row.targetSaving]));
  document.getElementById("monthlyBarChart").innerHTML = rows
    .map((row) => {
      const incomeHeight = percent(row.income, maxValue);
      const expenseHeight = percent(row.expense, maxValue);
      const savingHeight = percent(row.saving, maxValue);
      const targetBottom = percent(row.targetSaving, maxValue);
      return `<div class="chart-month">
        <div class="chart-bars">
          <div class="chart-tooltip">
            <strong>${row.key}</strong>
            <span>\u6536\u5165 ${yuan(row.income)}</span>
            <span>\u652f\u51fa ${yuan(row.expense)}</span>
            <span>\u7d2f\u8ba1\u5b58\u6b3e ${yuan(row.saving)}</span>
            <span>15\u4e07\u76ee\u6807\u7ebf ${yuan(row.targetSaving)}</span>
          </div>
          <span class="target-marker" style="bottom:${targetBottom}%"></span>
          <i class="bar income" title="\u6536\u5165 ${yuan(row.income)}" style="height:${incomeHeight}%"></i>
          <i class="bar expense" title="\u652f\u51fa ${yuan(row.expense)}" style="height:${expenseHeight}%"></i>
          <i class="bar saving" title="\u7d2f\u8ba1\u5b58\u6b3e ${yuan(row.saving)}" style="height:${savingHeight}%"></i>
        </div>
        <strong>${shortMonth(row.key)}</strong>
      </div>`;
    })
    .join("");
}

function renderAllocation(plan) {
  const rows = [
    ["\u672c\u5468\u671f\u6536\u5165", plan.income, plan.incomeSource === "actual" ? "\u4f7f\u7528\u4f60\u5f55\u5165\u7684\u5b9e\u53d1\u5230\u624b\u5de5\u8d44\uff0c\u5df2\u7ecf\u662f\u6263\u4e86\u4e94\u9669\u4e00\u91d1\u548c\u4e2a\u7a0e\u7684\u6570" : "\u4f7f\u7528\u5e95\u85aa\u3001\u7ee9\u6548\u3001\u4e94\u9669\u4e00\u91d1\u548c\u4e2a\u7a0e\u9884\u6d4b"],
    ["\u5fc5\u8981\u751f\u6d3b", -plan.fixed, "\u623f\u79df\u3001\u6c34\u7535\u3001\u8bdd\u8d39\u3001\u901a\u52e4\u3001\u4e09\u9910"],
    ["\u672c\u671f\u8d26\u5355", -plan.bills, "\u624b\u673a\u5206\u671f\u548c\u5230\u671f\u8d26\u5355"],
    ["\u8865\u5145\u652f\u51fa", -plan.extra, "\u4f60\u624b\u52a8\u8bb0\u5f55\u7684\u56fa\u5b9a\u6216\u610f\u5916\u652f\u51fa"],
    ["\u4e0b\u6708\u51bb\u7ed3", -plan.frozen, "\u5148\u7528\u540e\u4ed8\u3001\u4fe1\u7528\u5361\u3001\u6708\u4ed8"],
    ["\u4eba\u60c5\u65e5\u5386", -plan.gifts, "\u672c\u6708\u751f\u65e5\u548c\u793c\u7269\u9884\u7b97"],
    ["\u751f\u6d3b\u53ef\u652f\u914d", plan.essentialSpendable, "\u8fd9\u4e2a\u6570\u4e0d\u542b\u4eba\u60c5\u3001\u5feb\u4e50\u6d88\u8d39\u548c\u957f\u671f\u5b58\u6b3e\u76ee\u6807"],
    ["\u5feb\u4e50\u6d88\u8d39\u4e0a\u9650", -plan.happy, "\u8863\u670d\u3001\u5305\u5305\u3001\u5316\u5986\u54c1\u7b49"],
    ["\u533b\u7f8e\u4f18\u5148\u76ee\u6807", -priorityWishReserve(), "\u76ae\u80a4\u7ba1\u7406\u4f18\u5148\uff0c\u6709\u4f59\u529b\u5148\u6ee1\u8db3\u5b83"],
    ["\u4eca\u5e74\u65c5\u884c\u4e00\u6b21", -flexWishReserve(), "\u4eca\u5e74\u53ea\u7559\u4e00\u6b21\u65c5\u884c\u9884\u7b97\uff0c\u5176\u4ed6\u65c5\u884c\u6682\u505c"],
    ["15\u4e07\u76ee\u6807\u538b\u529b", -plan.targetPressure, "\u8fd9\u662f\u5355\u72ec\u7684\u5b58\u6b3e\u7ebf\uff0c\u4e0d\u518d\u76f4\u63a5\u628a\u9996\u9875\u53ef\u82b1\u6263\u6210\u8d1f\u6570"],
  ];
  document.getElementById("allocationList").innerHTML = rows
    .map(([name, amount, hint]) => `<div class="allocation-row"><div><strong>${name}</strong><small>${hint}</small></div><strong class="${amount >= 0 ? "amount-good" : ""}">${yuan(amount)}</strong></div>`)
    .join("");
}

function renderExpenseSummary(plan) {
  const expenses = activeExtraExpensesFor(plan.cycle.key);
  const container = document.getElementById("expenseSummary");
  if (!expenses.length) {
    container.innerHTML = `<div class="notice"><div><strong>\u672c\u5468\u671f\u6682\u65e0\u8865\u5145\u652f\u51fa</strong><small>\u9047\u5230\u642c\u5bb6\u3001\u4fee\u7406\u3001\u4e34\u65f6\u4eba\u60c5\u3001\u65b0\u589e\u56fa\u5b9a\u9879\u90fd\u53ef\u4ee5\u8bb0\u8fdb\u6765</small></div></div>`;
    return;
  }
  container.innerHTML = expenses
    .slice(0, 5)
    .map((expense) => `<div class="notice action-notice"><div><strong>${escapeHTML(expense.name)} · ${yuan(expense.amount)}</strong><small>${expenseTypeLabel(expense.type)} · ${expense.recurring ? "\u6bcf\u6708\u56fa\u5b9a" : expense.month}</small></div><div class="row-actions"><button class="mini-button" data-action="edit-expense" data-id="${expense.id}" type="button">\u7f16\u8f91</button><button class="mini-button" data-action="archive-expense" data-id="${expense.id}" type="button">\u505c\u7528</button><button class="mini-button danger-button" data-action="delete-expense" data-id="${expense.id}" type="button">\u5220\u9664</button></div></div>`)
    .join("");
}

function renderAnnualRoute(projection, target) {
  const required = target.requiredMonthly;
  let routeSavings = target.saved;
  const rows = [];
  const calendarMonths = monthDiff(cycleFor().key, target.targetDate) + 1;
  for (let i = 0; i < calendarMonths; i += 1) {
    const key = addMonths(cycleFor().key, i);
    if (!isSavingPausedMonth(key)) routeSavings += required;
    const date = parseMonth(key);
    if (date.getMonth() === 11 || i === calendarMonths - 1) rows.push({ year: date.getFullYear(), savings: routeSavings });
  }
  document.getElementById("annualRoute").innerHTML = rows
    .map((row) => {
      const pct = Math.min(100, Math.max(0, (row.savings / target.target) * 100));
      return `<div class="route-item"><div><strong>${row.year} \u5e74\u5e95\u5012\u63a8\u5b58\u6b3e</strong><small>\u6309\u6bcf\u6708\u81f3\u5c11 ${yuan(required)} \u62c6\u89e3\uff0c\u8ddd\u79bb15\u4e07\u8fd8\u6709 ${yuan(Math.max(0, target.target - row.savings))}</small></div><div><strong>${yuan(row.savings)}</strong><small>${Math.round(pct)}%</small></div></div>`;
    })
    .join("");
}

function renderNotices(plan) {
  const target = targetPlan();
  const notices = [
    isSavingPausedMonth(plan.cycle.key)
      ? `15\u4e07\u76ee\u6807\uff1a5\u6708/6\u6708\u662f\u6682\u505c\u6512\u94b1\u6708\uff0c\u672c\u6708\u4e0d\u8981\u6c42\u6512\u3002\u540e\u9762\u5269 ${target.monthsLeft} \u4e2a\u53ef\u6512\u6708\uff0c\u6bcf\u6708\u81f3\u5c11 ${yuan(target.requiredMonthly)}\u3002`
      : `15\u4e07\u76ee\u6807\uff1a\u8fd8\u5dee ${yuan(target.gap)}\uff0c\u5269 ${target.monthsLeft} \u4e2a\u53ef\u6512\u6708\uff0c\u6bcf\u6708\u81f3\u5c11\u8981\u6512 ${yuan(target.requiredMonthly)}\u3002`,
  ];
  activeBillsFor(plan.cycle.key).forEach((bill) => notices.push(`\u8d26\u5355\uff1a${bill.name} ${yuan(bill.amount)}\uff0c\u6bcf\u6708${bill.dueDay}\u53f7\u524d\u5904\u7406\u3002`));
  state.giftEvents.filter((event) => Number(event.month) === parseMonth(plan.cycle.key).getMonth() + 1).forEach((event) => notices.push(`\u4eba\u60c5\uff1a${event.name}\uff0c\u9884\u7b97 ${event.min ? yuan(event.min) : "\u7075\u6d3b"} - ${yuan(event.max)}\u3002`));
  state.wishItems
    .filter((item) => item.status === "watching")
    .forEach((item) => {
      const remaining = Number(state.expensePlan.coolingDays || 0) - daysSince(item.addedDate);
      notices.push(remaining > 0 ? `\u60f3\u4e70\uff1a${item.name} \u51b7\u9759\u671f\u8fd8\u5269 ${remaining} \u5929\u3002` : `\u60f3\u4e70\uff1a${item.name} \u5df2\u8fc7\u51b7\u9759\u671f\uff0c\u68c0\u67e5\u989d\u5ea6\u540e\u518d\u4e70\u3002`);
    });
  if (plan.spendable < 0) notices.unshift("\u751f\u6d3b\u73b0\u91d1\u6d41\u4e3a\u8d1f\uff1a\u5fc5\u8981\u652f\u51fa\u548c\u8d26\u5355\u5df2\u8d85\u8fc7\u672c\u671f\u6536\u5165\u3002");
  else if (plan.targetShortfall > 0) notices.unshift(`\u751f\u6d3b\u73b0\u91d1\u6d41\u8fd8\u6709 ${yuan(plan.spendable)}\uff0c\u4f46\u82e5\u8981\u540c\u65f6\u8fbe\u523015\u4e07\u76ee\u6807\uff0c\u672c\u6708\u8fd8\u5dee ${yuan(plan.targetShortfall)}\u3002`);
  document.getElementById("noticeList").innerHTML = notices.slice(0, 6).map((text) => `<div class="notice"><div><strong>${escapeHTML(text)}</strong><small>\u7cfb\u7edf\u6839\u636e\u5f53\u524d\u5468\u671f\u81ea\u52a8\u751f\u6210</small></div></div>`).join("");
}

function renderGoalSummary() {
  document.getElementById("goalSummary").innerHTML = activeGoals()
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))
    .slice(0, 5)
    .map((goal) => {
      const saved = goal.isMainSavingsGoal ? actualSavingsTotal() : Number(goal.savedAmount || 0);
      const pct = Math.min(100, Math.round((saved / Number(goal.targetAmount || 1)) * 100));
      return `<div class="goal-mini"><div><strong>${escapeHTML(goal.name)}</strong><small>${escapeHTML(goal.category)} · ${budgetModeLabel(goal)} · \u5df2\u6512 ${yuan(saved)}</small></div><strong>${pct}%</strong></div>`;
    })
    .join("");
}

function renderGoals() {
  document.getElementById("goalTable").innerHTML = state.goals
    .map((goal) => {
      const saved = goal.isMainSavingsGoal ? actualSavingsTotal() : Number(goal.savedAmount || 0);
      return `<tr><td>${escapeHTML(goal.name)}</td><td>${escapeHTML(goal.category)}<br><small>${budgetModeLabel(goal)}</small></td><td>${yuan(goal.targetAmount)}</td><td>${yuan(saved)}</td><td>${yuan(goal.monthlyReserve)}</td><td>${goal.targetDate || "-"}</td><td><span class="status ${goal.status}">${statusLabel(goal.status)}</span></td><td><div class="row-actions"><button class="mini-button" data-action="edit-goal" data-id="${goal.id}" type="button">\u7f16\u8f91</button><button class="mini-button" data-action="complete-goal" data-id="${goal.id}" type="button">\u5b8c\u6210</button><button class="mini-button" data-action="archive-goal" data-id="${goal.id}" type="button">\u505c\u7528</button><button class="mini-button danger-button" data-action="delete-goal" data-id="${goal.id}" type="button">\u5220\u9664</button></div></td></tr>`;
    })
    .join("");
}

function renderBills() {
  document.getElementById("billTable").innerHTML = state.debtBills
    .map((bill) => `<tr><td>${escapeHTML(bill.name)}</td><td>${yuan(bill.amount)}</td><td>${bill.dueDay}\u53f7</td><td>${bill.endMonth || "\u957f\u671f"}</td><td>${bill.freezeNextCycle ? "\u662f" : "\u5426"}</td><td><span class="status ${bill.status}">${bill.status === "active" ? "\u8fdb\u884c\u4e2d" : bill.status === "paid" ? "\u5df2\u7ed3\u6e05" : "\u5386\u53f2\u8d26\u5355"}</span></td><td><div class="row-actions"><button class="mini-button" data-action="edit-bill" data-id="${bill.id}" type="button">\u7f16\u8f91</button><button class="mini-button" data-action="pay-bill" data-id="${bill.id}" type="button">\u7ed3\u6e05</button><button class="mini-button" data-action="archive-bill" data-id="${bill.id}" type="button">\u7ed3\u675f</button></div></td></tr>`)
    .join("");
}

function renderExpenses() {
  document.getElementById("expenseTable").innerHTML = (state.extraExpenses ?? [])
    .map((expense) => `<tr><td>${escapeHTML(expense.name)}</td><td>${yuan(expense.amount)}</td><td>${expense.recurring ? expense.startMonth || "-" : expense.month || "-"}</td><td>${expenseTypeLabel(expense.type)}</td><td>${expense.recurring ? "\u662f" : "\u5426"}</td><td><span class="status ${expense.status}">${expense.status === "active" ? "\u8fdb\u884c\u4e2d" : "\u5df2\u505c\u7528"}</span></td><td><div class="row-actions"><button class="mini-button" data-action="edit-expense" data-id="${expense.id}" type="button">\u7f16\u8f91</button><button class="mini-button" data-action="archive-expense" data-id="${expense.id}" type="button">\u505c\u7528</button><button class="mini-button danger-button" data-action="delete-expense" data-id="${expense.id}" type="button">\u5220\u9664</button></div></td></tr>`)
    .join("");
}

function renderWishes() {
  const plan = currentCyclePlan();
  document.getElementById("wishGrid").innerHTML = state.wishItems
    .map((item) => {
      const ready = daysSince(item.addedDate) >= Number(state.expensePlan.coolingDays || 0);
      const affordable = plan.spendable >= Number(item.price || 0);
      const label = item.status === "bought" ? "\u5df2\u8d2d\u4e70" : item.status === "archived" ? "\u5386\u53f2\u613f\u671b" : ready && affordable ? "\u53ef\u4ee5\u8003\u8651" : ready ? "\u989d\u5ea6\u4e0d\u8db3" : "\u51b7\u9759\u671f";
      const className = item.status === "bought" ? "done" : item.status === "archived" ? "archived" : ready && affordable ? "active" : "warn";
      return `<article class="wish-card"><div><h3>${escapeHTML(item.name)}</h3><div class="wish-meta"><span class="status ${className}">${label}</span><span class="status">${escapeHTML(item.category)}</span></div></div><strong>${yuan(item.price)}</strong><p>${escapeHTML(item.note || "\u5148\u653e\u8fdb\u6e05\u5355\uff0c\u8fc7\u51b7\u9759\u671f\u540e\u518d\u770b\u3002")}</p><p>\u52a0\u5165 ${item.addedDate} · \u5df2\u51b7\u9759 ${daysSince(item.addedDate)} \u5929</p><div class="row-actions"><button class="mini-button" data-action="edit-wish" data-id="${item.id}" type="button">\u7f16\u8f91</button><button class="mini-button" data-action="buy-wish" data-id="${item.id}" type="button">\u4e70\u4e86</button><button class="mini-button" data-action="archive-wish" data-id="${item.id}" type="button">\u79fb\u5165\u5386\u53f2</button></div></article>`;
    })
    .join("");
}

function renderSettings() {
  const fields = {
    internSalary: state.incomePlan.internSalary,
    probationSalary: state.incomePlan.probationSalary,
    regularSalary: state.incomePlan.regularSalary,
    regularMonth: state.incomePlan.regularMonth,
    payday: state.profile.payday,
    perfConservative: state.incomePlan.performance.conservative,
    perfNormal: state.incomePlan.performance.normal,
    perfOptimistic: state.incomePlan.performance.optimistic,
    contributionBase: state.incomePlan.contributionBase,
    fundRate: state.incomePlan.fundRate,
    socialRate: state.incomePlan.socialRate,
    rent: state.expensePlan.rent,
    utilities: state.expensePlan.utilities,
    phone: state.expensePlan.phone,
    commute: state.expensePlan.commute,
    breakfast: state.expensePlan.breakfast,
    lunch: state.expensePlan.lunch,
    dinner: state.expensePlan.dinner,
    currentSavings: state.profile.currentSavings,
    lockedBuffer: state.profile.lockedBuffer,
    bufferTarget: state.profile.bufferTarget,
    age25Target: state.profile.age25Target,
    happyBudget: state.expensePlan.happyBudget,
    coolingDays: state.expensePlan.coolingDays,
  };
  const form = document.getElementById("settingsForm");
  Object.entries(fields).forEach(([name, value]) => {
    if (form.elements[name] && form.elements[name].value !== String(value)) form.elements[name].value = value;
  });
}

function openGoalDialog(goal = {}) {
  dialogType = "goal";
  editingId = goal.id || "";
  openDialog(editingId ? "\u7f16\u8f91\u76ee\u6807" : "\u65b0\u589e\u76ee\u6807", `
    <label>\u540d\u79f0<input name="name" required value="${escapeAttr(goal.name || "")}" /></label>
    <label>\u5206\u7c7b<input name="category" required value="${escapeAttr(goal.category || "\u613f\u671b")}" /></label>
    <label>\u76ee\u6807\u91d1\u989d<input name="targetAmount" type="number" min="0" step="50" required value="${goal.targetAmount || 0}" /></label>
    <label>\u5b9e\u9645\u5df2\u6512<input name="savedAmount" type="number" min="0" step="50" value="${goal.isMainSavingsGoal ? actualSavingsTotal() : goal.savedAmount || 0}" /></label>
    <label>\u6bcf\u6708\u9884\u7559<input name="monthlyReserve" type="number" min="0" step="50" value="${goal.monthlyReserve || 0}" /></label>
    <label>\u76ee\u6807\u65e5\u671f<input name="targetDate" type="month" value="${goal.targetDate || monthKey(today())}" /></label>
    <label>\u4f18\u5148\u7ea7<select name="priority">${optionList(["high", "medium", "low"], goal.priority || "medium", priorityLabel)}</select></label>
    <label>\u72b6\u6001<select name="status">${optionList(["active", "done", "archived"], goal.status || "active", statusLabel)}</select></label>
  `);
}

function openBillDialog(bill = {}) {
  dialogType = "bill";
  editingId = bill.id || "";
  openDialog(editingId ? "\u7f16\u8f91\u8d26\u5355" : "\u65b0\u589e\u8d26\u5355", `
    <label>\u540d\u79f0<input name="name" required value="${escapeAttr(bill.name || "")}" /></label>
    <label>\u91d1\u989d<input name="amount" type="number" min="0" step="0.1" required value="${bill.amount || 0}" /></label>
    <label>\u5230\u671f\u65e5<input name="dueDay" type="number" min="1" max="28" required value="${bill.dueDay || 10}" /></label>
    <label>\u7ed3\u675f\u6708\u4efd<input name="endMonth" type="month" value="${bill.endMonth || ""}" /></label>
    <label>\u51bb\u7ed3\u4e0b\u6708<select name="freezeNextCycle">${optionList(["true", "false"], String(bill.freezeNextCycle ?? true), (value) => (value === "true" ? "\u662f" : "\u5426"))}</select></label>
    <label>\u72b6\u6001<select name="status">${optionList(["active", "paid", "archived"], bill.status || "active", (value) => (value === "paid" ? "\u5df2\u7ed3\u6e05" : value === "archived" ? "\u5386\u53f2\u8d26\u5355" : "\u8fdb\u884c\u4e2d"))}</select></label>
  `);
}

function openExpenseDialog(expense = {}) {
  dialogType = "expense";
  editingId = expense.id || "";
  openDialog(editingId ? "\u7f16\u8f91\u652f\u51fa" : "\u65b0\u589e\u652f\u51fa", `
    <label>\u540d\u79f0<input name="name" required value="${escapeAttr(expense.name || "")}" /></label>
    <label>\u91d1\u989d<input name="amount" type="number" min="0" step="0.1" required value="${expense.amount || 0}" /></label>
    <label>\u6708\u4efd<input name="month" type="month" value="${expense.month || expense.startMonth || cycleFor().key}" /></label>
    <label>\u7c7b\u578b<select name="type">${optionList(["fixed", "unexpected"], expense.type || "unexpected", expenseTypeLabel)}</select></label>
    <label>\u662f\u5426\u6bcf\u6708<select name="recurring">${optionList(["false", "true"], String(expense.recurring ?? false), (value) => (value === "true" ? "\u662f" : "\u5426"))}</select></label>
    <label>\u72b6\u6001<select name="status">${optionList(["active", "archived"], expense.status || "active", statusLabel)}</select></label>
  `);
}

function openWishDialog(item = {}) {
  dialogType = "wish";
  editingId = item.id || "";
  openDialog(editingId ? "\u7f16\u8f91\u60f3\u4e70" : "\u65b0\u589e\u60f3\u4e70", `
    <label>\u540d\u79f0<input name="name" required value="${escapeAttr(item.name || "")}" /></label>
    <label>\u5206\u7c7b<input name="category" required value="${escapeAttr(item.category || TEXT.happySpend)}" /></label>
    <label>\u4ef7\u683c<input name="price" type="number" min="0" step="10" required value="${item.price || 0}" /></label>
    <label>\u52a0\u5165\u65e5\u671f<input name="addedDate" type="date" value="${item.addedDate || today().toISOString().slice(0, 10)}" /></label>
    <label>\u72b6\u6001<select name="status">${optionList(["watching", "bought", "archived"], item.status || "watching", wishLabel)}</select></label>
    <label class="full">\u5907\u6ce8<input name="note" value="${escapeAttr(item.note || "")}" /></label>
  `);
}

function openDialog(title, body) {
  setText("dialogTitle", title);
  document.getElementById("dialogBody").innerHTML = body;
  document.getElementById("editDialog").showModal();
}

function closeEditDialog() {
  document.getElementById("editDialog").close();
  dialogType = "";
  editingId = "";
}

function saveDialog() {
  const formData = new FormData(document.getElementById("dialogForm"));
  if (dialogType === "goal") {
    const previous = state.goals.find((goal) => goal.id === editingId);
    const goal = {
      id: editingId || uid(),
      name: formData.get("name").trim(),
      category: formData.get("category").trim(),
      targetAmount: Number(formData.get("targetAmount")),
      savedAmount: Number(formData.get("savedAmount")),
      monthlyReserve: Number(formData.get("monthlyReserve")),
      targetDate: formData.get("targetDate"),
      priority: formData.get("priority"),
      status: formData.get("status"),
      isMainSavingsGoal: previous?.isMainSavingsGoal || false,
    };
    upsert(state.goals, goal);
    if (goal.isMainSavingsGoal) {
      state.profile.age25Target = 150000;
      state.savingRecords[cycleFor().key] = goal.savedAmount;
      state.profile.currentSavings = goal.savedAmount;
    }
    showToast(editingId ? "\u76ee\u6807\u5df2\u66f4\u65b0" : "\u76ee\u6807\u5df2\u65b0\u589e");
  }
  if (dialogType === "bill") {
    upsert(state.debtBills, {
      id: editingId || uid(),
      name: formData.get("name").trim(),
      amount: Number(formData.get("amount")),
      dueDay: Number(formData.get("dueDay")),
      endMonth: formData.get("endMonth"),
      freezeNextCycle: formData.get("freezeNextCycle") === "true",
      status: formData.get("status"),
    });
    showToast(editingId ? "\u8d26\u5355\u5df2\u66f4\u65b0" : "\u8d26\u5355\u5df2\u65b0\u589e");
  }
  if (dialogType === "expense") {
    const recurring = formData.get("recurring") === "true";
    upsert(state.extraExpenses, {
      id: editingId || uid(),
      name: formData.get("name").trim(),
      amount: Number(formData.get("amount")),
      month: recurring ? "" : formData.get("month"),
      startMonth: recurring ? formData.get("month") : "",
      type: formData.get("type"),
      recurring,
      status: formData.get("status"),
    });
    showToast(editingId ? "\u652f\u51fa\u5df2\u66f4\u65b0" : "\u652f\u51fa\u5df2\u65b0\u589e");
  }
  if (dialogType === "wish") {
    upsert(state.wishItems, {
      id: editingId || uid(),
      name: formData.get("name").trim(),
      category: formData.get("category").trim(),
      price: Number(formData.get("price")),
      addedDate: formData.get("addedDate"),
      status: formData.get("status"),
      note: formData.get("note").trim(),
    });
    showToast(editingId ? "\u60f3\u4e70\u5df2\u66f4\u65b0" : "\u60f3\u4e70\u5df2\u65b0\u589e");
  }
  dialogType = "";
  editingId = "";
  render();
}

function upsert(list, item) {
  const index = list.findIndex((entry) => entry.id === item.id);
  if (index >= 0) list[index] = { ...list[index], ...item };
  else list.push(item);
}

function updateActualSalary(name, rawValue) {
  const fieldMap = {
    actualNetIncome: "netIncome",
    actualSocialContribution: "socialContribution",
    actualFundContribution: "fundContribution",
    actualTax: "tax",
  };
  const key = cycleFor().key;
  const field = fieldMap[name];
  if (!field) return;
  const record = { ...(state.actualIncomeRecords[key] || {}) };
  if (rawValue === "") delete record[field];
  else record[field] = Number(rawValue);
  if (Object.keys(record).length) state.actualIncomeRecords[key] = record;
  else delete state.actualIncomeRecords[key];
  render();
}

function updateActualSavings(rawValue) {
  const key = cycleFor().key;
  if (rawValue === "") delete state.savingRecords[key];
  else state.savingRecords[key] = Number(rawValue);
  const saved = actualSavingsTotal();
  const mainGoal = mainSavingsGoal();
  if (mainGoal) {
    mainGoal.savedAmount = saved;
    mainGoal.targetAmount = 150000;
    mainGoal.monthlyReserve = targetPlan().requiredMonthly;
  }
  render();
}

function updateSettings(name, rawValue) {
  const value = rawValue === "" ? 0 : Number(rawValue);
  const map = {
    internSalary: ["incomePlan", "internSalary"],
    probationSalary: ["incomePlan", "probationSalary"],
    regularSalary: ["incomePlan", "regularSalary"],
    regularMonth: ["incomePlan", "regularMonth"],
    payday: ["profile", "payday"],
    contributionBase: ["incomePlan", "contributionBase"],
    fundRate: ["incomePlan", "fundRate"],
    socialRate: ["incomePlan", "socialRate"],
    rent: ["expensePlan", "rent"],
    utilities: ["expensePlan", "utilities"],
    phone: ["expensePlan", "phone"],
    commute: ["expensePlan", "commute"],
    breakfast: ["expensePlan", "breakfast"],
    lunch: ["expensePlan", "lunch"],
    dinner: ["expensePlan", "dinner"],
    currentSavings: ["profile", "currentSavings"],
    lockedBuffer: ["profile", "lockedBuffer"],
    bufferTarget: ["profile", "bufferTarget"],
    age25Target: ["profile", "age25Target"],
    happyBudget: ["expensePlan", "happyBudget"],
    coolingDays: ["expensePlan", "coolingDays"],
  };
  if (name === "perfConservative") state.incomePlan.performance.conservative = value;
  else if (name === "perfNormal") state.incomePlan.performance.normal = value;
  else if (name === "perfOptimistic") state.incomePlan.performance.optimistic = value;
  else if (map[name]) {
    const [group, key] = map[name];
    state[group][key] = name === "regularMonth" ? rawValue : value;
  }
  render();
}

function handleActions(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === "edit-goal") openGoalDialog(state.goals.find((item) => item.id === id));
  if (action === "complete-goal") {
    const goal = state.goals.find((item) => item.id === id);
    goal.status = "done";
    goal.savedAmount = goal.targetAmount;
    showToast("\u76ee\u6807\u5b8c\u6210\uff0c\u5df2\u7ecf\u653e\u8fdb\u6210\u5c31\u8bb0\u5f55");
    render();
  }
  if (action === "archive-goal") {
    state.goals.find((item) => item.id === id).status = "archived";
    showToast("\u76ee\u6807\u5df2\u505c\u7528\uff0c\u4e0d\u518d\u5360\u7528\u9884\u7b97");
    render();
  }
  if (action === "delete-goal") {
    const goal = state.goals.find((item) => item.id === id);
    if (goal?.isMainSavingsGoal) {
      showToast("15\u4e07\u5e95\u7ebf\u76ee\u6807\u4e0d\u5efa\u8bae\u5220\u9664\uff0c\u53ef\u4ee5\u7f16\u8f91\u91d1\u989d\u548c\u65e5\u671f");
      return;
    }
    if (!confirm("\u786e\u5b9a\u5220\u9664\u8fd9\u4e2a\u76ee\u6807\u5417\uff1f\u5220\u9664\u540e\u4e0d\u4f1a\u518d\u663e\u793a\u5386\u53f2\u3002")) return;
    state.goals = state.goals.filter((item) => item.id !== id);
    showToast("\u76ee\u6807\u5df2\u5220\u9664");
    render();
  }
  if (action === "edit-bill") openBillDialog(state.debtBills.find((item) => item.id === id));
  if (action === "pay-bill") {
    state.debtBills.find((item) => item.id === id).status = "paid";
    showToast("\u8d26\u5355\u5df2\u6807\u8bb0\u7ed3\u6e05");
    render();
  }
  if (action === "archive-bill") {
    state.debtBills.find((item) => item.id === id).status = "archived";
    showToast("\u8d26\u5355\u5df2\u7ed3\u675f\uff0c\u5df2\u653e\u5165\u5386\u53f2\u8d26\u5355");
    render();
  }
  if (action === "edit-expense") openExpenseDialog(state.extraExpenses.find((item) => item.id === id));
  if (action === "archive-expense") {
    state.extraExpenses.find((item) => item.id === id).status = "archived";
    showToast("\u652f\u51fa\u5df2\u505c\u7528");
    render();
  }
  if (action === "delete-expense") {
    if (!confirm("\u786e\u5b9a\u5220\u9664\u8fd9\u7b14\u652f\u51fa\u5417\uff1f")) return;
    state.extraExpenses = state.extraExpenses.filter((item) => item.id !== id);
    showToast("\u652f\u51fa\u5df2\u5220\u9664");
    render();
  }
  if (action === "edit-wish") openWishDialog(state.wishItems.find((item) => item.id === id));
  if (action === "buy-wish") {
    state.wishItems.find((item) => item.id === id).status = "bought";
    showToast("\u5df2\u8bb0\u5f55\u8d2d\u4e70");
    render();
  }
  if (action === "archive-wish") {
    state.wishItems.find((item) => item.id === id).status = "archived";
    showToast("\u60f3\u4e70\u5df2\u79fb\u5165\u5386\u53f2");
    render();
  }
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `finance-backup-${today().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("\u5907\u4efd\u6587\u4ef6\u5df2\u5bfc\u51fa");
}

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      state = normalizeState(mergeState(clone(defaults), JSON.parse(reader.result)));
      showToast("\u5907\u4efd\u5df2\u5bfc\u5165");
      render();
    } catch {
      showToast("\u5bfc\u5165\u5931\u8d25\uff0c\u6587\u4ef6\u683c\u5f0f\u4e0d\u5bf9");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      activeSection = button.dataset.section;
      render();
    });
  });
  document.querySelectorAll("[data-scenario]").forEach((button) => {
    button.addEventListener("click", () => {
      state.scenario = button.dataset.scenario;
      showToast(`\u5df2\u5207\u6362\u5230${button.textContent}\u7ee9\u6548\u60c5\u666f`);
      render();
    });
  });
  document.getElementById("newGoal").addEventListener("click", () => openGoalDialog());
  document.getElementById("newBill").addEventListener("click", () => openBillDialog());
  document.getElementById("newExpense").addEventListener("click", () => openExpenseDialog());
  document.getElementById("newQuickExpense").addEventListener("click", () => openExpenseDialog());
  document.getElementById("newWish").addEventListener("click", () => openWishDialog());
  document.getElementById("actualSalaryForm").addEventListener("input", (event) => {
    if (event.target.name) updateActualSalary(event.target.name, event.target.value);
  });
  document.getElementById("actualSavingsForm").addEventListener("input", (event) => {
    if (event.target.name === "actualSavings") updateActualSavings(event.target.value);
  });
  document.getElementById("clearActualSalary").addEventListener("click", () => {
    delete state.actualIncomeRecords[cycleFor().key];
    showToast("\u5df2\u6e05\u7a7a\u672c\u6708\u5b9e\u53d1\u5de5\u8d44\u8bb0\u5f55");
    render();
  });
  document.getElementById("settingsForm").addEventListener("input", (event) => {
    if (event.target.name) updateSettings(event.target.name, event.target.value);
  });
  document.getElementById("dialogForm").addEventListener("submit", (event) => {
    event.preventDefault();
    saveDialog();
    closeEditDialog();
  });
  document.getElementById("closeDialog").addEventListener("click", closeEditDialog);
  document.getElementById("cancelDialog").addEventListener("click", closeEditDialog);
  document.body.addEventListener("click", handleActions);
  document.getElementById("exportData").addEventListener("click", exportData);
  document.getElementById("importData").addEventListener("change", importData);
  document.getElementById("resetData").addEventListener("click", () => {
    if (!confirm("\u786e\u5b9a\u6062\u590d\u9ed8\u8ba4\u6570\u636e\u5417\uff1f\u5f53\u524d\u672c\u673a\u6570\u636e\u4f1a\u88ab\u8986\u76d6\u3002")) return;
    state = clone(defaults);
    showToast("\u5df2\u6062\u590d\u9ed8\u8ba4\u6570\u636e");
    render();
  });
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function formatDate(date) {
  return `${date.getMonth() + 1}\u6708${date.getDate()}\u65e5`;
}

function daysSince(dateString) {
  return Math.max(0, Math.floor((today() - new Date(dateString)) / 86400000));
}

function monthDiff(startKey, endKey) {
  const start = parseMonth(startKey);
  const end = parseMonth(endKey);
  return (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
}

function isSavingPausedMonth(month) {
  return (state.profile.savingPausedMonths ?? []).includes(month);
}

function countSavingMonths(startKey, endKey) {
  const total = monthDiff(startKey, endKey) + 1;
  let count = 0;
  for (let index = 0; index < total; index += 1) {
    if (!isSavingPausedMonth(addMonths(startKey, index))) count += 1;
  }
  return Math.max(1, count);
}

function percent(value, maxValue) {
  return Math.max(4, Math.min(100, (Number(value || 0) / maxValue) * 100));
}

function shortMonth(key) {
  return `${Number(key.slice(5, 7))}\u6708`;
}

function priorityRank(priority) {
  return { high: 1, medium: 2, low: 3 }[priority] ?? 4;
}

function priorityLabel(priority) {
  return { high: "\u9ad8", medium: "\u4e2d", low: "\u4f4e" }[priority] ?? priority;
}

function statusLabel(status) {
  return { active: "\u8fdb\u884c\u4e2d", done: "\u5df2\u5b8c\u6210", archived: "\u5df2\u505c\u7528" }[status] ?? status;
}

function wishLabel(status) {
  return { watching: "\u89c2\u5bdf\u4e2d", bought: "\u5df2\u8d2d\u4e70", archived: "\u5386\u53f2\u613f\u671b" }[status] ?? status;
}

function budgetModeLabel(goal) {
  if (goal.isMainSavingsGoal) return "15\u4e07\u5e95\u7ebf";
  return { priority: "\u533b\u7f8e\u4f18\u5148", flex: "\u5f39\u6027\u76ee\u6807", paused: "\u6682\u505c", undefined: "\u666e\u901a\u76ee\u6807" }[goal.budgetMode] ?? "\u666e\u901a\u76ee\u6807";
}

function expenseTypeLabel(type) {
  return { fixed: "\u56fa\u5b9a\u652f\u51fa", unexpected: "\u610f\u5916\u652f\u51fa" }[type] ?? type;
}

function optionList(values, selected, labeler = (value) => value) {
  return values.map((value) => `<option value="${value}" ${value === selected ? "selected" : ""}>${labeler(value)}</option>`).join("");
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHTML(value);
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2200);
}

bindEvents();
render();
