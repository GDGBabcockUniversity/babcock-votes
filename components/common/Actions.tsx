"use client";
import React, { useRef, useState } from "react";
import clsx from "clsx";
import { useScrollAssist, useArrowNavigation, useOutsideClick } from "@t007/utils/hooks/react";
import { useDropdownPosition, Position } from "@/hooks/useDropdownPosition";
import Button, { ButtonLink, type ButtonProps, type ButtonLinkProps } from "./Button";
import ThreeDotsIcon from "@icons/common/threedots.svg";
import ArrowDownIcon from "@icons/common/chevron-down.svg";
import "@/styles/common/Actions.css";

interface ActionsProps {
  children?: React.ReactNode;
  position?: Position;
  fixed?: boolean;
  autoFit?: boolean;
  className?: string;
}

type ActionsTriggerProps = ButtonProps & {
  isActive?: boolean;
  fallback?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
};

type ActionProps = ButtonProps & { danger?: boolean };
type ActionLinkProps = ButtonLinkProps & { danger?: boolean };

export const Actions: React.FC<ActionsProps> = ({ children, position = "bottom-left", fixed, autoFit = true, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen((o) => !o);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const resolved = useDropdownPosition(triggerRef, dropdownRef, { enabled: isOpen && !fixed, fallback: position });
  useArrowNavigation(wrapperRef as React.RefObject<HTMLElement>, { enabled: isOpen, selector: ".action-button", loop: true });
  useOutsideClick(wrapperRef as React.RefObject<HTMLElement>, { enabled: isOpen, outOnFocusOut: true, onOutside: toggle });
  useScrollAssist(contentRef as React.RefObject<HTMLElement>, { enabled: isOpen && autoFit, assistClassName: "scroll-assist" });

  let trigger: React.ReactNode = null;
  const actions: React.ReactNode[] = [];

  React.Children.forEach(children, (child, index) => {
    if (!React.isValidElement(child)) return;
    const name = (child.type as { displayName?: string }).displayName;
    const key = child.key ?? `action-${index}`;
    if (name === "ActionsTrigger") trigger = React.cloneElement(child as React.ReactElement<{ ref?: React.Ref<HTMLButtonElement>; isActive?: boolean; onToggle?: () => void; onClick?: React.MouseEventHandler }>, { ref: triggerRef, isActive: isOpen, onToggle: toggle, onClick: (child.props as { onClick?: React.MouseEventHandler }).onClick });
    else if (name === "Action" || name === "ActionLink") actions.push(React.cloneElement(child as React.ReactElement<{ onClick?: React.MouseEventHandler }>, { key, onClick: (e: React.MouseEvent) => (toggle(), (child.props as { onClick?: React.MouseEventHandler }).onClick?.(e)) }));
    else actions.push(child.key != null ? child : React.cloneElement(child, { key }));
  });

  return (
    <div ref={wrapperRef} className={clsx("actions-wrapper relative inline-flex", { closed: !isOpen, "auto-fit": autoFit }, className)}>
      {trigger ?? <ActionsTrigger ref={triggerRef} isActive={isOpen} fallback onToggle={toggle} />}
      {actions.length > 0 && (
        <div ref={dropdownRef} className="actions-container absolute flex" data-position={fixed ? position : resolved}>
          <div ref={contentRef} className={clsx("actions-container-content flex flex-col w-full gap-1", { "no-scrollbar": autoFit })}>
            {actions}
          </div>
        </div>
      )}
    </div>
  );
};

export const ActionsTrigger = React.forwardRef<HTMLButtonElement, ActionsTriggerProps>(function ActionsTrigger({ isActive, fallback = false, onToggle, onClick, children, className, ...props }, ref) {
  return !fallback ? (
    <Button {...props} ref={ref} variant="ghost" onClick={() => (onToggle?.(), onClick?.())} className={clsx("actions-trigger", { "is-active": isActive }, className)}>
      {children || "Actions"}
      <ArrowDownIcon className="actions-trigger-arrow-icon" />
    </Button>
  ) : (
    <button {...props} ref={ref} title="Options" type="button" onClick={() => (onToggle?.(), onClick?.())} className={clsx("actions-fallback-trigger inline-flex", { "is-active": isActive }, className)}>
      <ThreeDotsIcon className="size-4 shrink-0 block scale-80" />
    </button>
  );
});
ActionsTrigger.displayName = "ActionsTrigger";

export const Action = React.forwardRef<HTMLButtonElement, ActionProps>(function Action({ variant = "regular", danger, className, children, ...props }, ref) {
  return (
    <Button {...props} ref={ref} variant={variant} className={clsx("action-button w-full whitespace-nowrap shrink-0 justify-start text-left", danger && "danger", className)}>
      {children}
    </Button>
  );
});
Action.displayName = "Action";

export const ActionLink = React.forwardRef<HTMLAnchorElement, ActionLinkProps>(function ActionLink({ href, variant = "regular", danger, className, children, ...props }, ref) {
  return (
    <ButtonLink {...props} href={href} ref={ref} variant={variant} className={clsx("action-button w-full whitespace-nowrap shrink-0 justify-start text-left", danger && "danger", className)}>
      {children}
    </ButtonLink>
  );
});
ActionLink.displayName = "ActionLink";
