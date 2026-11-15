import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { useZodForm } from "./use-zod-form";

const schema = z.object({
  name: z.string().trim().min(1, "Obligatorio"),
});

describe("useZodForm", () => {
  it("validates with the schema and reports field errors", async () => {
    const { result } = renderHook(() => useZodForm(schema, { name: "" }));
    const onValid = vi.fn();

    await act(async () => {
      await result.current.form.handleSubmit(onValid)();
    });

    expect(onValid).not.toHaveBeenCalled();
    expect(result.current.form.formState.errors.name?.message).toBe("Obligatorio");
  });

  it("submits parsed values when valid", async () => {
    const { result } = renderHook(() => useZodForm(schema, { name: "  Ana  " }));
    const onValid = vi.fn();

    await act(async () => {
      await result.current.form.handleSubmit(onValid)();
    });

    expect(onValid).toHaveBeenCalledWith({ name: "Ana" }, undefined);
  });

  it("maps server field errors to the matching field", async () => {
    const { result } = renderHook(() => useZodForm(schema, { name: "x" }));

    act(() =>
      result.current.applyServerError({
        message: "Revisa los datos",
        fieldErrors: { name: "Ya existe" },
      }),
    );

    await waitFor(() =>
      expect(result.current.form.formState.errors.name?.message).toBe("Ya existe"),
    );
    expect(result.current.submitError).toBeUndefined();
  });

  it("shows a general error when no field matches", async () => {
    const { result } = renderHook(() => useZodForm(schema, { name: "x" }));

    act(() => result.current.applyServerError({ message: "Algo falló" }));

    await waitFor(() => expect(result.current.submitError).toBe("Algo falló"));
  });
});
