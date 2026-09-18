// PWA de la gestion (04 §14) : service worker rendu, enregistrement, installation.
export { INSTALL_DISMISSED_KEY, usePwaInstall, type InstallMode, type PwaInstall } from "./install";
export { screenIsQuiet } from "./quiet";
export {
  ServiceWorkerRegistrar,
  UPDATE_TOAST_ACTION,
  UPDATE_TOAST_MESSAGE,
} from "./ServiceWorkerRegistrar";
export {
  CACHE_PREFIX,
  IMMUTABLE_PREFIXES,
  NAVIGATION_TIMEOUT_MS,
  OFFLINE_URL,
  SKIP_WAITING_MESSAGE,
  renderServiceWorker,
} from "./service-worker";
