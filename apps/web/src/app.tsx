import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation } from "react-router";

import { EmptyState, Spinner } from "@/components/ui";
import { useAuth } from "@/features/auth/auth-context";
import { ForgotPasswordPage, SignInPage, SignUpPage } from "@/features/auth/auth-pages";
import { ChatView, NoChatSelected } from "@/features/chat/chat-view";
import { ChatShell } from "@/features/chat/chat-shell";
import { JoinInvitePage } from "@/features/chat/join-invite";

const AdminLayout = lazy(() =>
  import("@/features/admin/admin-pages").then((module) => ({ default: module.AdminLayout })),
);
const AdminDashboard = lazy(() =>
  import("@/features/admin/admin-pages").then((module) => ({ default: module.AdminDashboard })),
);
const AdminUsers = lazy(() =>
  import("@/features/admin/admin-pages").then((module) => ({ default: module.AdminUsers })),
);
const AdminChats = lazy(() =>
  import("@/features/admin/admin-pages").then((module) => ({ default: module.AdminChats })),
);
const AdminMessages = lazy(() =>
  import("@/features/admin/admin-pages").then((module) => ({ default: module.AdminMessages })),
);

const FullScreenSpinner = () => (
  <div className="flex h-dvh items-center justify-center text-brand-500">
    <Spinner />
  </div>
);

const RequireAuth = ({ admin = false }: { admin?: boolean }) => {
  const { status, user } = useAuth();
  const location = useLocation();
  if (status === "loading") return <FullScreenSpinner />;
  if (status === "anonymous") return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  if (admin && user?.role !== "admin") return <Navigate to="/" replace />;
  return <Outlet />;
};

const GuestOnly = ({ children }: { children: ReactNode }) => {
  const { status } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";
  if (status === "loading") return <FullScreenSpinner />;
  if (status === "authenticated") return <Navigate to={from} replace />;
  return children;
};

const router = createBrowserRouter([
  {
    path: "/sign-in",
    element: (
      <GuestOnly>
        <SignInPage />
      </GuestOnly>
    ),
  },
  {
    path: "/sign-up",
    element: (
      <GuestOnly>
        <SignUpPage />
      </GuestOnly>
    ),
  },
  {
    path: "/forgot-password",
    element: (
      <GuestOnly>
        <ForgotPasswordPage />
      </GuestOnly>
    ),
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: "/",
        element: <ChatShell />,
        children: [
          { index: true, element: <NoChatSelected /> },
          { path: "c/:conversationId", element: <ChatView /> },
        ],
      },
      { path: "/join/:code", element: <JoinInvitePage /> },
    ],
  },
  {
    element: <RequireAuth admin />,
    children: [
      {
        path: "/admin",
        element: (
          <Suspense fallback={<FullScreenSpinner />}>
            <AdminLayout />
          </Suspense>
        ),
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<Spinner />}>
                <AdminDashboard />
              </Suspense>
            ),
          },
          {
            path: "users",
            element: (
              <Suspense fallback={<Spinner />}>
                <AdminUsers />
              </Suspense>
            ),
          },
          {
            path: "chats",
            element: (
              <Suspense fallback={<Spinner />}>
                <AdminChats />
              </Suspense>
            ),
          },
          {
            path: "messages",
            element: (
              <Suspense fallback={<Spinner />}>
                <AdminMessages />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: (
      <div className="flex h-dvh items-center justify-center">
        <EmptyState icon="404" title="Page not found" body="The page you're looking for doesn't exist." />
      </div>
    ),
  },
]);

export const App = () => <RouterProvider router={router} />;
