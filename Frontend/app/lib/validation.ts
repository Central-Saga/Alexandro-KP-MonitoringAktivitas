export type LaravelFieldErrors = Record<string, string[]>;

export type LaravelErrorResponse = {
  message?: string;
  errors?: LaravelFieldErrors;
};

export function parseLaravelError(data: unknown): LaravelErrorResponse {
  if (!data || typeof data !== "object") return {};

  const source = data as Record<string, unknown>;
  const errors: LaravelFieldErrors = {};

  if (source.errors && typeof source.errors === "object") {
    Object.entries(source.errors as Record<string, unknown>).forEach(
      ([field, messages]) => {
        if (Array.isArray(messages)) {
          const strings = messages.filter(
            (message): message is string => typeof message === "string",
          );
          if (strings.length) errors[field] = strings;
        }
      },
    );
  }

  return {
    message: typeof source.message === "string" ? source.message : undefined,
    errors,
  };
}

export function firstFieldError(
  errors: LaravelFieldErrors | undefined,
  field: string,
): string {
  return errors?.[field]?.[0] ?? "";
}
