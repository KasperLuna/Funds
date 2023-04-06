/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { Group, Menu, ActionIcon } from "@mantine/core";
import { DatePicker } from "@mantine/dates";
import { IconCalendarEvent, IconCalendarMinus } from "@tabler/icons-react";
import { Control, Controller, UseFormSetValue } from "react-hook-form";
import { AppTxTypes, Transfer } from "../../utils/db";

type DateComponentProps = {
  control: Control<AppTxTypes | any>;
  setValue: UseFormSetValue<AppTxTypes | Transfer | any>;
};

export default function Datecomponent(props: DateComponentProps) {
  const { control, setValue } = props;
  return (
    <>
      <Group noWrap spacing={0} sx={{ width: "100%" }}>
        <Controller
          control={control}
          name="date"
          rules={{ required: true }}
          render={({ field }) => (
            <DatePicker
              {...field}
              placeholder="Date"
              label="Date: "
              sx={{ width: "100%" }}
              radius={0}
              withAsterisk
              withinPortal
            />
          )}
        />
        <Menu transition="pop" position="bottom-end">
          <Menu.Target>
            <ActionIcon
              variant="default"
              sx={{
                alignSelf: "end",
                borderBottomLeftRadius: 0,
                borderTopLeftRadius: 0,
                width: 15,
                height: 36,
              }}
            >
              <IconCalendarEvent size={16} stroke={1.5} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              onClick={() => {
                setValue("date", new Date());
              }}
              icon={<IconCalendarEvent size={16} stroke={1.5} />}
            >
              Set to Today
            </Menu.Item>
            <Menu.Item
              onClick={() => {
                setValue("date", new Date(Date.now() - 86400000));
              }}
              icon={<IconCalendarMinus size={16} stroke={1.5} />}
            >
              Set to Yesterday
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </>
  );
}
