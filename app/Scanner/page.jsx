import UnitStatusScanner from "../components/UnitStatusScanner";
import { getTakenUnitsOnly } from "../Js/actions";

export const dynamic = "force-dynamic";

export default async function ScannerPage() {
  const result = await getTakenUnitsOnly();

  const takenUnits = {};
  if (result.ok) {
    for (const code of result.codes) {
      takenUnits[code] = true;
    }
  }

  return (
    <main className="container">
      <header className="card">
        <h1>🔍 بررسی وضعیت واحد</h1>
        <p>
          برای بررسی وضعیت یک واحد، یکی از روش‌های زیر را انتخاب کنید:
        </p>
        <ul className="header-list">
          <li>📷 <strong>اسکن</strong> کد QR واحد</li>
          <li>⌨️ <strong>تایپ</strong> کد واحد (مثلاً A1-15)</li>
          <li>📋 <strong>انتخاب</strong> از لیست ساختمان و شماره</li>
        </ul>
      </header>

      <section className="card">
        <UnitStatusScanner assignments={takenUnits} />
        {/* showPersonInfo پیش‌فرض false هست ✅ */}
      </section>
    </main>
  );
}