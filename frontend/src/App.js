import React from "react";
import PreProcessingPage from "./pages/PreProcessingPage";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import "@fontsource/fira-code";

const theme = createTheme({
  typography: {
    fontFamily: '"Fira Code", "Source Code Pro", "Courier New", monospace',
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        code, pre {
          font-family: "Fira Code", "Source Code Pro", "Courier New", monospace;
        }
      `,
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <PreProcessingPage />
    </ThemeProvider>
  );
}

export default App;