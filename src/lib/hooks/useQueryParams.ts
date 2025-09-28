"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams, usePathname } from "next/navigation";

interface UseQueryParamsConfig<T> {
  defaultValues: T;
}

export function useQueryParams<T extends Record<string, any>>(
  config?: UseQueryParamsConfig<T>
): {
  queryParams: T;
  setQueryParams: (newParams: Partial<T>) => void;
} {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Memoize the query params parsing to prevent infinite loops
  const queryParams = useMemo((): T => {
    if (!searchParams) return { ...config?.defaultValues } as T;
    const params = Object.fromEntries(searchParams.entries()) as Record<
      string,
      any
    >;
    return { ...config?.defaultValues, ...params } as T;
  }, [searchParams, config?.defaultValues]);

  // Memoize setQueryParams to prevent recreating the function
  const setQueryParams = useCallback(
    (newParams: Partial<T>) => {
      const updatedParams = new URLSearchParams(searchParams || undefined);
      Object.entries(newParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          updatedParams.set(key, String(value));
        } else {
          updatedParams.delete(key);
        }
      });

      window.history.pushState(
        null,
        "",
        `${pathname}?${updatedParams.toString()}`
      );
      // Don't call setQueryParamsState here - let the searchParams change trigger the update
    },
    [searchParams, pathname]
  );

  return {
    queryParams,
    setQueryParams,
  };
}
