"use client";

export default function AutoAssignModal({
  data,
  busy,
  onConfirm,
  onClose,
}) {
  if (!data) return null;

  const {
    building,
    freeCount,
    totalAvailable,
    willAssign,
    availablePeople,
    freeUnits,
  } = data;

  const hasData = willAssign > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🎯 تخصیص خودکار بلوک {building}</h2>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="بستن"
            disabled={busy}
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="auto-assign-stats">
            <div className="auto-assign-stat">
              <span className="auto-assign-stat-label">واحد آزاد</span>
              <span className="auto-assign-stat-value auto-free">
                {freeCount}
              </span>
            </div>
            <div className="auto-assign-stat">
              <span className="auto-assign-stat-label">فرد بدون واحد</span>
              <span className="auto-assign-stat-value auto-people">
                {totalAvailable}
              </span>
            </div>
            <div className="auto-assign-stat auto-assign-final">
              <span className="auto-assign-stat-label">قابل تخصیص</span>
              <span className="auto-assign-stat-value auto-final">
                {willAssign}
              </span>
            </div>
          </div>

          {hasData ? (
            <>
              <div className="auto-assign-preview">
                <h4>
                  👥 {willAssign} نفر اول (بر اساس امتیاز):
                </h4>
                <ol className="auto-assign-list">
                  {availablePeople.slice(0, willAssign).map((p) => (
                    <li key={p.id}>
                      <span className="auto-person-name">{p.name}</span>
                      <span className="auto-person-score">
                        ⭐ {p.score || 0}
                      </span>
                    </li>
                  ))}
                </ol>
                {willAssign > 10 && (
                  <p className="auto-assign-more">
                    ... و {willAssign - 10} نفر دیگر
                  </p>
                )}
              </div>

              {freeUnits.length > 0 && (
                <div className="auto-assign-preview">
                  <h4>
                    🏠 {willAssign} واحد اول (به ترتیب شماره):
                  </h4>
                  <div className="auto-units-list">
                    {freeUnits.slice(0, willAssign).map((code) => (
                      <span className="auto-unit-chip" key={code}>
                        {code}
                      </span>
                    ))}
                  </div>
                  {willAssign > 10 && (
                    <p className="auto-assign-more">
                      ... و {willAssign - 10} واحد دیگر
                    </p>
                  )}
                </div>
              )}

              <p className="auto-assign-warning">
                ⚠️ این عملیات برگشت‌پذیر نیست. آیا مطمئنید؟
              </p>
            </>
          ) : (
            <p className="auto-assign-empty">
              {freeCount === 0
                ? "❌ هیچ واحد آزادی در این بلوک وجود ندارد."
                : "❌ هیچ فرد بدون واحدی برای تخصیص وجود ندارد."}
            </p>
          )}
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="gray"
            onClick={onClose}
            disabled={busy}
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || !hasData}
          >
            {busy
              ? "در حال تخصیص..."
              : hasData
                ? `✅ تخصیص ${willAssign} واحد`
                : "❌ تخصیص ممکن نیست"}
          </button>
        </div>
      </div>
    </div>
  );
}