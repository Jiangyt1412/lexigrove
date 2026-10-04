import { useEffect, useRef, type ReactNode } from "react"; // # Native dialogs provide focus containment and Escape behavior.
import { X } from "./PixelIcons";
export function Modal({
  title,
  children,
  onClose,
  wide = false,
  showTitle = true,
  className = "",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  showTitle?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    const cancel = (event: Event) => {
      event.preventDefault();
      close.current();
    };
    dialog.addEventListener("cancel", cancel);
    return () => {
      dialog.removeEventListener("cancel", cancel);
      dialog.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""} ${className}`}
      aria-label={title}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-inner">
        <div className="modal-heading">
          {showTitle && <h2>{title}</h2>}
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
export function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}
export function Definition({
  text,
  onWord,
}: {
  text: string;
  onWord: (word: string) => void;
}) {
  return (
    <span className="definition">
      {text.split(/([\p{L}][\p{L}'’-]*)/u).map((token, i) =>
        /^[\p{L}]/u.test(token) ? (
          <button
            key={i}
            className="definition-word"
            onClick={() => onWord(token)}
          >
            {token}
          </button>
        ) : (
          <span key={i}>{token}</span>
        ),
      )}
    </span>
  );
}
export function Confirm({
  title,
  children,
  onConfirm,
  onClose,
  danger = false,
}: {
  title: string;
  children: ReactNode;
  onConfirm: () => void;
  onClose: () => void;
  danger?: boolean;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="confirm-body">{children}</div>
      <div className="actions">
        <button className="secondary" onClick={onClose}>
          Cancel
        </button>
        <button className={danger ? "danger" : "primary"} onClick={onConfirm}>
          Confirm
        </button>
      </div>
    </Modal>
  );
}
