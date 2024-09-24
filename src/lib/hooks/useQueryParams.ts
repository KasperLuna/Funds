"use client";

import { useState, useEffect } from "react";
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

  const getQueryParams = (): T => {
    const params = Object.fromEntries(searchParams.entries()) as Record<
      string,
      any
    >;
    return { ...config?.defaultValues, ...params } as T;
  };

  const [queryParams, setQueryParamsState] = useState<T>(getQueryParams);

  useEffect(() => {
    setQueryParamsState(getQueryParams());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const setQueryParams = (newParams: Partial<T>) => {
    const updatedParams = new URLSearchParams(searchParams);
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

    setQueryParamsState(getQueryParams());
  };

  return {
    queryParams,
    setQueryParams,
  };
}
