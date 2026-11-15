"use client";

/**
 * Last-resort error screen: it replaces the root layout, so it brings its own
 * html/body and inline styles (the app stylesheet and theme are not loaded).
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 16,
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#0f1117",
          color: "#f4f4f5",
        }}
      >
        <h1 style={{ fontSize: 22, margin: 0 }}>Algo salió mal</h1>
        <p style={{ margin: 0, maxWidth: 360, color: "#a1a1aa" }}>
          Ocurrió un error inesperado. Tus datos están a salvo. Inténtalo de nuevo.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            minHeight: 44,
            padding: "0 20px",
            borderRadius: 12,
            border: 0,
            background: "#7c3aed",
            color: "#fff",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}
