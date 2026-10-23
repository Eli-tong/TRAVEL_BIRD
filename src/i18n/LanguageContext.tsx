import { createContext, useContext } from "react";
import { translate, translateError, type Language } from "./dictionary";

export const LanguageContext = createContext<Language>("zh-CN");
export function useTranslation() {
  const language = useContext(LanguageContext);
  return {
    language,
    t: (key: Parameters<typeof translate>[1], values?: Parameters<typeof translate>[2]) => translate(language, key, values),
    translateError: (value: string) => translateError(language, value)
  };
}
