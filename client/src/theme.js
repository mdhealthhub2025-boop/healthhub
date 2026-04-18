import { createTheme } from '@mui/material/styles';

const sharedThemeOptions = {
  shape: {
    borderRadius: 16
  },
  typography: {
    fontFamily: "Inter, 'Segoe UI', sans-serif",
    button: {
      textTransform: 'none',
      fontWeight: 700
    }
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)'
        }
      }
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
          paddingInline: 16
        }
      }
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined'
      }
    }
  }
};

export function createAppTheme(mode = 'light') {
  if (mode === 'dark') {
    return createTheme({
      ...sharedThemeOptions,
      palette: {
        mode: 'dark',
        primary: {
          main: '#6D5BD0',
          light: '#A79BFF',
          dark: '#4C3BB3'
        },
        background: {
          default: '#0F1220',
          paper: '#171B2E'
        },
        text: {
          primary: '#F3F4F6',
          secondary: '#9CA3AF'
        },
        success: {
          main: '#22C55E'
        },
        error: {
          main: '#EF4444'
        }
      },
      components: {
        ...sharedThemeOptions.components,
        MuiCard: {
          styleOverrides: {
            root: {
              boxShadow: '0 10px 30px rgba(2, 6, 23, 0.45)'
            }
          }
        }
      }
    });
  }

  return createTheme({
    ...sharedThemeOptions,
    palette: {
      mode: 'light',
      primary: {
        main: '#6D5BD0',
        light: '#A79BFF',
        dark: '#4C3BB3'
      },
      background: {
        default: '#F7F7FB',
        paper: '#FFFFFF'
      },
      text: {
        primary: '#1F2937',
        secondary: '#6B7280'
      },
      success: {
        main: '#22C55E'
      },
      error: {
        main: '#EF4444'
      }
    }
  });
}

const theme = createAppTheme();

export default theme;