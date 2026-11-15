import { Banknote, CreditCard, Landmark, Wallet, type LucideIcon } from "lucide-react";

import type { AccountType } from "../types/account.types";

export const ACCOUNT_TYPE_META: Record<
  AccountType,
  { label: string; icon: LucideIcon }
> = {
  cash: { label: "Efectivo", icon: Banknote },
  bank: { label: "Banco", icon: Landmark },
  card: { label: "Tarjeta", icon: CreditCard },
  wallet: { label: "Billetera digital", icon: Wallet },
};

export const ACCOUNT_TYPE_OPTIONS = (
  Object.keys(ACCOUNT_TYPE_META) as AccountType[]
).map((value) => ({ value, label: ACCOUNT_TYPE_META[value].label }));
