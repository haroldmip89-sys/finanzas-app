import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const tr = vi.hoisted(() => ({
  listTransfersAction: vi.fn(),
  createTransferAction: vi.fn(),
  updateTransferAction: vi.fn(),
  deleteTransferAction: vi.fn(),
}));
const acc = vi.hoisted(() => ({ listAccountsAction: vi.fn() }));

vi.mock("../actions/transfers.actions", () => tr);
vi.mock("@/modules/accounts/actions/accounts.actions", () => acc);

import type { TransferListItem } from "../types/transfer.types";
import { useTransfersManager } from "./use-transfers-manager";

const item: TransferListItem = {
  id: "99999999-9999-4999-8999-999999999999",
  fromAccountId: "3f1c2b4a-1b2c-4d5e-8f90-1234567890ab",
  fromAccountName: "BBVA",
  toAccountId: "11111111-1111-4111-8111-111111111111",
  toAccountName: "Yape",
  amountCents: 20000,
  date: "2026-11-10",
  note: null,
};

function pageOf(total: number, items = [item]) {
  return { ok: true, data: { items, total, page: 1, pageSize: 20 } };
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useTransfersManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tr.listTransfersAction.mockResolvedValue(pageOf(45));
    acc.listAccountsAction.mockResolvedValue({
      ok: true,
      data: [
        { id: item.fromAccountId, name: "BBVA", archivedAt: null, balanceCents: 0 },
        { id: item.toAccountId, name: "Yape", archivedAt: null, balanceCents: 0 },
      ],
    });
  });

  it("loads the page and the page count", async () => {
    const { result } = renderHook(() => useTransfersManager(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toEqual([item]);
    expect(result.current.total).toBe(45);
    expect(result.current.totalPages).toBe(3);
    expect(result.current.accountOptions.map((a) => a.name)).toEqual(["BBVA", "Yape"]);
  });

  it("has at least one page when empty", async () => {
    tr.listTransfersAction.mockResolvedValue(pageOf(0, []));
    const { result } = renderHook(() => useTransfersManager(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.totalPages).toBe(1);
  });

  it("exposes a safe load error", async () => {
    tr.listTransfersAction.mockResolvedValue({
      ok: false,
      error: { code: "INTERNAL", message: "Ocurrió un error inesperado." },
    });
    const { result } = renderHook(() => useTransfersManager(), { wrapper });

    await waitFor(() => expect(result.current.loadError).toBe("Ocurrió un error inesperado."));
  });

  it("requests the next page and goes back to page 1 when filtering", async () => {
    const { result } = renderHook(() => useTransfersManager(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setPage(2));
    await waitFor(() =>
      expect(tr.listTransfersAction).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })),
    );

    act(() => result.current.setFilter("accountId", item.fromAccountId));
    await waitFor(() =>
      expect(tr.listTransfersAction).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, accountId: item.fromAccountId }),
      ),
    );
    expect(result.current.isFiltered).toBe(true);
  });

  it("opens and closes the form", async () => {
    const { result } = renderHook(() => useTransfersManager(), { wrapper });

    act(() => result.current.openCreate());
    expect(result.current.formState).toEqual({ mode: "create" });

    act(() => result.current.openEdit(item));
    expect(result.current.formState).toEqual({ mode: "edit", transfer: item });

    act(() => result.current.closeForm());
    expect(result.current.formState).toEqual({ mode: "closed" });
  });

  it("deletes after confirmation, closes the dialog and reloads the list", async () => {
    tr.deleteTransferAction.mockResolvedValue({ ok: true, data: null });
    const { result } = renderHook(() => useTransfersManager(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const callsBefore = tr.listTransfersAction.mock.calls.length;

    act(() => result.current.askDelete(item));
    act(() => result.current.confirmDelete());

    await waitFor(() => expect(result.current.toDelete).toBeNull());
    expect(tr.deleteTransferAction).toHaveBeenCalledWith(item.id);
    await waitFor(() =>
      expect(tr.listTransfersAction.mock.calls.length).toBeGreaterThan(callsBefore),
    );
  });

  it("keeps the dialog open and shows the error when deleting fails", async () => {
    tr.deleteTransferAction.mockResolvedValue({
      ok: false,
      error: { code: "NOT_FOUND", message: "La transferencia no existe." },
    });
    const { result } = renderHook(() => useTransfersManager(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.askDelete(item));
    act(() => result.current.confirmDelete());

    await waitFor(() => expect(result.current.deleteError).toBe("La transferencia no existe."));
    expect(result.current.toDelete).toEqual(item);
  });
});
