import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { errorMessage } from "../services/api";

type AsyncResource<T> = {
  data: T | undefined;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

/**
 * Carga datos de la API cada vez que la pantalla gana foco, así las listas
 * quedan al día al volver de otra pantalla.
 */
export function useAsyncResource<T>(
  load: () => Promise<T>,
  deps: unknown[] = [],
): AsyncResource<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps);

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await run();
      if (id === requestId.current) setData(result);
    } catch (err) {
      if (id === requestId.current) {
        setError(errorMessage(err, "No se pudieron cargar los datos."));
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [run]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return { data, loading, error, reload };
}
