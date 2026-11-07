"use client";

import { useState } from "react";
import "../css/ImageMessageModal.css";

export default function ImageMessageModal({
  imageSrc = "/images/project-message.jpg",
  imageAlt = "پیام پروژه",
  message = "هر قدم کوچک، ما را به ساختن آینده‌ای بهتر نزدیک‌تر می‌کند.",
  open,
  onClose,
  loading = false,
  error = "",
}) {
  const [internalOpen, setInternalOpen] = useState(false);

  const unitImageAvailable = Boolean(imageSrc);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  const closeModal = () => {
    if (isControlled) {
      onClose?.();
    } else {
      setInternalOpen(false);
    }
  };

  const showModal = () => {
    setInternalOpen(true);
  };

  return (
    <>
      {!isControlled && (
        <div className="image-message-trigger">
          <button
            type="button"
            className="image-message-trigger-button"
            onClick={showModal}
          >
            <span className="image-message-trigger-icon">✦</span>
            <span>نمایش پیام</span>
          </button>
        </div>
      )}

      {isOpen && (
        <div className="image-message-overlay" onClick={closeModal}>
          <div
            className="image-message-modal"
            role="dialog"
            aria-modal="true"
            aria-label="پیام پروژه"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="image-message-close"
              aria-label="بستن پنجره"
              onClick={closeModal}
            >
              ×
            </button>

            <div className="image-message-image-wrapper">
              {loading ? (
                <p>در حال دریافت تصویر...</p>
              ) : error ? (
                <p className="image-message-error">{error}</p>
              ) : unitImageAvailable ? (
                <img src={imageSrc} alt={imageAlt} />
              ) : (
                <p>تصویری برای این واحد موجود نیست.</p>
              )}
            </div>

            <div className="image-message-content">
              <span className="image-message-decoration">✦</span>
              <p>{message}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
