"use client";

// Pushes the server-fetched projects of the active organization into the store's
// read-only mirror. This is what lets every project consumer (list, dashboard,
// client detail, global search, invoice back-links, the configurator host) keep
// reading `useStore(s => s.projects)` unchanged while Postgres is the source of
// truth.
//
// Renders nothing. The mirror is refreshed whenever the server re-renders the
// layout (e.g. after a mutation calls router.refresh()), so an org switch or any
// project/item change replaces it.

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import type { Project } from "@/domain/types";

export function ProjectsHydrator({ projects }: { projects: Project[] }) {
  const setProjects = useStore((s) => s.setProjects);
  useEffect(() => {
    setProjects(projects);
  }, [projects, setProjects]);
  return null;
}
