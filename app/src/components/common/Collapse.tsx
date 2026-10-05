import React from "react";

interface CollapseProps {
  open: boolean;
  children: React.ReactNode;
}

/** Animated show/hide. Closed content is inert so it cannot be focused or read out. */
export function Collapse({ open, children }: CollapseProps) {
  return (
    <div className="collapse-panel" data-open={open} inert={!open}>
      <div className="collapse-inner">{children}</div>
    </div>
  );
}
