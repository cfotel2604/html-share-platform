"use client";

import { useEffect, useId, useRef } from "react";

export function ConfirmShareDialog({
  action,
  siteName,
  pathBased,
  busy,
  onCancel,
  onConfirm,
}: {
  action: "rotate" | "revoke";
  siteName: string;
  pathBased: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const rotating = action === "rotate";

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  function cancel() {
    dialog.current?.close();
    onCancel();
  }

  return (
    <dialog
      ref={dialog}
      className="studio-confirm-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        cancel();
      }}
    >
      <h2 id={titleId}>{rotating ? "Đổi link xem?" : "Thu hồi link xem?"}</h2>
      <p className="studio-confirm-site">{siteName}</p>
      <p id={descriptionId} className="studio-description">
        {rotating
          ? "Link cũ sẽ hết hiệu lực. Bạn cần gửi lại link mới cho người xem."
          : pathBased
            ? "Link này sẽ bị chặn với các yêu cầu nội dung mới. Nội dung đã tải trong tab không thể thu hồi."
            : "Link xem sẽ hết hiệu lực. Nội dung trực tiếp vẫn mở khi website đang xuất bản; dùng Tắt xuất bản để chặn nội dung."}
      </p>
      <div className="studio-confirm-actions">
        <button className="studio-button" type="button" onClick={cancel}>
          Hủy
        </button>
        <button className="studio-button studio-primary" type="button" disabled={busy} onClick={() => {
          dialog.current?.close();
          onConfirm();
        }}>
          {rotating ? "Xác nhận đổi link" : "Xác nhận thu hồi"}
        </button>
      </div>
    </dialog>
  );
}
