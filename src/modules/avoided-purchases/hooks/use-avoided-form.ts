"use client";

import { toast } from "sonner";

import type { SelectOption } from "@/components/shared/entity-select";
import { useZodForm } from "@/hooks/use-zod-form";
import { ActionFailure, errorMessage } from "@/lib/action-result";
import { todayInLima } from "@/lib/dates";
import { centsToPen, formatPen, penToCents } from "@/lib/money";
import { useCategories } from "@/modules/categories/hooks/use-categories";

import { AVOIDED_REASON_OPTIONS } from "../constants/avoided-reasons";
import {
  avoidedFormSchema,
  toAvoidedInput,
  type AvoidedFormValues,
} from "../schemas/avoided.schema";
import type { AvoidedItem } from "../types/avoided.types";
import { useSaveAvoided } from "./use-avoided-mutations";

/** Select value for "nothing chosen": the optional fields store "" in the form. */
export const NONE = "none";

type Options = {
  /** Purchase being edited; without it a new one is created. */
  item?: AvoidedItem;
  onSuccess: () => void;
};

function defaultsFor(item?: AvoidedItem): AvoidedFormValues {
  return {
    amount: item ? centsToPen(item.amountCents) : "",
    date: item?.date ?? todayInLima(),
    categoryId: item?.categoryId ?? "",
    reason: item?.reason ?? "",
    note: item?.note ?? "",
    status: item?.status ?? "avoided",
  };
}

export function useAvoidedForm({ item, onSuccess }: Options) {
  const save = useSaveAvoided();
  const categoriesQuery = useCategories(false);
  const { form, applyServerError, submitError } = useZodForm(avoidedFormSchema, defaultsFor(item));

  // Active expense categories, plus the one already used when editing (it may be archived).
  const categoryOptions: SelectOption[] = [
    { id: NONE, name: "Sin categoría" },
    ...(categoriesQuery.data ?? [])
      .filter((c) => c.kind === "expense" && !c.systemKey)
      .map((c) => ({ id: c.id, name: c.name })),
  ];
  if (item?.categoryId && !categoryOptions.some((c) => c.id === item.categoryId)) {
    categoryOptions.push({ id: item.categoryId, name: item.categoryName ?? "Categoría" });
  }

  const reasonOptions: SelectOption[] = [
    { id: NONE, name: "Sin motivo" },
    ...AVOIDED_REASON_OPTIONS.map((o) => ({ id: o.value, name: o.label })),
  ];

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await save.mutateAsync({ id: item?.id, input: toAvoidedInput(values) });
    } catch (error) {
      applyServerError({
        message: errorMessage(error),
        fieldErrors: error instanceof ActionFailure ? error.fieldErrors : undefined,
      });
      return;
    }

    const amount = formatPen(penToCents(values.amount) ?? 0);
    toast.success(
      values.status === "avoided"
        ? `Compra evitada registrada · ${amount}`
        : `Compra pospuesta registrada · ${amount}`,
    );
    onSuccess();
  });

  return {
    form,
    categoryOptions,
    reasonOptions,
    isLoadingOptions: categoriesQuery.isPending,
    onSubmit,
    submitError,
    isPending: save.isPending,
    isEditing: Boolean(item),
    today: todayInLima(),
  };
}
