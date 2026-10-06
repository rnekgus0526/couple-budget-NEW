"use client";

import { useEffect, useMemo, useState } from "react";

type Person = "태환" | "선영";
type RecordType = "deposit" | "expense";

type ExpenseCategory =
  | "렌트비"
  | "장보기"
  | "외식"
  | "생활용품"
  | "교통"
  | "데이트"
  | "기타";

type BudgetRecord = {
  id: string;
  type: RecordType;
  date: string;
  amount: number;
  memo: string;
  person?: Person;
  category?: ExpenseCategory;
};

type FilterType = "전체" | "입금" | ExpenseCategory;
type ChartPeriod = "day" | "week" | "month" | "year";

type ChartDataPoint = {
  key: string;
  label: string;
  amount: number;
};

const expenseCategories: ExpenseCategory[] = [
  "렌트비",
  "장보기",
  "외식",
  "생활용품",
  "교통",
  "데이트",
  "기타",
];

const filters: FilterType[] = ["전체", "입금", ...expenseCategories];

const STORAGE_KEY = "couple-budget-records-v2";

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(amount: number) {
  return amount.toLocaleString("ko-KR");
}

function formatDate(date: string) {
  if (!date) return "";
  const [year, month, day] = date.split("-");
  return `${year}.${month}.${day}`;
}

function parseDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfWeek(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function getChartTitle(period: ChartPeriod) {
  if (period === "day") return "최근 7일";
  if (period === "week") return "최근 8주";
  if (period === "month") return "최근 12개월";
  return "최근 5년";
}

function buildExpenseChartData(
  records: BudgetRecord[],
  period: ChartPeriod
): ChartDataPoint[] {
  const expenses = records.filter((record) => record.type === "expense");
  const now = new Date();

  if (period === "day") {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (6 - index));
      date.setHours(0, 0, 0, 0);
      const key = toDateKey(date);
      const amount = expenses
        .filter((record) => record.date === key)
        .reduce((sum, record) => sum + record.amount, 0);

      return {
        key,
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        amount,
      };
    });
  }

  if (period === "week") {
    const currentWeek = startOfWeek(now);

    return Array.from({ length: 8 }, (_, index) => {
      const start = new Date(currentWeek);
      start.setDate(currentWeek.getDate() - (7 - index) * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      const amount = expenses
        .filter((record) => {
          const date = parseDate(record.date);
          return date >= start && date <= end;
        })
        .reduce((sum, record) => sum + record.amount, 0);

      return {
        key: toDateKey(start),
        label: `${start.getMonth() + 1}/${start.getDate()}`,
        amount,
      };
    });
  }

  if (period === "month") {
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
      const year = date.getFullYear();
      const month = date.getMonth();
      const amount = expenses
        .filter((record) => {
          const recordDate = parseDate(record.date);
          return (
            recordDate.getFullYear() === year && recordDate.getMonth() === month
          );
        })
        .reduce((sum, record) => sum + record.amount, 0);

      return {
        key: `${year}-${String(month + 1).padStart(2, "0")}`,
        label: `${String(year).slice(2)}.${month + 1}`,
        amount,
      };
    });
  }

  return Array.from({ length: 5 }, (_, index) => {
    const year = now.getFullYear() - (4 - index);
    const amount = expenses
      .filter((record) => parseDate(record.date).getFullYear() === year)
      .reduce((sum, record) => sum + record.amount, 0);

    return {
      key: String(year),
      label: String(year),
      amount,
    };
  });
}

