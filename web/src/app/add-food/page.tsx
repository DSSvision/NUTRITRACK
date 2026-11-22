'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  parseFoodText,
  resolveNutritionItems,
  saveNutritionMeal,
  type ParsedFoodItem,
  type ResolvedFoodItem,
  type MealType,
  type SaveNutritionMealRequest,
} from '@calorie-tracker/api-client';
import { ProtectedRoute } from '../components';

const mealOptions: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

function getDefaultMeal(): MealType {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 18) return 'snack';

  return 'dinner';
}

function AddFoodContent() {
  const router = useRouter();

  const [description, setDescription] = useState('');
  const [mealType, setMealType] = useState<MealType>(getDefaultMeal());
  const [parsedItems, setParsedItems] = useState<ParsedFoodItem[]>([]);
  const [resolvedItems, setResolvedItems] = useState<ResolvedFoodItem[]>([]);
  const [confirmedItems, setConfirmedItems] = useState<boolean[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'input' | 'review'>('input');

  const totalCalories = resolvedItems.reduce(
    (sum, item) => sum + (item.nutrition?.calories ?? 0),
    0,
  );

  async function handleAnalyze() {
    if (!description.trim()) {
      setError('Please describe what you ate.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const parsed = await parseFoodText(description.trim());

      if (!parsed.items?.length) {
        throw new Error('No food items were identified.');
      }

      const resolved = await resolveNutritionItems(parsed.items);

      setParsedItems(parsed.items);
      setResolvedItems(resolved.items);
      setConfirmedItems(
        resolved.items.map((item) => item.resolved && !item.requiresReview),
      );

      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to analyze food.');
    } finally {
      setLoading(false);
    }
  }

  function updateQuantity(index: number, quantity: number) {
    setResolvedItems((current) =>
      current.map((item, i) => {
        if (i !== index) return item;

        if (
          !Number.isFinite(quantity) ||
          quantity <= 0 ||
          !item.weightGrams ||
          !item.nutrition
        ) {
          return { ...item, quantity };
        }

        const ratio = quantity / item.quantity;
        const newWeightGrams = item.weightGrams * ratio;

        return {
          ...item,
          quantity,
          weightGrams: newWeightGrams,
          nutrition: {
            calories: item.nutrition.calories * ratio,
            protein: item.nutrition.protein * ratio,
            carbs: item.nutrition.carbs * ratio,
            fat: item.nutrition.fat * ratio,
            fiber:
              item.nutrition.fiber !== null
                ? item.nutrition.fiber * ratio
                : null,
          },
        };
      }),
    );
  }

  function updateConfirmation(index: number, checked: boolean) {
    setConfirmedItems((current) =>
      current.map((value, i) => (i === index ? checked : value)),
    );
  }

  async function handleSave() {
    setError('');

    const unresolved = resolvedItems.some((item) => !item.resolved);
    if (unresolved) {
      setError('Please remove or resolve all unidentified foods.');
      return;
    }

    const missingConfirmation = resolvedItems.some(
      (item, index) => item.requiresReview && !confirmedItems[index],
    );

    if (missingConfirmation) {
      setError('Please confirm every AI nutrition estimate before saving.');
      return;
    }

    setSaving(true);

    try {
      const items: SaveNutritionMealRequest['items'] = [];

      resolvedItems.forEach((item) => {
        if (
          !item.resolved ||
          !item.quantity ||
          !item.unit ||
          !item.weightGrams ||
          !item.nutrition
        ) {
          return;
        }

        const isSnapshot = !item.food?.id;

        if (isSnapshot) {
          if (item.confidence === undefined) {
            throw new Error(`Missing confidence score for ${item.name}.`);
          }

          items.push({
            foodName: item.name,
            quantity: item.quantity,
            unit: item.unit,
            weightGrams: item.weightGrams,
            caloriesPer100g: (item.nutrition.calories / item.weightGrams) * 100,
            proteinPer100g: (item.nutrition.protein / item.weightGrams) * 100,
            carbsPer100g: (item.nutrition.carbs / item.weightGrams) * 100,
            fatPer100g: (item.nutrition.fat / item.weightGrams) * 100,
            ...(item.nutrition.fiber !== null
              ? {
                  fiberPer100g: (item.nutrition.fiber / item.weightGrams) * 100,
                }
              : {}),
            confidence: item.confidence,
            assumptions: item.assumption,
            confirmedByUser: true,
          });
        } else {
          items.push({
            foodId: item.food!.id,
            quantity: item.quantity,
            unit: item.unit,
            weightGrams: item.weightGrams,
            assumptions: item.assumption,
          });
        }
      });

      if (items.length !== resolvedItems.length) {
        throw new Error('Some food items are missing required nutrition data.');
      }

      await saveNutritionMeal({
        mealType,
        eatenAt: new Date().toISOString(),
        items,
      });

      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save meal.');
    } finally {
      setSaving(false);
    }
  }

  async function handleEditFood(index: number, name: string) {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Food name cannot be empty.');
      return;
    }

    const currentItem = resolvedItems[index];

    if (!currentItem) return;

    setLoading(true);
    setError('');

    try {
      const result = await resolveNutritionItems([
        {
          name: trimmedName,
          quantity: currentItem.quantity,
          unit: currentItem.unit,
        },
      ]);

      const updatedItem = result.items[0];

      if (!updatedItem?.resolved) {
        throw new Error(
          updatedItem?.reason ?? 'Could not resolve the edited food.',
        );
      }

      setResolvedItems((current) =>
        current.map((item, i) => (i === index ? updatedItem : item)),
      );

      setConfirmedItems((current) =>
        current.map((value, i) =>
          i === index ? !updatedItem.requiresReview : value,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to update food nutrition.',
      );
    } finally {
      setLoading(false);
    }
  }

  function handleRemoveFood(index: number) {
    setResolvedItems((current) => current.filter((_, i) => i !== index));
    setConfirmedItems((current) => current.filter((_, i) => i !== index));
  }

  return (
    <main className="min-h-screen bg-[#080d0b] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-3xl">
        <button
          onClick={() => router.push('/')}
          className="mb-8 text-sm text-gray-400 hover:text-white cursor-pointer"
        >
          ← Back to dashboard
        </button>

        <div className="mb-8">
          <p className="mb-2 text-sm font-medium text-emerald-400">
            NUTRITRACK / FOOD DIARY
          </p>
          <h1 className="text-3xl font-bold">Add food</h1>
          <p className="mt-2 text-gray-400">
            Describe what you ate. AI will estimate its nutrition.
          </p>
        </div>

        <section className="mb-6 rounded-2xl border border-white/10 bg-[#111a15] p-5">
          <label className="mb-3 block text-sm font-medium">
            Which meal is this for?
          </label>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {mealOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setMealType(option.value)}
                className={`rounded-xl border px-3 py-3 text-sm transition cursor-pointer ${
                  mealType === option.value
                    ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400'
                    : 'border-white/10 bg-[#18221b] text-gray-300 hover:border-white/30'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        {step === 'input' && (
          <section className="rounded-2xl border border-white/10 bg-[#111a15] p-5">
            <label className="mb-3 block text-sm font-medium">
              What did you eat?
            </label>

            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Example: 2 chicken puffs and 1 cup of coffee..."
              rows={5}
              className="w-full resize-none rounded-xl border border-white/10 bg-[#080d0b] p-4 text-sm text-white outline-none placeholder:text-gray-600 focus:border-emerald-400"
            />

            <p className="mt-2 text-xs text-gray-500">
              Include quantities where possible for better estimates.
            </p>

            <button
              onClick={handleAnalyze}
              disabled={loading || !description.trim()}
              className="mt-5 w-full rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Analyzing your food...' : 'Analyze food →'}
            </button>
          </section>
        )}

        {step === 'review' && (
          <>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Review your food</h2>
                <p className="mt-1 text-sm text-gray-400">
                  Check the nutrition before saving.
                </p>
              </div>

              <button
                onClick={() => setStep('input')}
                className="text-sm text-emerald-400 hover:text-emerald-300 cursor-pointer cursor-pointer"
              >
                Edit description
              </button>
            </div>

            <div className="mb-5 rounded-2xl border border-white/10 bg-[#111a15] p-5">
              <p className="text-sm text-gray-400">Total calories</p>
              <p className="mt-1 text-3xl font-bold text-emerald-400">
                {Math.round(totalCalories)} kcal
              </p>
            </div>

            <div className="space-y-4">
              {resolvedItems.map((item, index) => (
                <article
                  key={`${item.name}-${index}`}
                  className="rounded-2xl border border-white/10 bg-[#111a15] p-5"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <input
                        key={`${item.name}-${index}`}
                        defaultValue={item.name}
                        //value={item.name}
                        // onChange={(event) =>
                        //   handleEditFood(index, event.target.value)
                        // }
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            void handleEditFood(
                              index,
                              event.currentTarget.value,
                            );
                            event.currentTarget.blur();
                          }
                        }}
                        className="w-full border-b border-white/10 bg-transparent pl-2 pb-2 text-lg font-semibold outline-none focus:border-emerald-400 focus:bg-[#080d0b] rounded-lg"
                        aria-label="Food name"
                      />
                      <p className="mt-2 text-xs text-gray-500">
                        {item.source ?? 'Unknown source'}
                        {item.confidence !== undefined
                          ? ` · ${Math.round(item.confidence * 100)}% confidence`
                          : ''}
                      </p>
                    </div>

                    <button
                      onClick={() => handleRemoveFood(index)}
                      className="text-sm text-red-400 cursor-pointer hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>

                  {!item.resolved ? (
                    <p className="rounded-lg bg-red-400/10 p-3 text-sm text-red-300">
                      {item.reason ?? 'Nutrition could not be resolved.'}
                    </p>
                  ) : (
                    <>
                      <div className="mb-4 grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-xs text-gray-400">
                            Quantity
                          </label>
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={item.quantity ?? ''}
                            onChange={(event) =>
                              updateQuantity(index, Number(event.target.value))
                            }
                            className="w-full rounded-lg border border-white/10 bg-[#080d0b] p-3 text-sm outline-none focus:border-emerald-400"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs text-gray-400">
                            Unit
                          </label>
                          <div className="rounded-lg border border-white/10 bg-[#080d0b] p-3 text-sm">
                            {item.unit}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-center">
                        {[
                          ['Calories', item.nutrition?.calories, 'kcal'],
                          ['Protein', item.nutrition?.protein, 'g'],
                          ['Carbs', item.nutrition?.carbs, 'g'],
                          ['Fat', item.nutrition?.fat, 'g'],
                        ].map(([label, value, unit]) => (
                          <div
                            key={String(label)}
                            className="rounded-lg bg-[#080d0b] p-2"
                          >
                            <p className="text-xs text-gray-500">{label}</p>
                            <p className="mt-1 font-semibold">
                              {Number(value ?? 0).toFixed(1)}
                            </p>
                            <p className="text-xs text-gray-500">{unit}</p>
                          </div>
                        ))}
                      </div>

                      {item.assumption && (
                        <p className="mt-4 text-xs text-gray-400">
                          Assumption: {item.assumption}
                        </p>
                      )}

                      {item.requiresReview && (
                        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3">
                          <input
                            type="checkbox"
                            checked={confirmedItems[index] ?? false}
                            onChange={(event) =>
                              updateConfirmation(index, event.target.checked)
                            }
                            className="mt-1 accent-emerald-400 cursor-pointer"
                          />
                          <span className="text-sm text-amber-200">
                            I have reviewed and accept this AI nutrition
                            estimate.
                          </span>
                        </label>
                      )}
                    </>
                  )}
                </article>
              ))}
            </div>

            <button
              onClick={handleSave}
              disabled={
                saving ||
                resolvedItems.length === 0 ||
                resolvedItems.some(
                  (item, index) =>
                    !item.resolved ||
                    (item.requiresReview && !confirmedItems[index]),
                )
              }
              className="mt-6 w-full rounded-xl bg-emerald-400 px-5 py-4 font-semibold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Saving meal...' : 'Confirm and save meal'}
            </button>
          </>
        )}

        {error && (
          <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}

export default function AddFoodPage() {
  return (
    <ProtectedRoute>
      <AddFoodContent />
    </ProtectedRoute>
  );
}
