"use client";

import { toast } from "sonner";

import type { SelectOption } from "@/components/shared/entity-select";
import { useZodForm } from "@/hooks/use-zod-form";
import { ActionFailure, errorMessage } from "@/lib/action-result";
import { todayInLima } from "@/lib/dates";
import { formatPen, penToCents } from "@/lib/money";
import { useCategories } from "@/modules/categories/hooks/use-categories";

import {
  avoidedFormSchema,
  toAvoidedCreateInput,
  type AvoidedFormValues,
} from "../schemas/avoided-purchase.schema";
import { useCreateAvoidedPurchase } from "./use-avoided-purchases";

export function useAvoidedForm({ onSuccess }: { onSuccess: () => void }) {
  const create = useCreateAvoidedPurchase();
  const categoriesQuery = useCategories(false);

  const categoryOptions: SelectOption[] = (categoriesQuery.data ?? [])
    .filter((c) => c.kind === "expense")
    .map((c) => ({ id: c.id, name: c.name }));

  const defaults: AvoidedFormValues = {
    amount: "",
    categoryId: "",
    reason: "",
    date: todayInLima(),
    note: "",
  };
  const { form, applyServerError, submitError } = useZodForm(avoidedFormSchema, defaults);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await create.mutateAsync(toAvoidedCreateInput(values));
    } catch (error) {
      applyServerError({
        message: errorMessage(error),
        fieldErrors: error instanceof ActionFailure ? error.fieldErrors : undefined,
      });
      return;
    }
    toast.success(`Compra evitada registrada · ${formatPen(penToCents(values.amount) ?? 0)}`);
    onSuccess();
  });

  return {
    form,
    categoryOptions,
    onSubmit,
    submitError,
    isPending: create.isPending,
  };
}
