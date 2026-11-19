export const SITE_NAME = "Yupi";
export const SITE_DESCRIPTION =
  "Controla tus ingresos, gastos y presupuestos en soles (PEN) y sabe cuánto dinero puedes gastar de verdad.";
export const SITE_URL = 
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.NODE_ENV === "production" ? "https://yupi-app-eight.vercel.app" : "http://localhost:3000");
