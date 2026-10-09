"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, Pencil, Trash2, X, Check } from "lucide-react";
import { deleteSolarProject, renameSolarProject } from "@/app/project-actions";

export type SavedProjectView = { id: string; name: string; location: string; status: string; updatedAt: string };

export function SavedProjects({ projects }: { projects: SavedProjectView[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [feedback, setFeedback] = useState("");
  const [pending, startTransition] = useTransition();
  function rename(project: SavedProjectView) {
    startTransition(async () => {
      const result = await renameSolarProject(project.id, name);
      setFeedback(result.ok ? "Project name updated." : result.message);
      if (result.ok) setEditing(null);
    });
  }
  function remove(project: SavedProjectView) {
    if (!window.confirm(`Delete “${project.name}” and its saved assessment? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteSolarProject(project.id);
      setFeedback(result.ok ? "Project deleted." : result.message);
    });
  }
  return <div className="saved-project-list" aria-live="polite">
    {feedback && <p className="saved-project-feedback" role="status">{feedback}</p>}
    {projects.length === 0 ? <div className="saved-project-empty"><p>No saved projects yet.</p><p>Build a plan, then choose “Save this project” to keep it in your private account.</p><Link href="/planner">Build a solar plan <ArrowRight size={15}/></Link></div> : projects.map(project => <article className="saved-project-row" key={project.id}>
      <div className="saved-project-name">{editing === project.id ? <form action={() => rename(project)}><label htmlFor={`project-name-${project.id}`}>Project name</label><input id={`project-name-${project.id}`} value={name} maxLength={120} onChange={event => setName(event.target.value)} required/><button type="submit" disabled={pending} aria-label="Save project name"><Check size={16}/></button><button type="button" disabled={pending} onClick={() => setEditing(null)} aria-label="Cancel rename"><X size={16}/></button></form> : <><Link href={`/dashboard/projects/${project.id}`}><strong>{project.name}</strong><span>{project.location} · {project.status}</span></Link><small>Updated {new Date(project.updatedAt).toLocaleDateString()}</small></>}</div>
      {editing !== project.id && <div className="saved-project-actions"><Link href={`/dashboard/projects/${project.id}`} className="saved-project-open">Open <ArrowRight size={14}/></Link><button type="button" onClick={() => { setEditing(project.id); setName(project.name); }} aria-label={`Rename ${project.name}`}><Pencil size={15}/></button><button type="button" disabled={pending} onClick={() => remove(project)} aria-label={`Delete ${project.name}`}><Trash2 size={15}/></button></div>}
    </article>)}
  </div>;
}
