"use client";
import React, { useRef } from "react";
import clsx from "clsx";
import Portal from "./Portal";
import { useOutsideClick, useFocusTrap } from "@t007/utils/hooks/react";
import { useIsVisible } from "@/hooks/useIsVisible";
import "@/styles/common/DialogModal.css";

export interface DialogModalProps {
  open: boolean;
  onClose: () => void;
  className?: string;
  width?: string;
  children: React.ReactNode;
}

export const DialogModal: React.FC<DialogModalProps> = ({ open, onClose, className, children, width }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const isVisible = useIsVisible(open, 200);

  useFocusTrap(dialogRef as React.RefObject<HTMLElement>, { enabled: isVisible });
  useOutsideClick(dialogRef as React.RefObject<HTMLElement>, { enabled: isVisible, onOutside: onClose, outOnClick: true, outOnEscape: true });

  return (
    <Portal>
      {isVisible && (
        <>
          <div role="dialog" aria-modal="true" ref={dialogRef} className={clsx("dialog-modal flex flex-col overflow-hidden m-auto", { open }, className)} style={width ? { width } : undefined}>
            {children}
          </div>
          <div className={clsx("dialog-modal-backdrop", { open })} onClick={onClose} aria-hidden="true" />
        </>
      )}
    </Portal>
  );
};

export default DialogModal;
