const DEFAULT_BASE_URL = 'http://localhost:4000/api/v1';

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;
let baseUrl = DEFAULT_BASE_URL;

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: {
    message?: string;
    code?: string;
  };
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  [key: string]: unknown;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface DashboardSummary {
  date: string;

  calories: {
    target: number;
    consumed: number;
    remaining: number;
  };

  macros: {
    protein: { target: number; consumed: number };
    carbs: { target: number; consumed: number };
    fat: { target: number; consumed: number };
    fiber: { consumed: number };
  };

  exercise: {
    caloriesBurned: number;
  };

  netCalories: number;

  meals: Array<{
    id: string;
    mealType: string;
    eatenAt: string;
    items: Array<{
      id: string;
      foodName: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      weightGrams: number;
    }>;
  }>;

  exercises: Array<{
    id: string;
    caloriesBurned: number;
    performedAt: string;
  }>;
}

export function configureApiClient(url: string) {
  baseUrl = url.replace(/\/+$/, '');
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        accessToken = null;
        return null;
      }

      const result = (await response.json()) as ApiResponse<{
        accessToken: string;
      }>;

      const newToken = result?.data?.accessToken;

      if (typeof newToken !== 'string') {
        accessToken = null;
        return null;
      }

      accessToken = newToken;
      return newToken;
    } catch {
      accessToken = null;
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && retry && path !== '/auth/refresh') {
    const newToken = await refreshAccessToken();

    if (newToken) {
      return request<T>(path, options, false);
    }

    accessToken = null;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const result = (await response
    .json()
    .catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok) {
    throw new ApiError(
      result?.error?.message ?? 'Something went wrong',
      response.status,
      result?.error?.code,
    );
  }

  if (result?.success === false) {
    throw new ApiError(
      result.error?.message ?? 'Request failed',
      response.status,
      result.error?.code,
    );
  }

  return (result?.data ?? result) as T;
}

export const apiClient = {
  get<T>(path: string) {
    return request<T>(path, { method: 'GET' });
  },

  post<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },

  patch<T>(path: string, body: unknown) {
    return request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  delete<T>(path: string) {
    return request<T>(path, { method: 'DELETE' });
  },
};

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

export async function login(email: string, password: string) {
  const result = await apiClient.post<AuthResponse>('/auth/login', {
    email,
    password,
  });

  setAccessToken(result.accessToken);

  return result.user;
}

export async function register(name: string, email: string, password: string) {
  const result = await apiClient.post<AuthResponse>('/auth/register', {
    name,
    email,
    password,
  });

  setAccessToken(result.accessToken);

  return result.user;
}

export async function logout() {
  try {
    await apiClient.post<void>('/auth/logout');
  } finally {
    setAccessToken(null);
  }
}

export async function restoreSession() {
  return refreshAccessToken();
}

export async function getProfile() {
  return apiClient.get<UserProfile>('/profile');
}

export async function getDailyDashboard(date?: string) {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';

  return apiClient.get<DashboardSummary>(`/dashboard/daily${query}`);
}

export interface ParsedFoodItem {
  name: string;
  quantity: number;
  unit: 'g' | 'kg' | 'oz' | 'lb' | 'piece' | 'serving' | 'bowl' | 'cup';
}

export interface NutritionParseResponse {
  items: ParsedFoodItem[];
}

export interface ResolvedFoodItem {
  name: string;
  quantity?: number;
  unit?: ParsedFoodItem['unit'];
  resolved: boolean;
  reason?: string;
  weightGrams?: number;
  estimated?: boolean;
  assumption?: string | null;
  source?: string;
  requiresReview?: boolean;
  warning?: string;
  confidence?: number | null;
  food?: {
    id: string;
    name: string;
  };
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number | null;
  };
}

export interface NutritionResolveResponse {
  items: ResolvedFoodItem[];
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type FoodUnit =
  | 'g'
  | 'kg'
  | 'oz'
  | 'lb'
  | 'piece'
  | 'serving'
  | 'bowl'
  | 'cup';

export interface ParsedFoodItem {
  name: string;
  quantity: number;
  unit: FoodUnit;
}

export interface NutritionParseResponse {
  items: ParsedFoodItem[];
}

export interface ResolvedFoodItem {
  name: string;
  resolved: boolean;
  reason?: string;
  quantity?: number;
  unit?: FoodUnit;
  weightGrams?: number;
  estimated?: boolean;
  assumption?: string | null;
  source?: string;
  requiresReview?: boolean;
  warning?: string;
  confidence?: number | null;
  food?: {
    id: string;
    name: string;
  };
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number | null;
  };
}

export interface NutritionResolveResponse {
  items: ResolvedFoodItem[];
}

export interface SaveNutritionMealItem {
  foodId: string;
  quantity: number;
  unit: FoodUnit;
  weightGrams: number;
  assumptions?: string;
}

export interface SaveNutritionSnapshotItem {
  foodName: string;
  quantity: number;
  unit: FoodUnit;
  weightGrams: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g?: number;
  confidence: number;
  assumptions?: string;
  confirmedByUser: true;
}

export interface SaveNutritionMealRequest {
  mealType: MealType;
  eatenAt?: string;
  notes?: string;
  items: Array<SaveNutritionMealItem | SaveNutritionSnapshotItem>;
}

export async function parseFoodText(text: string) {
  return apiClient.post<NutritionParseResponse>('/nutrition/parse', { text });
}

export async function resolveNutritionItems(items: ParsedFoodItem[]) {
  return apiClient.post<NutritionResolveResponse>('/nutrition/resolve', {
    items,
  });
}

export async function saveNutritionMeal(data: SaveNutritionMealRequest) {
  return apiClient.post('/meals/from-nutrition', data);
}
