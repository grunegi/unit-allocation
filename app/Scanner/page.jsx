import UnitStatusScanner from "../components/UnitStatusScanner";
import { getTakenUnitsOnly } from "../Js/actions";

export const dynamic = "force-dynamic";

export default async function ScannerPage() {
  const result = await getTakenUnitsOnly();

  // تبدیل به آبجکت: { "A1-1": true, "A1-5": true, ... }
  const takenUnits = {};
  if (result.ok) {
    for (const code of result.codes) {
      takenUnits[code] = true;
    }
  }

  return (
    <main className="container">
      <header className="card">
        <h1>📷 اسکن واحد</h1>
        <p>دوربین را به سمت QR کد واحد بگیرید.</p>
      </header>

      <section className="card">
        <UnitStatusScanner assignments={takenUnits} />
      </section>
    </main>
  );
}