export default function Home() {
  const [records, setRecords] = useState<BudgetRecord[]>([]);

  const [depositDate, setDepositDate] = useState(getToday());
  const [depositPerson, setDepositPerson] = useState<Person>("태환");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositMemo, setDepositMemo] = useState("");

  const [expenseDate, setExpenseDate] = useState(getToday());
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseMemo, setExpenseMemo] = useState("");
  const [expensePerson, setExpensePerson] = useState<Person>("태환");
  const [expenseCategory, setExpenseCategory] =
    useState<ExpenseCategory>("장보기");

  const [filter, setFilter] = useState<FilterType>("전체");
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("month");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        const migrated: BudgetRecord[] = parsed.map((item) => ({
          id: item.id ?? crypto.randomUUID(),
          type: item.type ?? "expense",
          date: item.date ?? getToday(),
          amount: Number(item.amount) || 0,
          memo: item.memo ?? "",
          person: item.person,
          category: item.category,
        }));

        setRecords(migrated);
      }
    } catch {
      setRecords([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records]);

  const totalDeposit = useMemo(() => {
    return records
      .filter((record) => record.type === "deposit")
      .reduce((sum, record) => sum + record.amount, 0);
  }, [records]);

  const totalExpense = useMemo(() => {
    return records
      .filter((record) => record.type === "expense")
      .reduce((sum, record) => sum + record.amount, 0);
  }, [records]);

  const balance = totalDeposit - totalExpense;

  const chartData = useMemo(
    () => buildExpenseChartData(records, chartPeriod),
    [records, chartPeriod]
  );

  const chartMax = useMemo(
    () => Math.max(...chartData.map((item) => item.amount), 1),
    [chartData]
  );

  const chartTotal = useMemo(
    () => chartData.reduce((sum, item) => sum + item.amount, 0),
    [chartData]
  );

  const filteredRecords = useMemo(() => {
    const sorted = [...records].sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);

      if (dateCompare !== 0) return dateCompare;

      return b.id.localeCompare(a.id);
    });

    if (filter === "전체") {
      return sorted;
    }

    if (filter === "입금") {
      return sorted.filter((record) => record.type === "deposit");
    }

    return sorted.filter(
      (record) => record.type === "expense" && record.category === filter
    );
  }, [records, filter]);

  const addDeposit = () => {
    const amount = Number(depositAmount);

    if (!depositDate) {
      alert("입금 날짜를 선택해주세요.");
      return;
    }

    if (!amount || amount <= 0) {
      alert("입금 금액을 입력해주세요.");
      return;
    }

    const newRecord: BudgetRecord = {
      id: crypto.randomUUID(),
      type: "deposit",
      date: depositDate,
      amount,
      memo: depositMemo.trim() || "입금",
      person: depositPerson,
    };

    setRecords((prev) => [newRecord, ...prev]);
    setDepositAmount("");
    setDepositMemo("");
    setDepositDate(getToday());
    setDepositPerson("태환");
  };

  const addExpense = () => {
    const amount = Number(expenseAmount);

    if (!expenseDate) {
      alert("지출 날짜를 선택해주세요.");
      return;
    }

    if (!amount || amount <= 0) {
      alert("지출 금액을 입력해주세요.");
      return;
    }

    const newRecord: BudgetRecord = {
      id: crypto.randomUUID(),
      type: "expense",
      date: expenseDate,
      amount,
      memo: expenseMemo.trim() || expenseCategory,
      person: expensePerson,
      category: expenseCategory,
    };

    setRecords((prev) => [newRecord, ...prev]);
    setExpenseAmount("");
    setExpenseMemo("");
    setExpenseDate(getToday());
    setExpensePerson("태환");
    setExpenseCategory("장보기");
  };

  const deleteRecord = (id: string) => {
    const ok = confirm("이 내역을 삭제할까요?");

    if (!ok) return;

    setRecords((prev) => prev.filter((record) => record.id !== id));
  };

  const clearAll = () => {
    const ok = confirm("모든 내역을 삭제할까요?");

    if (!ok) return;

    setRecords([]);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-100 via-rose-100 to-fuchsia-100 px-4 py-6 text-rose-950">
      <div className="mx-auto max-w-5xl">
        <section className="mb-6 rounded-[2rem] border-4 border-white bg-white/80 p-6 shadow-xl shadow-pink-200/60">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center rounded-full bg-pink-200 px-4 py-1 text-sm font-bold text-pink-700">
                Couple Budget
              </div>

              <h1 className="text-3xl font-black tracking-tight text-pink-600 md:text-5xl">
                태환 & 선영 가계부
              </h1>

              <p className="mt-3 text-lg font-bold text-rose-500">
                절약! 저축! 화이팅!
              </p>
            </div>

            <div className="relative mx-auto h-28 w-32 md:mx-0">
              <div className="absolute left-5 top-6 h-20 w-24 rounded-[45%] border-4 border-pink-300 bg-white shadow-lg" />
              <div className="absolute left-8 top-2 h-9 w-9 rotate-[-25deg] rounded-md border-4 border-pink-300 bg-white" />
              <div className="absolute right-8 top-2 h-9 w-9 rotate-[25deg] rounded-md border-4 border-pink-300 bg-white" />
              <div className="absolute left-12 top-14 h-2 w-2 rounded-full bg-rose-900" />
              <div className="absolute right-12 top-14 h-2 w-2 rounded-full bg-rose-900" />
              <div className="absolute left-[58px] top-[66px] h-2 w-3 rounded-full bg-yellow-300" />
              <div className="absolute right-5 top-8 h-8 w-10 rounded-full bg-pink-400" />
              <div className="absolute right-3 top-7 h-5 w-5 rounded-full bg-pink-400" />
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-[2rem] border-4 border-white bg-emerald-100 p-5 shadow-lg">
            <p className="text-sm font-bold text-emerald-600">총 입금</p>
            <p className="mt-2 text-3xl font-black text-emerald-700">
              {formatMoney(totalDeposit)} 불
            </p>
          </div>

          <div className="rounded-[2rem] border-4 border-white bg-rose-100 p-5 shadow-lg">
            <p className="text-sm font-bold text-rose-600">전체 지출</p>
            <p className="mt-2 text-3xl font-black text-rose-700">
              {formatMoney(totalExpense)} 불
            </p>
          </div>

          <div
            className={`rounded-[2rem] border-4 border-white p-5 shadow-lg ${
              balance >= 0 ? "bg-pink-200" : "bg-red-200"
            }`}
          >
            <p className="text-sm font-bold text-pink-700">현재 통장 잔액</p>
            <p
              className={`mt-2 text-3xl font-black ${
                balance >= 0 ? "text-pink-700" : "text-red-700"
              }`}
            >
              {formatMoney(balance)} 불
            </p>
          </div>
        </section>

        <section className="mb-6 grid gap-5 lg:grid-cols-2">
          <div className="rounded-[2rem] border-4 border-white bg-white/85 p-5 shadow-xl shadow-pink-200/50">
            <h2 className="mb-4 text-2xl font-black text-emerald-600">
              입금 추가
            </h2>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-bold text-rose-500">
                  날짜
                </label>
                <input
                  type="date"
                  value={depositDate}
                  onChange={(event) => setDepositDate(event.target.value)}
                  className="w-full rounded-2xl border-2 border-emerald-200 bg-white px-4 py-3 font-bold outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-rose-500">
                  입금한 사람
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["태환", "선영"] as Person[]).map((person) => (
                    <button
                      key={person}
                      onClick={() => setDepositPerson(person)}
                      className={`rounded-2xl px-4 py-3 font-black transition ${
                        depositPerson === person
                          ? "bg-emerald-500 text-white shadow-lg"
                          : "bg-emerald-100 text-emerald-600"
                      }`}
                    >
                      {person}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-rose-500">
                  입금 금액
                </label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(event) => setDepositAmount(event.target.value)}
                  placeholder="예: 1000"
                  className="w-full rounded-2xl border-2 border-emerald-200 bg-white px-4 py-3 font-bold outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-rose-500">
                  메모
                </label>
                <input
                  value={depositMemo}
                  onChange={(event) => setDepositMemo(event.target.value)}
                  placeholder="예: 월급, 저축, 통장 입금"
                  className="w-full rounded-2xl border-2 border-emerald-200 bg-white px-4 py-3 font-bold outline-none focus:border-emerald-400"
                />
              </div>

              <button
                onClick={addDeposit}
                className="w-full rounded-2xl bg-emerald-500 px-5 py-3 text-lg font-black text-white shadow-lg transition hover:bg-emerald-600"
              >
                입금 추가하기
              </button>
            </div>
          </div>

          <div className="rounded-[2rem] border-4 border-white bg-white/85 p-5 shadow-xl shadow-pink-200/50">
            <h2 className="mb-4 text-2xl font-black text-pink-600">
              지출 추가
            </h2>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-bold text-rose-500">
                  날짜
                </label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(event) => setExpenseDate(event.target.value)}
                  className="w-full rounded-2xl border-2 border-pink-200 bg-white px-4 py-3 font-bold outline-none focus:border-pink-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-rose-500">
                  결제한 사람
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["태환", "선영"] as Person[]).map((person) => (
                    <button
                      key={person}
                      onClick={() => setExpensePerson(person)}
                      className={`rounded-2xl px-4 py-3 font-black transition ${
                        expensePerson === person
                          ? "bg-pink-500 text-white shadow-lg"
                          : "bg-pink-100 text-pink-600"
                      }`}
                    >
                      {person}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-rose-500">
                  카테고리
                </label>
                <select
                  value={expenseCategory}
                  onChange={(event) =>
                    setExpenseCategory(event.target.value as ExpenseCategory)
                  }
                  className="w-full rounded-2xl border-2 border-pink-200 bg-white px-4 py-3 font-bold outline-none focus:border-pink-400"
                >
                  {expenseCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-rose-500">
                  지출 금액
                </label>
                <input
                  type="number"
                  value={expenseAmount}
                  onChange={(event) => setExpenseAmount(event.target.value)}
                  placeholder="예: 50"
                  className="w-full rounded-2xl border-2 border-pink-200 bg-white px-4 py-3 font-bold outline-none focus:border-pink-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-rose-500">
                  메모
                </label>
                <input
                  value={expenseMemo}
                  onChange={(event) => setExpenseMemo(event.target.value)}
                  placeholder="예: 마트 장보기"
                  className="w-full rounded-2xl border-2 border-pink-200 bg-white px-4 py-3 font-bold outline-none focus:border-pink-400"
                />
              </div>

              <button
                onClick={addExpense}
                className="w-full rounded-2xl bg-pink-500 px-5 py-3 text-lg font-black text-white shadow-lg transition hover:bg-pink-600"
              >
                지출 추가하기
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border-4 border-white bg-white/85 p-5 shadow-xl shadow-pink-200/50">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-2xl font-black text-pink-600">내역</h2>

            <button
              onClick={clearAll}
              className="rounded-full bg-rose-100 px-4 py-2 text-sm font-black text-rose-600 transition hover:bg-rose-200"
            >
              전체 삭제
            </button>
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`rounded-full px-4 py-2 text-sm font-black transition ${
                  filter === item
                    ? "bg-pink-500 text-white shadow-md"
                    : "bg-pink-100 text-pink-600 hover:bg-pink-200"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="mb-6 rounded-[1.75rem] border-2 border-pink-100 bg-gradient-to-br from-white to-pink-50 p-4 md:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-rose-400">지출 그래프</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <p className="text-2xl font-black text-pink-600">
                    {formatMoney(chartTotal)} 불
                  </p>
                  <span className="text-xs font-bold text-rose-400">
                    {getChartTitle(chartPeriod)} 총지출
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1 rounded-2xl bg-pink-100 p-1">
                {([
                  ["day", "일"],
                  ["week", "주"],
                  ["month", "월"],
                  ["year", "년"],
                ] as [ChartPeriod, string][]).map(([period, label]) => (
                  <button
                    key={period}
                    onClick={() => setChartPeriod(period)}
                    className={`rounded-xl px-3 py-2 text-sm font-black transition ${
                      chartPeriod === period
                        ? "bg-pink-500 text-white shadow-sm"
                        : "text-pink-500 hover:bg-white/70"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto pb-1">
              <div
                className={`flex h-56 items-end gap-2 ${
                  chartPeriod === "month"
                    ? "min-w-[760px]"
                    : chartPeriod === "week"
                      ? "min-w-[560px]"
                      : "min-w-[430px]"
                }`}
              >
                {chartData.map((item) => {
                  const barHeight =
                    item.amount === 0
                      ? 4
                      : Math.max(12, Math.round((item.amount / chartMax) * 150));

                  return (
                    <div
                      key={item.key}
                      className="flex min-w-0 flex-1 flex-col items-center justify-end"
                    >
                      <div className="mb-2 h-5 text-center text-[10px] font-black text-pink-600 sm:text-xs">
                        {item.amount > 0 ? formatMoney(item.amount) : ""}
                      </div>
                      <div className="flex h-[150px] w-full items-end justify-center">
                        <div
                          title={`${item.label}: ${formatMoney(item.amount)} 불`}
                          className={`w-[70%] max-w-12 rounded-t-xl transition-all ${
                            item.amount > 0
                              ? "bg-gradient-to-t from-pink-500 to-rose-300 shadow-sm"
                              : "bg-pink-100"
                          }`}
                          style={{ height: `${barHeight}px` }}
                        />
                      </div>
                      <div className="mt-2 w-full border-t-2 border-pink-100 pt-2 text-center text-[10px] font-black text-rose-400 sm:text-xs">
                        {item.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="mt-2 text-xs font-bold text-rose-300">
              일: 최근 7일 · 주: 최근 8주 · 월: 최근 12개월 · 년: 최근 5년
            </p>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="rounded-[2rem] bg-pink-50 p-8 text-center font-bold text-pink-400">
              아직 내역이 없어요.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecords.map((record) => (
                <div
                  key={record.id}
                  className={`rounded-[1.5rem] border-2 p-4 shadow-sm ${
                    record.type === "deposit"
                      ? "border-emerald-100 bg-emerald-50"
                      : "border-pink-100 bg-pink-50"
                  }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            record.type === "deposit"
                              ? "bg-emerald-200 text-emerald-700"
                              : "bg-pink-200 text-pink-700"
                          }`}
                        >
                          {record.type === "deposit" ? "입금" : "지출"}
                        </span>

                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-rose-500">
                          {formatDate(record.date)}
                        </span>

                        {record.type === "expense" && record.category && (
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-pink-500">
                            {record.category}
                          </span>
                        )}

                        {record.person && (
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-purple-500">
                            {record.type === "deposit"
                              ? `${record.person} 입금`
                              : `${record.person} 결제`}
                          </span>
                        )}
                      </div>

                      <p className="text-lg font-black text-rose-950">
                        {record.memo}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-4 md:justify-end">
                      <p
                        className={`text-2xl font-black ${
                          record.type === "deposit"
                            ? "text-emerald-600"
                            : "text-pink-600"
                        }`}
                      >
                        {record.type === "deposit" ? "+" : "-"}
                        {formatMoney(record.amount)} 불
                      </p>

                      <button
                        onClick={() => deleteRecord(record.id)}
                        className="rounded-full bg-white px-4 py-2 text-sm font-black text-rose-500 transition hover:bg-rose-100"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
