import { Group, MultiSelect } from "@mantine/core";
import React from "react";
import { createCategory, useCategoriesQuery } from "../../firebase/queries";
import { useAuth } from "../config/AuthContext";

type CategoryInputProps = {
  onChange: (value: string[]) => void;
  value?: string[];
  groupStyle?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  isError?: boolean;
};

const CategoryInput = React.forwardRef(
  (
    { onChange, value, groupStyle, inputStyle, isError }: CategoryInputProps,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ref: React.Ref<HTMLInputElement>
  ): JSX.Element => {
    const { user } = useAuth();
    const { categories } = useCategoriesQuery(user?.uid);
    const create = (name: string) => {
      createCategory({ userId: user?.uid || "", name: name || "" });
      return name;
    };

    const options = Boolean(categories?.length)
      ? categories?.map((categ) => ({
          value: categ.name,
          label: categ.name,
        })) || []
      : [
          {
            value: "none",
            label:
              "Start typing and create new categories for your transactions!",
            disabled: true,
          },
        ];

    return (
      <Group noWrap spacing={0} style={{ ...groupStyle }}>
        <MultiSelect
          // ref={ref}
          data={options}
          placeholder="Type to search or create new categories"
          style={{ width: "100%", borderTopRightRadius: 0, ...inputStyle }}
          dropdownPosition="flip"
          onChange={onChange}
          value={value}
          label="Categories (up to 3): "
          radius={0}
          error={isError}
          searchable
          creatable
          maxSelectedValues={3}
          getCreateLabel={(query) => `+ Create category: "${query}"`}
          onCreate={(query) => create(query)}
        />
      </Group>
    );
  }
);

export { CategoryInput };
