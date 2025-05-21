import { useContext } from "react";
import { TokensContext } from "../context/TokensContext";

export const useTokensContext = () => useContext(TokensContext);
