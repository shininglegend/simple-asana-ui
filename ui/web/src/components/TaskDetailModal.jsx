import { useEffect, useState, Fragment } from 'react';
import { formatDateLong, isOverdue } from '../lib/format.js';
import { colorForName } from '../lib/colors.js';
import { getStories, addComment } from '../lib/api.js';

export default function TaskDetailModal({
  task,
  projectColors,
  projects = [],
  onAddProject,
  onRemoveProject,
  onClose,
  onToggle,
  onNotesChange,
  onDueChange,
  onAssigneeChange,
  people = [],
  isMobile,
}) {
  const [dueDate, setDueDate] = useState(task.due_on ?? null);
  const [notes, setNotes] = useState(task.notes ?? '');
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentError, setCommentError] = useState(null);

  useEffect(() => {
    setDueDate(task.due_on ?? null);
  }, [task.gid, task.due_on]);

  useEffect(() => {
    setNotes(task.notes ?? '');
  }, [task.gid, task.notes]);

  useEffect(() => {
    let cancelled = false;
    setLoadingComments(true);
    setCommentError(null);
    getStories(task.gid)
      .then((stories) => {
        if (cancelled) return;
        setComments(
          stories
            .filter((s) => s.resource_subtype === 'comment_added')
            .map((s) => ({
              author: s.created_by?.name ?? 'Someone',
              time: new Date(s.created_at).toLocaleString(),
              text: s.text,
              htmlText: s.html_text,
            })),
        );
      })
      .catch(() => !cancelled && setCommentError('Couldn’t load comments.'))
      .finally(() => !cancelled && setLoadingComments(false));
    return () => {
      cancelled = true;
    };
  }, [task.gid]);

  const done = !!task.completed;
  const overdue = isOverdue(dueDate, done);
  const availableProjects = projects.filter((p) => !task.projects?.some((tp) => tp.gid === p.gid));

  async function submitComment(e) {
    if (e.key !== 'Enter') return;
    const text = newComment.trim();
    if (!text) return;
    setNewComment('');
    try {
      const story = await addComment(task.gid, text);
      setComments((c) => [
        ...c,
        {
          author: story.created_by?.name ?? 'You',
          time: new Date(story.created_at).toLocaleString(),
          text: story.text || text,
          htmlText: story.html_text,
        },
      ]);
      setCommentError(null);
    } catch {
      setNewComment(text);
      setCommentError("Couldn't post the comment.");
    }
  }

  const metaFields = (
    <div className="flex flex-wrap gap-x-5.5 gap-y-4">
      <div className="flex flex-col gap-1">
        <span className="font-semibold text-[10px] tracking-wider uppercase text-fainter">Due</span>
        <div className="flex items-center gap-1.5">
          <div className="relative cursor-pointer group">
            <span
              className={`font-semibold text-sm ${
                overdue ? 'text-danger' : 'text-ink'
              } underline decoration-dashed decoration-1 underline-offset-4 group-hover:text-accent group-hover:decoration-accent transition-colors`}
            >
              {formatDateLong(dueDate)}
            </span>
            <input
              type="date"
              value={dueDate || ''}
              onChange={(e) => {
                const val = e.target.value || null;
                setDueDate(val);
                if (val !== task.due_on) {
                  onDueChange(task.gid, val);
                }
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>
          {dueDate && (
            <button
              type="button"
              onClick={() => {
                setDueDate(null);
                onDueChange(task.gid, null);
              }}
              aria-label="Clear due date"
              className="border-0 bg-transparent text-fainter hover:text-danger cursor-pointer p-0.5 text-xs font-bold leading-none select-none transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-semibold text-[10px] tracking-wider uppercase text-fainter">
          Created
        </span>
        <span className="font-semibold text-sm text-ink">
          {formatDateLong(task.created_at ? task.created_at.split('T')[0] : null)}
        </span>
      </div>
      <div className="flex flex-col gap-1 min-w-[140px]">
        <span className="font-semibold text-[10px] tracking-wider uppercase text-fainter">
          Projects
        </span>
        <div className="flex flex-wrap gap-1.5 items-center">
          {task.projects && task.projects.length > 0
            ? task.projects.map((p) => {
                const color = projectColors.get(p.gid) ?? '#b8b2a8';
                return (
                  <span
                    key={p.gid}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-panel-alt border border-border text-ink"
                    style={{ borderLeftColor: color, borderLeftWidth: 3 }}
                  >
                    <span className="truncate max-w-[100px]">{p.name}</span>
                    {task.projects.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onRemoveProject(task.gid, p.gid)}
                        className="border-0 bg-transparent text-fainter hover:text-danger cursor-pointer p-0 text-[10px] font-bold leading-none select-none transition-colors"
                        title={`Remove from project ${p.name}`}
                      >
                        ✕
                      </button>
                    )}
                  </span>
                );
              })
            : null}

          {availableProjects.length > 0 && (
            <div className="relative flex items-center">
              <select
                value=""
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    onAddProject(task.gid, val);
                  }
                }}
                className="font-semibold text-[11px] text-accent bg-transparent border border-dashed border-accent hover:bg-[#faf8f4] rounded-full px-2 py-0.5 outline-none cursor-pointer appearance-none"
              >
                <option value="">+ Add Project</option>
                {availableProjects.map((p) => (
                  <option key={p.gid} value={p.gid} className="text-ink font-normal">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-semibold text-[10px] tracking-wider uppercase text-fainter">
          Assignee
        </span>
        <div className="relative flex items-center">
          <select
            value={task.assignee?.gid ?? ''}
            onChange={(e) => {
              const val = e.target.value || null;
              onAssigneeChange(task.gid, val);
            }}
            className={`font-semibold text-[13px] border-0 bg-transparent outline-none p-0 cursor-pointer pr-4 appearance-none ${
              task.assignee?.gid ? 'text-ink' : 'text-danger italic'
            }`}
          >
            <option value="" className="text-danger italic">
              Unassigned
            </option>
            {people.map((p) => (
              <option key={p.gid} value={p.gid} className="text-ink font-normal non-italic">
                {p.name}
              </option>
            ))}
          </select>
          <span className="absolute right-0 pointer-events-none text-[8px] text-fainter">▼</span>
        </div>
      </div>
    </div>
  );

  const descriptionField = (
    <textarea
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
      onBlur={() => notes !== (task.notes ?? '') && onNotesChange(task.gid, notes)}
      placeholder="Add more detail…"
      className="w-full box-border min-h-[74px] resize-y border border-border rounded-[10px] px-3.5 py-2.5 text-sm text-ink outline-none bg-panel-alt"
    />
  );

  const commentList = (
    <>
      {loadingComments && <span className="text-[13px] text-placeholder">Loading…</span>}
      {!loadingComments &&
        comments.map((c, i) => (
          <div key={i} className="flex gap-2.5">
            <span
              className="w-7 h-7 flex-none rounded-full text-white flex items-center justify-center font-semibold text-xs"
              style={{ background: colorForName(c.author) }}
            >
              {c.author[0]}
            </span>
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-[13px] text-ink">{c.author}</span>
                <span className="font-medium text-[11px] text-fainter">{c.time}</span>
              </div>
              <span className="text-sm leading-relaxed text-ink-soft">
                {renderCommentText(c.text, c.htmlText)}
              </span>
            </div>
          </div>
        ))}
      {!loadingComments && comments.length === 0 && !commentError && (
        <span className="text-[13px] text-placeholder">No comments yet.</span>
      )}
      {commentError && <span className="text-[13px] font-medium text-danger">{commentError}</span>}
    </>
  );

  const commentInput = (
    <input
      type="text"
      value={newComment}
      onChange={(e) => setNewComment(e.target.value)}
      onKeyDown={submitComment}
      placeholder="Write a comment…"
      className="flex-1 min-w-0 border border-border rounded-full px-3.5 py-2.5 text-sm text-ink outline-none bg-panel"
    />
  );

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-panel flex flex-col">
        <div className="flex-none bg-panel-alt border-b border-border px-3 pb-3.5 pt-[calc(env(safe-area-inset-top)+14px)] flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="border-0 bg-transparent text-accent font-semibold text-[15px] cursor-pointer px-1 py-1.5"
          >
            ‹ Tasks
          </button>
        </div>
        <div className="flex-1 overflow-auto px-4.5 pt-5 pb-7 flex flex-col gap-5">
          <div className="flex items-start gap-3">
            <button
              type="button"
              aria-label="toggle complete"
              onClick={() => onToggle(task.gid, !done)}
              className={`w-[26px] h-[26px] flex-none mt-0.5 rounded-lg border-2 flex items-center justify-center cursor-pointer ${
                done ? 'bg-accent border-accent' : 'bg-panel border-border'
              }`}
            >
              {done && (
                <span className="w-[7px] h-3 border-white border-solid border-r-[2.5px] border-b-[2.5px] rotate-[43deg] -mt-0.5" />
              )}
            </button>
            <h2
              className={`flex-1 min-w-0 m-0 font-bold text-xl leading-snug ${
                done ? 'text-fainter line-through' : 'text-ink'
              }`}
            >
              {task.name}
            </h2>
          </div>

          {(!task.projects || task.projects.length === 0) && (
            <div className="bg-[#fffbeb] border border-[#fef3c7] text-[#b45309] text-xs font-medium px-3.5 py-2.5 rounded-lg flex items-start gap-2">
              <span className="text-base leading-none">⚠️</span>
              <span>
                This task has no projects. Without a project, it is not visible to anyone else.
              </span>
            </div>
          )}

          {metaFields}

          <div className="flex flex-col gap-2.5">
            <span className="font-semibold text-[10px] tracking-wider uppercase text-fainter">
              Description
            </span>
            {descriptionField}
          </div>

          <div className="flex flex-col gap-3.5">
            <span className="font-semibold text-[10px] tracking-wider uppercase text-fainter">
              {comments.length ? `Comments · ${comments.length}` : 'Comments'}
            </span>
            {commentList}
            <div className="flex gap-2.5 items-center mt-0.5">{commentInput}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[rgba(43,41,38,0.34)] flex items-start justify-center py-14 px-5 overflow-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[560px] bg-panel rounded-2xl shadow-[0_24px_60px_rgba(40,32,20,0.28)] overflow-hidden"
      >
        <div className="flex items-start gap-3.5 px-6.5 pt-6 pb-4.5 border-b border-border-soft">
          <button
            type="button"
            aria-label="toggle complete"
            onClick={() => onToggle(task.gid, !done)}
            className={`w-[26px] h-[26px] flex-none mt-0.5 rounded-lg border-2 flex items-center justify-center cursor-pointer ${
              done ? 'bg-accent border-accent' : 'bg-panel border-border'
            }`}
          >
            {done && (
              <span className="w-[7px] h-3 border-white border-solid border-r-[2.5px] border-b-[2.5px] rotate-[43deg] -mt-0.5" />
            )}
          </button>
          <h2
            className={`flex-1 min-w-0 mt-0.5 font-bold text-xl ${
              done ? 'text-fainter line-through' : 'text-ink'
            }`}
          >
            {task.name}
          </h2>
          <button
            type="button"
            aria-label="close"
            onClick={onClose}
            className="flex-none w-[30px] h-[30px] border-0 bg-[#f3efe8] rounded-lg text-muted hover:bg-border hover:text-ink text-base cursor-pointer"
          >
            ✕
          </button>
        </div>

        {(!task.projects || task.projects.length === 0) && (
          <div className="mx-6.5 mt-4 bg-[#fffbeb] border border-[#fef3c7] text-[#b45309] text-xs font-medium px-3.5 py-2.5 rounded-lg flex items-start gap-2">
            <span className="text-base leading-none">⚠️</span>
            <span>
              This task has no projects. Without a project, it is not visible to anyone else.
            </span>
          </div>
        )}

        <div className="px-6.5 py-4.5 border-b border-border-soft">{metaFields}</div>

        <div className="px-6.5 py-5 border-b border-border-soft flex flex-col gap-2.5">
          <span className="font-semibold text-[10px] tracking-wider uppercase text-fainter">
            Description
          </span>
          {descriptionField}
        </div>

        <div className="px-6.5 pt-5 pb-6 flex flex-col gap-3.5">
          <span className="font-semibold text-[10px] tracking-wider uppercase text-fainter">
            {comments.length ? `Comments · ${comments.length}` : 'Comments'}
          </span>
          {commentList}
          <div className="flex gap-2.5 items-center mt-0.5">{commentInput}</div>
        </div>
      </div>
    </div>
  );
}

function domToReact(node, key) {
  if (node.nodeType === 3) {
    return node.nodeValue;
  }
  if (node.nodeType !== 1) {
    return null;
  }

  const tagName = node.tagName.toLowerCase();
  const children = Array.from(node.childNodes).map((child, i) => domToReact(child, `${key}-${i}`));

  switch (tagName) {
    case 'body':
      return <Fragment key={key}>{children}</Fragment>;
    case 'strong':
    case 'b':
      return (
        <strong key={key} className="font-bold text-ink">
          {children}
        </strong>
      );
    case 'em':
    case 'i':
      return (
        <em key={key} className="italic">
          {children}
        </em>
      );
    case 'u':
      return (
        <u key={key} className="underline">
          {children}
        </u>
      );
    case 's':
    case 'del':
    case 'strike':
      return (
        <span key={key} className="line-through text-fainter">
          {children}
        </span>
      );
    case 'code':
      return (
        <code
          key={key}
          className="bg-panel-alt/50 px-1 py-0.5 rounded font-mono text-[13px] text-danger border border-border-soft"
        >
          {children}
        </code>
      );
    case 'pre':
      return (
        <pre
          key={key}
          className="bg-panel-alt/30 p-2 rounded font-mono text-xs text-ink overflow-x-auto my-1 border border-border-soft leading-normal"
        >
          {children}
        </pre>
      );
    case 'p':
      return (
        <p key={key} className="my-1">
          {children}
        </p>
      );
    case 'br':
      return <br key={key} />;
    case 'ul':
      return (
        <ul key={key} className="list-disc pl-5 my-1">
          {children}
        </ul>
      );
    case 'ol':
      return (
        <ol key={key} className="list-decimal pl-5 my-1">
          {children}
        </ol>
      );
    case 'li':
      return (
        <li key={key} className="my-0.5">
          {children}
        </li>
      );
    case 'a': {
      const href = node.getAttribute('href');
      const type = node.getAttribute('data-asana-type');
      const gid = node.getAttribute('data-asana-gid');

      if (type === 'user') {
        return (
          <span
            key={key}
            className="inline-flex items-center px-1.5 py-0.5 rounded bg-highlight/60 text-accent font-semibold text-[13px] align-baseline transition-all duration-200 hover:bg-highlight cursor-default"
            title={`User GID: ${gid}`}
          >
            {children}
          </span>
        );
      }

      if (type === 'task') {
        return (
          <span
            key={key}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-panel-alt/60 text-ink-soft font-semibold text-[13px] align-baseline transition-all duration-200 hover:bg-panel-alt cursor-default"
            title={`Task GID: ${gid}`}
          >
            📋 {children}
          </span>
        );
      }

      if (type === 'project') {
        return (
          <span
            key={key}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-panel-alt/60 text-ink-soft font-semibold text-[13px] align-baseline transition-all duration-200 hover:bg-panel-alt cursor-default"
            title={`Project GID: ${gid}`}
          >
            📁 {children}
          </span>
        );
      }

      return (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:text-accent-hover underline"
        >
          {children}
        </a>
      );
    }
    default:
      return <span key={key}>{children}</span>;
  }
}

function renderCommentText(text, htmlText) {
  if (!htmlText) {
    return text;
  }
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    const body = doc.body;
    if (!body || body.childNodes.length === 0) {
      return text;
    }
    return domToReact(body, 'comment-root');
  } catch (err) {
    console.error('Error parsing comment html_text:', err);
    return text;
  }
}
