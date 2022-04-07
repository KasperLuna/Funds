import { ColorScheme } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";

export default function useColorScheme() {
  const [colorScheme, setColorScheme] = useLocalStorage<ColorScheme>({
    key: "mantine-color-scheme",
    defaultValue: "light",
    getInitialValueInEffect: true,
  });

  const toggleColorScheme = (value?: ColorScheme) =>
    setColorScheme(value || (colorScheme === "dark" ? "light" : "dark"));

  return { colorScheme, setColorScheme, toggleColorScheme };
}
