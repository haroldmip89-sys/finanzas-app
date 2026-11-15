import { auth } from "@clerk/nextjs/server";

/**
 * Única fuente del `userId` en el servidor. Usa `auth.protect()`: redirige a
 * sign-in en páginas, responde 401 en server actions y 404 en route handlers.
 * El `userId` nunca viene del cliente.
 */
export async function requireUserId(): Promise<string> {
  const { userId } = await auth.protect();
  return userId;
}
