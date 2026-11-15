"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { unwrapResult } from "@/lib/action-result";

import {
  createAvoidedPurchaseAction,
  deleteAvoidedPurchaseAction,
  getAvoidedOverviewAction,
  markAvoidedAction,
} from "../actions/avoided-purchases.actions";
import type { AvoidedCreateInput } from "../schemas/avoided-purchase.schema";

export const avoidedKey = ["avoided-purchases"] as const;

export function useAvoidedPurchases() {
  return useQuery({
    queryKey: avoidedKey,
    queryFn: async () => unwrapResult(await getAvoidedOverviewAction()),
  });
}

function useInvalidateAvoided() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: avoidedKey });
}

export function useCreateAvoidedPurchase() {
  const invalidate = useInvalidateAvoided();
  return useMutation({
    mutationFn: async (input: AvoidedCreateInput) =>
      unwrapResult(await createAvoidedPurchaseAction(input)),
    onSuccess: invalidate,
  });
}

export function useMarkAvoided() {
  const invalidate = useInvalidateAvoided();
  return useMutation({
    mutationFn: async (id: string) => unwrapResult(await markAvoidedAction(id)),
    onSuccess: invalidate,
  });
}

export function useDeleteAvoidedPurchase() {
  const invalidate = useInvalidateAvoided();
  return useMutation({
    mutationFn: async (id: string) => unwrapResult(await deleteAvoidedPurchaseAction(id)),
    onSuccess: invalidate,
  });
}
