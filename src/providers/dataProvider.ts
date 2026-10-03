import { DataProvider, BaseRecord } from "@refinedev/core";
import { dataProvider as refineSupabaseDataProvider } from "@refinedev/supabase";
import { supabaseClient } from "../lib/supabaseClient";
import { devLog } from "../lib/devLogger";

function getStorage<T>(key: string, defaultVal: T): T {
  try {
    const item = localStorage.getItem(`powerforecast_${key}`);
    return item ? JSON.parse(item) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setStorage<T>(key: string, val: T): void {
  try {
    localStorage.setItem(`powerforecast_${key}`, JSON.stringify(val));
  } catch (e) {
    console.error(e);
  }
}

// Clean slate: ensure no stale mock data is seeded
if (typeof window !== "undefined" && !localStorage.getItem("powerforecast_clean_slate_v1")) {
  localStorage.removeItem("powerforecast_user_appliances");
  localStorage.removeItem("powerforecast_user_calendar_events");
  localStorage.removeItem("powerforecast_appliance_usage_logs");
  localStorage.removeItem("powerforecast_accounts");
  localStorage.setItem("powerforecast_clean_slate_v1", "true");
  setStorage("user_appliances", []);
  setStorage("user_calendar_events", []);
  setStorage("appliance_usage_logs", []);
  setStorage("accounts", []);
}

export const localDataProvider: DataProvider = {
  getList: async <TData extends BaseRecord = BaseRecord>({ resource, pagination, filters, sorters }: any): Promise<any> => {
    let data = getStorage<any[]>(resource, []);

    if (filters) {
      filters.forEach((f: any) => {
        if (f.field && f.value !== undefined && f.value !== "all") {
          data = data.filter((item) => {
            const itemVal = String(item[f.field] || "").toLowerCase();
            const filterVal = String(f.value).toLowerCase();
            return itemVal.includes(filterVal);
          });
        }
      });
    }

    if (sorters && sorters.length > 0) {
      const sorter = sorters[0];
      data.sort((a, b) => {
        if (sorter.order === "asc") {
          return a[sorter.field] > b[sorter.field] ? 1 : -1;
        }
        return a[sorter.field] < b[sorter.field] ? 1 : -1;
      });
    }

    const current = pagination?.current || 1;
    const pageSize = pagination?.pageSize || 100;
    const start = (current - 1) * pageSize;
    const paginated = data.slice(start, start + pageSize);

    return {
      data: paginated as unknown as TData[],
      total: data.length,
    };
  },

  getOne: async <TData extends BaseRecord = BaseRecord>({ resource, id }: any): Promise<any> => {
    const data = getStorage<any[]>(resource, []);
    const item = data.find((x) => String(x.id) === String(id));
    if (!item) throw new Error(`Resource ${resource} with id ${id} not found`);
    return { data: item as unknown as TData };
  },

  create: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({ resource, variables }: any): Promise<any> => {
    const data = getStorage<any[]>(resource, []);
    const newItem: any = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...(variables as object),
    };
    data.unshift(newItem);
    setStorage(resource, data);
    return { data: newItem as unknown as TData };
  },

  update: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({ resource, id, variables }: any): Promise<any> => {
    const data = getStorage<any[]>(resource, []);
    const index = data.findIndex((x) => String(x.id) === String(id));
    if (index === -1) throw new Error(`Resource ${resource} with id ${id} not found`);

    data[index] = {
      ...data[index],
      ...(variables as object),
      updated_at: new Date().toISOString(),
    };
    setStorage(resource, data);
    return { data: data[index] as unknown as TData };
  },

  deleteOne: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({ resource, id }: any): Promise<any> => {
    let data = getStorage<any[]>(resource, []);
    const target = data.find((x) => String(x.id) === String(id));
    data = data.filter((x) => String(x.id) !== String(id));
    setStorage(resource, data);
    return { data: target as unknown as TData };
  },

  getApiUrl: () => "",
};

const rawSupabaseDataProvider = refineSupabaseDataProvider(supabaseClient);

/**
 * Resilient Hybrid DataProvider:
 * - Attempts Supabase Cloud database first
 * - Injects authenticated user_id automatically on creations
 * - Mirrors live fetched records to localStorage for instant hydration & offline fallback
 */
export const resilientDataProvider: DataProvider = {
  getList: async <TData extends BaseRecord = BaseRecord>(params: any): Promise<any> => {
    const useLocalMock = import.meta.env.VITE_USE_LOCAL_MOCK === "true";
    if (useLocalMock) {
      return localDataProvider.getList<TData>(params);
    }
    try {
      // Default pagination to mode: "off" if not specified so appliances, spaces, and logs are NEVER capped at 10 items
      const enrichedParams = { ...params };
      if (
        !enrichedParams.pagination ||
        (!enrichedParams.pagination.current && !enrichedParams.pagination.pageSize && enrichedParams.pagination.mode !== "client")
      ) {
        enrichedParams.pagination = { ...enrichedParams.pagination, mode: "off" };
      }

      const res = await rawSupabaseDataProvider.getList<TData>(enrichedParams);
      devLog.api("Supabase DataProvider", `Fetched ${res?.data?.length || 0} records from [${params.resource}]`, res);
      
      // Mirror to local cache
      if (res?.data && Array.isArray(res.data)) {
        setStorage(params.resource, res.data);
      }
      return res;
    } catch (err: any) {
      devLog.warn("Supabase DataProvider", `getList failed on remote [${params.resource}]: ${err.message}. Falling back to local storage.`);
      return localDataProvider.getList<TData>(params);
    }
  },

  getOne: async <TData extends BaseRecord = BaseRecord>(params: any): Promise<any> => {
    const useLocalMock = import.meta.env.VITE_USE_LOCAL_MOCK === "true";
    if (useLocalMock) {
      return localDataProvider.getOne<TData>(params);
    }
    try {
      const res = await rawSupabaseDataProvider.getOne<TData>(params);
      return res;
    } catch (err: any) {
      devLog.warn("Supabase DataProvider", `getOne fallback for [${params.resource}/${params.id}]: ${err.message}`);
      return localDataProvider.getOne<TData>(params);
    }
  },

  create: async <TData extends BaseRecord = BaseRecord, TVariables = {}>(params: any): Promise<any> => {
    const useLocalMock = import.meta.env.VITE_USE_LOCAL_MOCK === "true";
    if (useLocalMock) {
      return localDataProvider.create<TData, TVariables>(params);
    }
    try {
      // Auto-inject authenticated user_id (or Household Owner user_id if Family Member)
      const sessionUser = (await supabaseClient.auth.getSession()).data.session?.user;
      let effectiveUserId = sessionUser?.id;
      if (effectiveUserId) {
        try {
          const linkedRaw = localStorage.getItem(`powerforecast_household_linked_owner_${effectiveUserId}`);
          if (linkedRaw) {
            const linked = JSON.parse(linkedRaw);
            if (linked?.owner_id) {
              effectiveUserId = linked.owner_id;
            }
          }
        } catch {}
      }

      let enrichedVariables = { ...(params.variables as any) };
      if (effectiveUserId && !enrichedVariables.user_id) {
        enrichedVariables.user_id = effectiveUserId;
      }

      let res: any;
      let attempts = 0;
      while (attempts < 5) {
        try {
          res = await rawSupabaseDataProvider.create<TData, TVariables>({
            ...params,
            variables: enrichedVariables,
          });
          break;
        } catch (innerErr: any) {
          attempts++;
          const colMatch =
            innerErr?.message?.match(/Could not find the '([^']+)' column/i) ||
            innerErr?.message?.match(/column [^.]*\.?([a-zA-Z0-9_]+) does not exist/i) ||
            innerErr?.message?.match(/column "([^"]+)" of relation/i);
          if (colMatch && colMatch[1] && colMatch[1] in enrichedVariables) {
            const badCol = colMatch[1];
            devLog.warn(
              "Supabase DataProvider",
              `Self-healing: stripped unmigrated column '${badCol}' from [${params.resource}] and preserved in ai_metadata (attempt ${attempts})`
            );
            if (params.resource === "user_appliances") {
              enrichedVariables.ai_metadata = {
                ...(enrichedVariables.ai_metadata || {}),
                [badCol]: enrichedVariables[badCol],
              };
            }
            delete enrichedVariables[badCol];
          } else {
            throw innerErr;
          }
        }
      }

      devLog.api("Supabase DataProvider", `Created record in [${params.resource}]`, res);
      return res;
    } catch (err: any) {
      devLog.warn("Supabase DataProvider", `create fallback for [${params.resource}]: ${err.message}`);
      return localDataProvider.create<TData, TVariables>(params);
    }
  },

  update: async <TData extends BaseRecord = BaseRecord, TVariables = {}>(params: any): Promise<any> => {
    const useLocalMock = import.meta.env.VITE_USE_LOCAL_MOCK === "true";
    if (useLocalMock) {
      return localDataProvider.update<TData, TVariables>(params);
    }
    try {
      let enrichedVariables = { ...(params.variables as any) };
      let res: any;
      let attempts = 0;
      while (attempts < 5) {
        try {
          res = await rawSupabaseDataProvider.update<TData, TVariables>({
            ...params,
            variables: enrichedVariables,
          });
          break;
        } catch (innerErr: any) {
          attempts++;
          const colMatch =
            innerErr?.message?.match(/Could not find the '([^']+)' column/i) ||
            innerErr?.message?.match(/column [^.]*\.?([a-zA-Z0-9_]+) does not exist/i) ||
            innerErr?.message?.match(/column "([^"]+)" of relation/i);
          if (colMatch && colMatch[1] && colMatch[1] in enrichedVariables) {
            const badCol = colMatch[1];
            devLog.warn(
              "Supabase DataProvider",
              `Self-healing: stripped unmigrated column '${badCol}' on update [${params.resource}] (attempt ${attempts})`
            );
            if (params.resource === "user_appliances") {
              enrichedVariables.ai_metadata = {
                ...(enrichedVariables.ai_metadata || {}),
                [badCol]: enrichedVariables[badCol],
              };
            }
            delete enrichedVariables[badCol];
          } else {
            throw innerErr;
          }
        }
      }

      devLog.api("Supabase DataProvider", `Updated record in [${params.resource}]`, res);
      return res;
    } catch (err: any) {
      devLog.warn("Supabase DataProvider", `update fallback for [${params.resource}]: ${err.message}`);
      return localDataProvider.update<TData, TVariables>(params);
    }
  },

  deleteOne: async <TData extends BaseRecord = BaseRecord, TVariables = {}>(params: any): Promise<any> => {
    const useLocalMock = import.meta.env.VITE_USE_LOCAL_MOCK === "true";
    if (useLocalMock) {
      return localDataProvider.deleteOne<TData, TVariables>(params);
    }
    try {
      const res = await rawSupabaseDataProvider.deleteOne<TData, TVariables>(params);
      devLog.api("Supabase DataProvider", `Deleted record from [${params.resource}]`, res);
      return res;
    } catch (err: any) {
      devLog.warn("Supabase DataProvider", `deleteOne fallback for [${params.resource}]: ${err.message}`);
      return localDataProvider.deleteOne<TData, TVariables>(params);
    }
  },

  getApiUrl: () => rawSupabaseDataProvider.getApiUrl?.() || "",
};
