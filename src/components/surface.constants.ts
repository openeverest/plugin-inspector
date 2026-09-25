// Recessed area for canvases and log output. Mode-aware because action.hover is a
// translucent overlay; the host doesn't publish its surface tokens to plugins.
export const SUNKEN_SURFACE_SX = {
  bgcolor: 'action.hover',
  borderRadius: 1,
};
