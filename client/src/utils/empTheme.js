// client/src/utils/empTheme.js
export const EMP_THEME_KEY = "ss_emp_theme"; // light | dark | vivid

export function applyEmpTheme(theme) {
  const t = theme || localStorage.getItem(EMP_THEME_KEY) || "light";
  document.documentElement.setAttribute("data-ep-theme", t);
  localStorage.setItem(EMP_THEME_KEY, t);
  return t;
}

export function getEmpTheme() {
  return localStorage.getItem(EMP_THEME_KEY) || "light";
}
