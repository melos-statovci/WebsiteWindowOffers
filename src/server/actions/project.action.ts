"use server";

// Public "use server" entry points for project (offer) + item mutations. They
// accept only the validated input shapes; request headers (and therefore the
// session / active organization) are read server-side and can never be supplied
// by the caller. Mirrors the Phase 3/4/5 wrapper template.

import { headers } from "next/headers";
import {
  createProjectAction,
  updateProjectAction,
  setProjectStatusAction,
  archiveProjectAction,
  deleteProjectAction,
  setProjectOptionAction,
  addProjectItemAction,
  updateProjectItemAction,
  duplicateProjectItemAction,
  deleteProjectItemAction,
} from "@/server/actions/project";
import type {
  ProjectCreateInput,
  ProjectUpdateInput,
  ProjectStatusInput,
  ItemAddInput,
  ItemUpdateInput,
} from "@/domain/validation/project";

export async function createProject(input: ProjectCreateInput) {
  return createProjectAction(input, await headers());
}
export async function updateProject(input: ProjectUpdateInput) {
  return updateProjectAction(input, await headers());
}
export async function setProjectStatus(input: ProjectStatusInput) {
  return setProjectStatusAction(input, await headers());
}
export async function archiveProject(input: { id: string; archived: boolean }) {
  return archiveProjectAction(input, await headers());
}
export async function deleteProject(input: { id: string }) {
  return deleteProjectAction(input, await headers());
}
export async function setProjectOption(input: { id: string; key: string; value: boolean }) {
  return setProjectOptionAction(input, await headers());
}
export async function addProjectItem(input: ItemAddInput) {
  return addProjectItemAction(input, await headers());
}
export async function updateProjectItem(input: ItemUpdateInput) {
  return updateProjectItemAction(input, await headers());
}
export async function duplicateProjectItem(input: { projectId: string; itemId: string }) {
  return duplicateProjectItemAction(input, await headers());
}
export async function deleteProjectItem(input: { projectId: string; itemId: string }) {
  return deleteProjectItemAction(input, await headers());
}
