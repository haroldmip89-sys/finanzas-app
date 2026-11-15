"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback } from "react";
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type Path,
  type Resolver,
} from "react-hook-form";
import type { z } from "zod";

import type { FieldErrors } from "@/lib/errors";

type ServerError = { message: string; fieldErrors?: FieldErrors };

/**
 * react-hook-form wired to a Zod schema, plus a helper that maps an error
 * coming from a server action to field errors and a general `submitError`.
 */
export function useZodForm<S extends z.ZodType<FieldValues, FieldValues>>(
  schema: S,
  defaultValues: DefaultValues<z.input<S>>,
) {
  const form = useForm<z.input<S>, unknown, z.output<S>>({
    // The generic schema type cannot be inferred by the resolver; cast once here.
    resolver: zodResolver(schema) as unknown as Resolver<
      z.input<S>,
      unknown,
      z.output<S>
    >,
    defaultValues,
  });
  const { setError, clearErrors } = form;

  const applyServerError = useCallback(
    (error: ServerError) => {
      clearErrors();
      let matched = false;
      for (const [field, message] of Object.entries(error.fieldErrors ?? {})) {
        if (field in (form.getValues() as object)) {
          setError(field as Path<z.input<S>>, { type: "server", message });
          matched = true;
        }
      }
      // Only show a general message when no field absorbed the error.
      if (!matched) {
        setError("root.server", { type: "server", message: error.message });
      }
    },
    [clearErrors, form, setError],
  );

  return {
    form,
    applyServerError,
    submitError: form.formState.errors.root?.server?.message,
  };
}
