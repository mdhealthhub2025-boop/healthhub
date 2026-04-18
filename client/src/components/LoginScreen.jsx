import {
  Alert,
  Box,
  Button,
  Card,
  TextField,
  Typography
} from '@mui/material';

export default function LoginScreen({
  loginForm,
  onChange,
  onSubmit,
  onDemo,
  error,
  busy,
  firebaseReady
}) {
  return (
    <Box sx={{ minHeight: '100vh', px: { xs: 2, sm: 3 }, py: { xs: 3, sm: 6 }, bgcolor: 'background.default' }}>
      <Box sx={{ mx: 'auto', maxWidth: 520 }}>
        <Card sx={{ p: { xs: 3, sm: 4 }, borderRadius: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Doctor login
          </Typography>

          <Box component="form" onSubmit={onSubmit} sx={{ mt: 3, display: 'grid', gap: 2 }}>
            <TextField
              label="Email"
              type="email"
              name="email"
              placeholder="doctor@clinic.com"
              value={loginForm.email}
              onChange={onChange}
              required
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              name="password"
              placeholder="••••••••"
              value={loginForm.password}
              onChange={onChange}
              required
              fullWidth
            />

            {error ? <Alert severity="error">{error}</Alert> : null}

            <Button type="submit" variant="contained" size="large" disabled={busy}>
              {busy ? 'Signing in...' : 'Sign in'}
            </Button>
            <Button type="button" variant="outlined" size="large" onClick={onDemo}>
              Open demo workspace
            </Button>
          </Box>

          {!firebaseReady ? (
            <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
              Firebase is not configured yet. Add your environment values to enable real authentication and cloud sync.
            </Alert>
          ) : null}
        </Card>
      </Box>
    </Box>
  );
}
