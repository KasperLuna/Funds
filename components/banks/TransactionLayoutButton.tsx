import React from "react";
import { Tooltip, ActionIcon } from "@mantine/core";
import { IconLayoutGrid, IconTable } from "@tabler/icons-react";
import { useTxLayout } from "../../utils/helpers";

export const TransactionLayoutButton = () => {
  const { txLayout, setTxLayout } = useTxLayout();

  const isTableLayout = txLayout === "table";

  const toggleLayoutQuery = () => {
    txLayout === "table" ? setTxLayout("card") : setTxLayout("table");
  };

  return (
    <Tooltip
      label={isTableLayout ? "Toggle to Card View" : "Toggle to Table View"}
    >
      <ActionIcon onClick={() => toggleLayoutQuery()}>
        {isTableLayout ? (
          <IconLayoutGrid size={24} stroke={1.5} />
        ) : (
          <IconTable size={24} stroke={1.5} />
        )}
      </ActionIcon>
    </Tooltip>
  );
};
