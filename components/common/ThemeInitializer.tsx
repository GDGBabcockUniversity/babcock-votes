import { key } from "@/context/app-store";

export function ThemeInitializer() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function(store) {
            try {
              const theme = store ? JSON.parse(store).ui?.theme : undefined;
              document.documentElement.classList.toggle("dark", theme !== undefined ? theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches);
            } catch(e) {}
          })(localStorage.getItem("${key}"));
        `,
      }}
    />
  );
}
