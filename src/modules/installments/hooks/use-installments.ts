"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { unwrapResult } from "@/lib/action-result";

import {
  createInstallmentAction,
  deleteInstallmentAction,
  listInstallmentsAction,
  payInstallmentAction,
} from "../actions/installments.actions";
import type { InstallmentCreateInput } from "../schemas/installment.schema";

export const installmentsKey = ["installments"] as const;

export function useInstallments() {
  return useQuery({
    queryKey: installmentsKey,
    queryFn: async () => unwrapResult(await listInstallmentsAction()),
  });
}

function useInvalidate() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: installmentsKey });
}

export function useCreateInstallment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: InstallmentCreateInput) =>
      unwrapResult(await createInstallmentAction(input)),
    onSuccess: invalidate,
  });
}

export function usePayInstallment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => unwrapResult(await payInstallmentAction(id)),
    onSuccess: invalidate,
  });
}

export function useDeleteInstallment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => unwrapResult(await deleteInstallmentAction(id)),
    onSuccess: invalidate,
  });
}
