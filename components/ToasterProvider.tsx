"use client";

import toast, { Toaster } from "react-hot-toast";

export default function ToasterProvider() {
  return (
    <Toaster
      toastOptions={{
        duration: 8000,
      }}
    >
      {(t) => (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background:
              t.type === "error"
                ? "#ff4b4b"
                : t.type === "success"
                  ? "#22c55e"
                  : "#363636",
            color: "#fff",
            padding: "10px 14px",
            borderRadius: "8px",
            fontSize: "14px",
            maxWidth: '90vw',
            width: 'auto',
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            lineHeight: '1.5',
            fontWeight: "500",
            opacity: t.visible ? 1 : 0,
            transition: "opacity 0.3s ease",
          }}
        >
          <span style={{ flex: 1 }}>
            {typeof t.message === "function" ? t.message(t) : t.message}
          </span>
          <button
            onClick={() => toast.dismiss(t.id)}
            style={{
              background: "transparent",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              fontSize: "16px",
              lineHeight: 1,
              padding: "0 2px",
              opacity: 0.8,
            }}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      )}
    </Toaster>
  );
}
