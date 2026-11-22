'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './providers/auth-provider';
import ProtectedRoute from './components/protected-route';
import { useRouter } from 'next/navigation';
import {
  getDailyDashboard,
  type DashboardSummary,
} from '@calorie-tracker/api-client';

const navItems = [
  { icon: '⌂', label: 'Dashboard' },
  { icon: '◷', label: 'Food Diary' },
  { icon: '▥', label: 'Reports' },
  { icon: '⚙', label: 'Settings' },
  { icon: '⎋', label: 'Logout' },
];

function formatDate(date?: string) {
  if (!date) return 'Today';

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`));
}

function formatTime(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date));
}

function getMealIcon(mealType: string) {
  switch (mealType.toLowerCase()) {
    case 'breakfast':
      return '☀️';
    case 'lunch':
      return '🥗';
    case 'dinner':
      return '🌙';
    case 'snack':
      return '🍎';
    default:
      return '🍽️';
  }
}

function formatMealName(mealType: string) {
  return mealType
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function Home() {
  const [activeNav, setActiveNav] = useState('Dashboard');

  const { user, logout } = useAuth();
  const router = useRouter();

  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');

  const calorieGoal = dashboard?.calories.target ?? 0;
  const caloriesConsumed = dashboard?.calories.consumed ?? 0;
  const remaining = dashboard?.calories.remaining ?? 0;

  const calorieProgress =
    calorieGoal > 0 ? Math.min((caloriesConsumed / calorieGoal) * 100, 100) : 0;

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        setDashboardLoading(true);
        setDashboardError('');

        const result = await getDailyDashboard();

        if (!cancelled) {
          setDashboard(result);
        }
      } catch (error) {
        if (!cancelled) {
          setDashboardError(
            error instanceof Error ? error.message : 'Unable to load dashboard',
          );
        }
      } finally {
        if (!cancelled) {
          setDashboardLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  const macroCards = dashboard
    ? [
        {
          name: 'Protein',
          consumed: dashboard.macros.protein.consumed,
          goal: dashboard.macros.protein.target,
          color: 'bg-emerald-400',
          text: 'text-emerald-400',
        },
        {
          name: 'Carbs',
          consumed: dashboard.macros.carbs.consumed,
          goal: dashboard.macros.carbs.target,
          color: 'bg-sky-400',
          text: 'text-sky-400',
        },
        {
          name: 'Fat',
          consumed: dashboard.macros.fat.consumed,
          goal: dashboard.macros.fat.target,
          color: 'bg-amber-400',
          text: 'text-amber-400',
        },
        {
          name: 'Fiber',
          consumed: dashboard.macros.fiber.consumed,
          // Fiber target is not currently returned by the backend.
          goal: 25,
          color: 'bg-green-400',
          text: 'text-green-400',
        },
      ]
    : [];

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#0b0f0e] text-gray-100">
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#101614] p-6 lg:flex lg:flex-col">
            <div className="mb-12 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-xl font-bold text-black">
                N
              </div>
              <div>
                <h1 className="text-lg font-bold">NutriTrack</h1>
                <p className="text-xs text-gray-500">Nutrition made simple</p>
              </div>
            </div>

            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-500">
              Menu
            </p>

            <nav className="space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    setActiveNav(item.label);
                    if (item.label === 'Logout') {
                      void handleLogout();
                    }
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${
                    activeNav === item.label
                      ? 'bg-emerald-500/10 font-semibold text-emerald-400'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="mt-auto rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-sm font-semibold text-emerald-400">
                Stay consistent!
              </p>
              <p className="mt-2 text-xs leading-5 text-gray-400">
                Small daily improvements lead to big results.
              </p>
            </div>
          </aside>

          {/* Main content */}
          <section className="min-w-0 flex-1 p-5 sm:p-8 lg:p-10">
            <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500">
                  {formatDate(dashboard?.date)}
                </p>
                <h2 className="mt-1 text-2xl font-bold sm:text-3xl">
                  Good evening! <span className="text-emerald-400">👋</span>
                </h2>
                <p className="mt-2 text-sm text-gray-400">
                  Here's your nutrition overview for today.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <button className="rounded-xl border border-white/10 bg-[#151c19] px-4 py-2.5 text-sm text-gray-300 hover:bg-white/10">
                  Today ▾
                </button>

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 font-semibold text-emerald-400">
                  {user?.name?.charAt(0).toUpperCase() ?? 'U'}
                </div>
              </div>
            </header>

            {/* Dashboard error */}
            {dashboardError && (
              <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
                {dashboardError}
              </div>
            )}

            {/* Calorie summary */}
            <div className="grid gap-5 xl:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[#141b18] p-6 xl:col-span-2">
                {dashboardLoading ? (
                  <p className="text-zinc-400">Loading nutrition...</p>
                ) : dashboard ? (
                  <>
                    <p className="text-4xl font-bold text-white">
                      {caloriesConsumed.toLocaleString()}
                    </p>

                    <p className="text-sm text-zinc-400">
                      of {calorieGoal.toLocaleString()} kcal
                    </p>

                    <p className="text-sm text-lime-400">
                      {remaining.toLocaleString()} kcal remaining
                    </p>
                  </>
                ) : (
                  <p className="text-zinc-400">Dashboard data unavailable.</p>
                )}

                <div className="mt-8">
                  <div className="mb-3 flex justify-between text-sm">
                    <span className="text-gray-400">Daily progress</span>
                    <span className="font-medium text-gray-200">
                      {Math.round(calorieProgress)}%
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-[#27312c]">
                    <div
                      className="h-full rounded-full bg-emerald-400 transition-all"
                      style={{ width: `${calorieProgress}%` }}
                    />
                  </div>

                  <div className="mt-4 flex justify-between text-sm">
                    <span className="text-gray-500">0 kcal</span>
                    <span className="text-gray-400">
                      Goal: {calorieGoal.toLocaleString()} kcal
                    </span>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
                  <div>
                    <p className="text-xs text-gray-500">Remaining</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-400">
                      {remaining.toLocaleString()} kcal
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Daily goal</p>
                    <p className="mt-1 text-2xl font-bold">
                      {calorieGoal.toLocaleString()} kcal
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-emerald-500/20 bg-linear-to-br from-emerald-500/15 to-[#141b18] p-6">
                <div>
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-xl">
                    🎯
                  </div>
                  <p className="text-sm text-gray-400">Your daily target</p>
                  <h3 className="mt-2 text-3xl font-bold">
                    {calorieGoal.toLocaleString()} kcal
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-gray-400">
                    Keep tracking your meals to stay aware of your daily
                    nutrition.
                  </p>
                </div>
                <button className="mt-8 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-bold text-[#07110c] transition hover:bg-emerald-300">
                  View nutrition goals →
                </button>
              </div>
            </div>

            {/* Macros */}
            <div className="mt-8">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold">Macronutrients</h3>
                <span className="text-xs text-gray-500">Daily breakdown</span>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {macroCards.map((macro) => {
                  const progress =
                    macro.goal > 0
                      ? Math.min((macro.consumed / macro.goal) * 100, 100)
                      : 0;

                  return (
                    <div
                      key={macro.name}
                      className="rounded-2xl border border-white/10 bg-[#141b18] p-5"
                    >
                      <p className="text-sm text-gray-400">{macro.name}</p>

                      <div className="mt-3 flex items-end justify-between">
                        <p className="text-2xl font-bold">
                          {macro.consumed}
                          <span className="ml-1 text-sm font-normal text-gray-500">
                            g
                          </span>
                        </p>
                        <p className="text-xs text-gray-500">
                          of {macro.goal}g
                        </p>
                      </div>

                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#27312c]">
                        <div
                          className={`h-full rounded-full ${macro.color}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      <p className={`mt-3 text-xs ${macro.text}`}>
                        {Math.round(progress)}% completed
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Meals */}
            <div className="mt-10">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold">Today's meals</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Your food intake throughout the day
                  </p>
                </div>

                <button
                  className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-bold text-[#07110c] transition hover:bg-emerald-300"
                  onClick={() => router.push('/add-food')}
                >
                  + Add food
                </button>
              </div>

              {dashboardLoading ? (
                <p className="rounded-xl border border-white/10 bg-[#141b18] p-5 text-sm text-gray-400">
                  Loading your meals...
                </p>
              ) : dashboardError ? (
                <p className="rounded-xl border border-white/10 bg-[#141b18] p-5 text-sm text-gray-400">
                  Unable to load meals.
                </p>
              ) : dashboard?.meals.length ? (
                <div className="space-y-3">
                  {dashboard.meals.map((meal) => {
                    const mealCalories = meal.items.reduce(
                      (total, item) => total + item.calories,
                      0,
                    );

                    const foodNames = meal.items
                      .map((item) => item.foodName)
                      .join(', ');

                    return (
                      <div
                        key={meal.id}
                        className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#141b18] p-4 sm:p-5"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#202a24] text-xl">
                          {getMealIcon(meal.mealType)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-semibold">
                              {formatMealName(meal.mealType)}
                            </h4>
                            <span className="text-xs text-gray-500">
                              {formatTime(meal.eatenAt)}
                            </span>
                          </div>

                          <p className="mt-1 truncate text-sm text-gray-400">
                            {foodNames || 'No food items'}
                          </p>
                        </div>

                        <p className="shrink-0 text-sm font-semibold">
                          {Math.round(mealCalories)}{' '}
                          <span className="text-xs font-normal text-gray-500">
                            kcal
                          </span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-[#141b18] p-8 text-center">
                  <p className="text-3xl">🍽️</p>
                  <p className="mt-3 font-medium text-gray-300">
                    No meals logged today
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Add your first meal to start tracking your nutrition.
                  </p>
                </div>
              )}
            </div>

            <footer className="mt-12 border-t border-white/10 pt-5 text-center text-xs text-gray-600">
              NutriTrack · Your personal nutrition companion
            </footer>
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}
