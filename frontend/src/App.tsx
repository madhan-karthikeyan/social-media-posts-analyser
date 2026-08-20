import { createRouter, Route, RootRoute, Outlet } from '@tanstack/react-router';
import { IndexRoute } from './routes';

const rootRoute = new RootRoute({
  component: () => <Outlet />,
});

type IndexSearch = {
  view?: 'results';
};

const indexRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: (search: Record<string, unknown>): IndexSearch => {
    return {
      view: search.view === 'results' ? 'results' : undefined,
    };
  },
  component: IndexRoute,
});

const routeTree = rootRoute.addChildren([indexRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
