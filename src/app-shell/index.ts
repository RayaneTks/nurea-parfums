// La coque de la gestion (05 §3.4, 04 §2.1). Les écrans importent d'ici ou du module précis.
export { AdminShell } from "./AdminShell";
export { AppHeader } from "./AppHeader";
export { Block, BLOCK_ERROR_MESSAGE } from "./Block";
// `CommandPalette` n'est PAS réexportée : elle est chargée à la demande par le shell (04 §15 règle 11),
// et un ré-export statique la ramènerait dans le paquet de quiconque importe ce baril.
export { FeedbackProvider, useConfirm, useToast, type ConfirmRequest, type ToastRequest } from "./FeedbackProvider";
export * from "./hooks";
export {
  ADMIN_TABS,
  getParentScreen,
  resolveBack,
  tabOf,
  isTabRoot,
  type AdminParent,
  type AdminTab,
  type TabId,
} from "./navigation";
export { PreprodBanner } from "./PreprodBanner";
export { PREPROD_BANNER_TEXT, isPreprod } from "./preprod";
export { PullToRefresh } from "./PullToRefresh";
export { ROUTE_SPECS, routes, withSheet, withoutSheet, type RouteName, type RouteSpec } from "./routes";
export { useShellSheet } from "./SheetRegistry";
export { useShellNavigation } from "./ShellNavigation";
export { TabBar } from "./TabBar";
export { UndoProvider, useUndo, UNDO_DELAY_MS } from "./UndoProvider";
export { ViewportService } from "./ViewportService";
