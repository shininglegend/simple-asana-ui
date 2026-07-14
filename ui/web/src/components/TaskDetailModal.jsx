import { useEffect, useState } from 'react';
import { formatDateLong, isOverdue } from '../lib/format.js';
import { colorForName } from '../lib/colors.js';
import { getStories, addComment } from '../lib/api.js';

export default function TaskDetailModal({
  task,
  projectColor,
  onClose,
  onToggle,
  onNotesChange,
  isMobile,
}) {
  const [notes, setNotes] = useState(task.notes ?? '');
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentError, setCommentError] = useState(null);

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
  const overdue = isOverdue(task.due_on, done);
  const assigneeName = task.assignee?.name;
  const projectName = task.projects?.[0]?.name ?? '';

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
          text,
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
        <span className={`font-semibold text-sm ${overdue ? 'text-danger' : 'text-ink'}`}>
          {formatDateLong(task.due_on)}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-semibold text-[10px] tracking-wider uppercase text-fainter">
          Created
        </span>
        <span className="font-semibold text-sm text-ink">
          {formatDateLong(task.created_at ? task.created_at.split('T')[0] : null)}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-semibold text-[10px] tracking-wider uppercase text-fainter">
          Project
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: projectColor ?? '#b8b2a8' }}
          />
          <span className="font-semibold text-[13px] text-ink">{projectName}</span>
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-semibold text-[10px] tracking-wider uppercase text-fainter">
          Assignee
        </span>
        <span
          className={`font-semibold text-[13px] ${assigneeName ? 'text-ink' : 'text-fainter italic'}`}
        >
          {assigneeName ?? 'Unassigned'}
        </span>
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
              <span className="text-sm leading-relaxed text-ink-soft">{c.text}</span>
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
      className="flex-1 min-w-0 border border-border rounded-full px-3.5 py-2.5 text-sm text-ink outline-none bg-white"
    />
  );

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
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
                done ? 'bg-accent border-accent' : 'bg-white border-[#cfc8bd]'
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
        className="w-full max-w-[560px] bg-white rounded-2xl shadow-[0_24px_60px_rgba(40,32,20,0.28)] overflow-hidden"
      >
        <div className="flex items-start gap-3.5 px-6.5 pt-6 pb-4.5 border-b border-border-soft">
          <button
            type="button"
            aria-label="toggle complete"
            onClick={() => onToggle(task.gid, !done)}
            className={`w-[26px] h-[26px] flex-none mt-0.5 rounded-lg border-2 flex items-center justify-center cursor-pointer ${
              done ? 'bg-accent border-accent' : 'bg-white border-[#cfc8bd]'
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
