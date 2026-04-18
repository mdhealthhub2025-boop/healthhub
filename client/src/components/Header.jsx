import { useState } from 'react';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import KeyboardDoubleArrowLeftRoundedIcon from '@mui/icons-material/KeyboardDoubleArrowLeftRounded';
import KeyboardDoubleArrowRightRoundedIcon from '@mui/icons-material/KeyboardDoubleArrowRightRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import SpaceDashboardRoundedIcon from '@mui/icons-material/SpaceDashboardRounded';
import {
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

const navItems = [
  { key: 'dashboard', label: 'Dashboard', icon: SpaceDashboardRoundedIcon },
  { key: 'patients', label: 'Patients', icon: PeopleAltRoundedIcon },
  { key: 'record', label: 'Medical Record', icon: DescriptionRoundedIcon },
  { key: 'appointments', label: 'Appointments', icon: CalendarMonthRoundedIcon },
  { key: 'new-patient', label: 'New Patient', icon: PersonAddAlt1RoundedIcon }
];

const pageTitles = {
  dashboard: 'Dashboard',
  patients: 'Patients',
  record: 'Medical Record',
  appointments: 'Appointments',
  'new-patient': 'New Patient'
};

export default function Header({
  doctorEmail,
  theme,
  activePage,
  onNavigate,
  onLogout,
  onToggleTheme,
  sidebarOpen,
  onToggleSidebar
}) {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const isDesktop = useMediaQuery(muiTheme.breakpoints.up('lg'));
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const showRailText = sidebarOpen;
  const railWidth = sidebarOpen ? (isDesktop ? 188 : 152) : 64;
  const pageTitle = pageTitles[activePage] || 'Health Hub';
  const accountInitial = (doctorEmail?.trim()?.charAt(0) || 'D').toUpperCase();
  const userMenuOpen = Boolean(userMenuAnchor);

  const handleOpenUserMenu = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setUserMenuAnchor(null);
  };

  const handleLogoutClick = () => {
    handleCloseUserMenu();
    onLogout();
  };

  const handleNavigateClick = (page) => {
    onNavigate(page);
    setMobileNavOpen(false);
  };

  return (
    <>
      {!isMobile ? (
        <Drawer
          variant="permanent"
          PaperProps={{
            sx: {
              width: railWidth,
              overflowX: 'hidden',
              transition: 'width 180ms ease',
              borderRight: '1px solid',
              borderColor: 'divider',
              bgcolor: alpha(muiTheme.palette.background.paper, 0.96),
              backdropFilter: 'blur(18px)',
              px: 0.5,
              py: 0.75
            }
          }}
        >
          <Box sx={{ px: 0.75, pt: 1, pb: 0.75 }}>
            <Stack direction="row" alignItems="center" justifyContent={showRailText ? 'space-between' : 'center'}>
              <Stack direction="row" spacing={1} alignItems="center">
                {showRailText ? (
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.05, fontSize: 18 }}>
                    Health Hub
                  </Typography>
                ) : null}
              </Stack>

              {showRailText ? (
                <Tooltip title="Collapse sidebar" placement="right">
                  <IconButton
                    onClick={onToggleSidebar}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      width: 34,
                      height: 34
                    }}
                  >
                    <KeyboardDoubleArrowLeftRoundedIcon />
                  </IconButton>
                </Tooltip>
              ) : null}
            </Stack>
          </Box>

          <Divider sx={{ mb: 0.75 }} />

          <Box sx={{ px: 0.25, pb: 0.75 }}>
            {!showRailText ? (
              <Tooltip title="Expand sidebar" placement="right">
                <IconButton
                  onClick={onToggleSidebar}
                  sx={{
                    mx: 'auto',
                    display: 'flex',
                    border: '1px solid',
                    borderColor: 'divider',
                    width: 34,
                    height: 34
                  }}
                >
                  <KeyboardDoubleArrowRightRoundedIcon />
                </IconButton>
              </Tooltip>
            ) : null}
          </Box>

          <List sx={{ display: 'grid', gap: 0.25, px: 0.25 }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const selected = activePage === item.key;

              return (
                <Tooltip key={item.key} title={!showRailText ? item.label : ''} placement="right">
                  <ListItemButton
                    selected={selected}
                    onClick={() => onNavigate(item.key)}
                    sx={{
                      minHeight: 48,
                      borderRadius: 1,
                      px: showRailText ? 0.875 : 0.5,
                      justifyContent: showRailText ? 'flex-start' : 'center',
                      '&.Mui-selected': {
                        bgcolor: alpha(muiTheme.palette.primary.main, 0.12),
                        color: 'primary.main'
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 0, mr: showRailText ? 1.25 : 0, justifyContent: 'center', color: 'inherit' }}>
                      <Icon />
                    </ListItemIcon>
                    {showRailText ? <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 13, fontWeight: 700 }} /> : null}
                  </ListItemButton>
                </Tooltip>
              );
            })}
          </List>

          <Box sx={{ mt: 'auto', px: 0.25, pt: 1 }}>
            <Stack direction={showRailText ? 'row' : 'column'} spacing={0.75} sx={{ mt: 1 }}>
              <Tooltip title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
                <IconButton onClick={onToggleTheme} sx={{ border: '1px solid', borderColor: 'divider', minHeight: 42, minWidth: 42 }}>
                  {theme === 'dark' ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
        </Drawer>
      ) : null}

      <Box
        sx={{
          pt: 0.5,
          pb: 0.25,
          px: 0,
          ml: isMobile ? 0 : `${railWidth}px`,
          width: isMobile ? '100%' : `calc(100% - ${railWidth}px)`
        }}
      >
        <Paper
          elevation={0}
          sx={{
            mx: 0,
            width: '100%',
            borderRadius: 0,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: alpha(muiTheme.palette.background.paper, 0.92),
            backdropFilter: 'blur(12px)',
            p: { xs: 1, sm: 1.25 }
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
              {isMobile ? (
                <IconButton onClick={() => setMobileNavOpen(true)} sx={{ border: '1px solid', borderColor: 'divider', minHeight: 44, minWidth: 44 }}>
                  <MenuRoundedIcon />
                </IconButton>
              ) : null}
              <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.1, fontSize: { xs: 28, sm: 32 } }}>
                {pageTitle}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center" justifyContent={{ xs: 'space-between', md: 'flex-end' }}>
              {isMobile ? (
                <Stack direction="row" spacing={1}>
                  <IconButton onClick={onToggleTheme} sx={{ border: '1px solid', borderColor: 'divider', minHeight: 44, minWidth: 44 }}>
                    {theme === 'dark' ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
                  </IconButton>
                  <IconButton
                    onClick={handleOpenUserMenu}
                    sx={{ border: '1px solid', borderColor: 'divider', minHeight: 44, minWidth: 44, p: 0.5 }}
                  >
                    <Avatar sx={{ width: 30, height: 30, bgcolor: 'primary.main', fontWeight: 700, fontSize: 14 }}>
                      {accountInitial}
                    </Avatar>
                  </IconButton>
                </Stack>
              ) : (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    {doctorEmail}
                  </Typography>
                  <IconButton
                    onClick={handleOpenUserMenu}
                    sx={{ border: '1px solid', borderColor: 'divider', p: 0.5 }}
                  >
                    <Avatar sx={{ width: 30, height: 30, bgcolor: 'primary.main', fontWeight: 700, fontSize: 14 }}>
                      {accountInitial}
                    </Avatar>
                  </IconButton>
                </Stack>
              )}
            </Stack>
          </Stack>
        </Paper>
      </Box>

      <Menu
        anchorEl={userMenuAnchor}
        open={userMenuOpen}
        onClose={handleCloseUserMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              minWidth: 180,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider'
            }
          }
        }}
      >
        <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            Account
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {doctorEmail}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={handleLogoutClick}>
          <ListItemIcon>
            <LogoutRoundedIcon fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>

      <Drawer
        anchor="left"
        open={isMobile && mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        PaperProps={{
          sx: {
            width: 288,
            borderTopRightRadius: 24,
            borderBottomRightRadius: 24,
            p: 1.5
          }
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 1, py: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Health Hub
          </Typography>
          <IconButton onClick={() => setMobileNavOpen(false)} sx={{ border: '1px solid', borderColor: 'divider', minHeight: 44, minWidth: 44 }}>
            <KeyboardDoubleArrowLeftRoundedIcon />
          </IconButton>
        </Stack>
        <Divider sx={{ my: 1 }} />
        <List sx={{ display: 'grid', gap: 0.75 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const selected = activePage === item.key;

            return (
              <ListItemButton
                key={item.key}
                selected={selected}
                onClick={() => handleNavigateClick(item.key)}
                sx={{
                  minHeight: 52,
                  borderRadius: 2,
                  px: 1.5,
                  '&.Mui-selected': {
                    bgcolor: alpha(muiTheme.palette.primary.main, 0.12),
                    color: 'primary.main'
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                  <Icon />
                </ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 15, fontWeight: 700 }} />
              </ListItemButton>
            );
          })}
        </List>
      </Drawer>
    </>
  );
}
