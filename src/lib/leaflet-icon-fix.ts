import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

/**
 * Leaflet's default marker icon resolves image paths relative to the CSS
 * file location, which breaks under Vite/Webpack bundling. This rewires it
 * to the bundler-resolved asset URLs. Side-effect only — import once,
 * globally, before any Leaflet map mounts.
 */
type IconDefaultWithPrivateUrl = typeof L.Icon.Default.prototype & {
  _getIconUrl?: unknown;
};

delete (L.Icon.Default.prototype as IconDefaultWithPrivateUrl)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});
