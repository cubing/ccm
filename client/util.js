export function isActiveRoute(routeName) {
  return FlowRouter.current().route.path == routeName;
};
export function isActiveOrAncestorRoute (routeName) {
  let currentParams = Router.current().params;
  let route = Router.routes[routeName];
  let routePath = route.path(currentParams);
  // Check if our current path begins with the given route
  let currentPath = Iron.Location.get().path;
  return currentPath.indexOf(routePath) === 0;
};