import ApiError from "./ApiError.js";

/** Parses data against a Zod schema, throwing a 400 ApiError with field-level messages on failure. */
export const parseOrThrow = (schema, data) => {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => ({ field: e.path.join("."), message: e.message }));
    throw new ApiError(400, "Validation failed", errors);
  }
  return parsed.data;
};
