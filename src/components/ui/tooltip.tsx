import * as React from "react";

export const Tooltip: React.FC<{
  content: React.ReactNode;
  children: React.ReactNode;
}> = ({ content, children }) => {
  const [visible, setVisible] = React.useState(false);
  return (
    <span
      style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      tabIndex={0}
    >
      {children}
      {visible && (
        <span
          style={{
            position: "absolute",
            zIndex: 100,
            left: "50%",
            bottom: "120%",
            transform: "translateX(-50%)",
            background: "#1e293b",
            color: "#f1f5f9",
            padding: "6px 12px",
            borderRadius: "6px",
            fontSize: "0.85em",
            whiteSpace: "nowrap",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
          role="tooltip"
        >
          {content}
        </span>
      )}
    </span>
  );
};
