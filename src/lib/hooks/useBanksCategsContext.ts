import { useContext } from "react";
import { BanksCategsContext } from "../context/BanksCategsContext";

export const useBanksCategsContext = () => useContext(BanksCategsContext);
