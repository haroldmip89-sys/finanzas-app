"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { unwrapResult } from "@/lib/action-result";

import {
  createAvoidedAction,
  deleteAvoidedAction,
  setAvoidedStatusAction,
  updateAvoidedAction,
} from "../actions/avoided.actions";
import type { AvoidedInput } from "../schemas/avoided.schema";
import type { AvoidedStatus } from "../types/avoided.types";
import { avoidedKey } from "./use-avoided";

function useInvalidateAvoided() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: avoidedKey });
}

export function useSaveAvoided() {
  const invalidate = useInvalidateAvoided();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: AvoidedInput }) =>
      unwrapResult(
        id ? await updateAvoidedAction(id, input) : await createAvoidedAction(input),
      ),
    onSuccess: invalidate,
  });
}

export function useSetAvoidedStatus() {
  const invalidate = useInvalidateAvoided();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AvoidedStatus }) =>
      unwrapResult(await setAvoidedStatusAction(id, status)),
    onSuccess: invalidate,
  });
}

export function useDeleteAvoided() {
  const invalidate = useInvalidateAvoided();
  return useMutation({
    mutationFn: async (id: string) => unwrapResult(await deleteAvoidedAction(id)),
    onSuccess: invalidate,
  });
}
