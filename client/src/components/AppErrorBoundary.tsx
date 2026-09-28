import { Component, type ErrorInfo, type ReactNode } from "react";
import { Box, Button, Typography } from "@mui/material";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[AppErrorBoundary]", error, info.componentStack);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          bgcolor: "#121212",
          color: "#fff",
          px: 2,
        }}
      >
        <Box sx={{ maxWidth: 560, textAlign: "center" }}>
          <Typography variant="h5" sx={{ mb: 1.5, fontWeight: 700 }}>
            Не удалось загрузить интерфейс
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.72)", mb: 2 }}>
            {error.message || "Неизвестная ошибка JavaScript"}
          </Typography>
          <Button variant="contained" onClick={this.handleReload}>
            Обновить страницу
          </Button>
        </Box>
      </Box>
    );
  }
}
