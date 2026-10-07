/**
 * Opens a docs demo on StackBlitz through its documented form-POST API
 * (`POST https://stackblitz.com/run`, fields `project[files][<path>]`,
 * `project[title]`, `project[description]`, `project[template]`,
 * `project[dependencies]`) — no SDK, nothing fetched until the click.
 *
 * The form is created, submitted into a new tab and removed again. The docs
 * CSP allows it with `form-action 'self' https://stackblitz.com`
 * (`vercel.json`; the strict-CSP model in `serve-prerendered.mjs`).
 *
 * Loaded lazily by the code block, so none of this — nor the project builder
 * and its version manifest — is in the initial bundle.
 */
import {
  buildStackblitzProject,
  type StackblitzProject,
  type StackblitzProjectOptions,
} from './stackblitz-project';

export const STACKBLITZ_RUN_URL = 'https://stackblitz.com/run';

/** Builds the hidden form for `project` (not yet attached or submitted). */
export function createStackblitzForm(
  doc: Document,
  project: StackblitzProject,
): HTMLFormElement {
  const form = doc.createElement('form');
  form.method = 'POST';
  form.action = `${STACKBLITZ_RUN_URL}?file=${encodeURIComponent(project.openFile)}`;
  form.target = '_blank';
  form.setAttribute('rel', 'noopener');
  form.setAttribute('aria-hidden', 'true');
  form.hidden = true;

  const add = (name: string, value: string) => {
    const input = doc.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  };
  add('project[title]', project.title);
  add('project[description]', project.description);
  add('project[template]', project.template);
  // The `node` template installs from package.json; the field is sent anyway
  // so the project carries its dependency list in every template StackBlitz
  // may map it to.
  add('project[dependencies]', JSON.stringify(project.dependencies));
  for (const [path, contents] of Object.entries(project.files)) {
    // StackBlitz reads `[` / `]` in a path as form nesting
    add(
      `project[files][${path.replace(/\[/g, '%5B').replace(/\]/g, '%5D')}]`,
      contents,
    );
  }
  return form;
}

/**
 * Builds the project for `source` and submits it to StackBlitz in a new tab.
 * Returns `false` when `source` is not a runnable component.
 */
export function openInStackblitz(
  doc: Document,
  source: string,
  options: StackblitzProjectOptions = {},
): boolean {
  const project = buildStackblitzProject(source, options);
  if (!project) return false;
  const form = createStackblitzForm(doc, project);
  doc.body.appendChild(form);
  try {
    form.submit();
  } finally {
    form.remove();
  }
  return true;
}
