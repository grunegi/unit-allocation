"use client";

import { useState } from "react";
import QrScanner from "../components/QrScanner";

export default function ScanPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  return (
    <main className="container">
      <section className="card">
        <h1>📷 اسکن واحد</h1>
        <QrScanner autoStart onScan={setCode} onError={setError} />
        {code && (
          <p>
            کد: <strong>{code}</strong>
          </p>
        )}
        {error && <p role="alert">{error}</p>}
      </section>
    </main>
  );
}
