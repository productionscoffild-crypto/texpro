import { FormEvent, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../store';
import { IconChat, IconMic, IconPaperclip, IconSend, IconStop, IconUser } from './ui/Icon';
import { useToast } from './ui/Toast';
import { t } from '../i18n';

type Channel =
  | { id: 'general'; scope: 'general'; title: string; subtitle: string; toUserId?: undefined }
  | { id: string; scope: 'direct'; title: string; subtitle: string; toUserId: string };

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

export default function ChatPage() {
  const { users, currentUser, chatMessages, sendChatMessage, sendVoiceMessage, sendFileMessage, editChatMessage, language } = useAppStore();
  const { toast } = useToast();
  const me = currentUser();
  const owner = users.find(u => u.role === 'owner');
  const employees = users.filter(u => u.role === 'employee' && u.active);
  const [activeChannelId, setActiveChannelId] = useState('general');
  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSec, setRecordingSec] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const channels: Channel[] = useMemo(() => {
    const base: Channel[] = [
      { id: 'general', scope: 'general', title: t(language, 'generalChat'), subtitle: t(language, 'managementAndManagers') },
    ];

    if (!me) return base;

    if (me.role === 'owner') {
      return [
        ...base,
        ...employees.map(emp => ({
          id: `direct-${emp.id}`,
          scope: 'direct' as const,
          title: emp.name,
          subtitle: emp.email,
          toUserId: emp.id,
        })),
      ];
    }

    if (owner) {
      return [
        ...base,
        {
          id: `direct-${owner.id}`,
          scope: 'direct',
          title: t(language, 'management'),
          subtitle: owner.email,
          toUserId: owner.id,
        },
      ];
    }

    return base;
  }, [employees, me, owner, language]);

  const activeChannel = channels.find(ch => ch.id === activeChannelId) ?? channels[0];
  const userById = (id: string) => users.find(u => u.id === id);

  const visibleMessages = chatMessages
    .filter(message => {
      if (!me) return false;
      if (activeChannel.scope === 'general') return message.scope === 'general';
      return (
        message.scope === 'direct' &&
        ((message.fromUserId === me.id && message.toUserId === activeChannel.toUserId) ||
          (message.fromUserId === activeChannel.toUserId && message.toUserId === me.id))
      );
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    sendChatMessage({
      scope: activeChannel.scope,
      toUserId: activeChannel.scope === 'direct' ? activeChannel.toUserId : undefined,
      text,
    });
    setText('');
  };

  const startEdit = (id: string, currentText: string) => {
    setEditingId(id);
    setEditingText(currentText);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  const saveEdit = () => {
    if (!editingId || !editingText.trim()) return;
    editChatMessage(editingId, editingText);
    cancelEdit();
    toast(t(language, 'edited'), 'success');
  };

  const stopTimer = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const cleanupRecording = () => {
    stopTimer();
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    setIsRecording(false);
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast(t(language, 'browserNoVoice'), 'error');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      setRecordingSec(0);
      recordingStartedAtRef.current = Date.now();

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = event => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const reader = new FileReader();
        const duration = Math.max(1, Math.round((Date.now() - recordingStartedAtRef.current) / 1000));

        reader.onloadend = () => {
          sendVoiceMessage({
            scope: activeChannel.scope,
            toUserId: activeChannel.scope === 'direct' ? activeChannel.toUserId : undefined,
            audioDataUrl: String(reader.result),
            durationSec: duration,
          });
          toast(t(language, 'voiceSent'), 'success');
        };

        reader.readAsDataURL(blob);
        cleanupRecording();
      };

      recorder.start();
      setIsRecording(true);
      timerRef.current = window.setInterval(() => setRecordingSec(sec => sec + 1), 1000);
    } catch {
      toast(t(language, 'micNoAccess'), 'error');
      cleanupRecording();
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
    }
  };

  const formatFileSize = (bytes = 0) => {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast(t(language, 'fileTooBig'), 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      sendFileMessage({
        scope: activeChannel.scope,
        toUserId: activeChannel.scope === 'direct' ? activeChannel.toUserId : undefined,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        fileDataUrl: String(reader.result),
      });
      toast(t(language, 'fileSent'), 'success');
    };
    reader.onerror = () => toast(t(language, 'fileAttachError'), 'error');
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto anim-fade-up">
      <div>
        <h1 className="text-[22px] font-bold text-gray-900">{t(language, 'chat')}</h1>
        <p className="text-[14px] text-gray-500 mt-0.5">{t(language, 'chatSubtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 min-h-[620px]">
        <aside className="card overflow-hidden h-fit lg:h-full">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-[15px] font-bold text-gray-900">{t(language, 'dialogs')}</p>
          </div>
          <div className="p-3 space-y-2 max-h-[260px] lg:max-h-none overflow-auto">
            {channels.map(channel => {
              const active = channel.id === activeChannel.id;
              return (
                <button
                  key={channel.id}
                  onClick={() => setActiveChannelId(channel.id)}
                  className={`w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${active ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-gray-700'}`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${active ? 'bg-blue-100' : 'bg-slate-100'}`}>
                    {channel.scope === 'general' ? <IconChat size={16} /> : <IconUser size={16} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold truncate">{channel.title}</p>
                    <p className="text-[12px] opacity-65 truncate">{channel.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="card overflow-hidden flex flex-col min-h-[620px]">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div>
              <p className="text-[16px] font-bold text-gray-900">{activeChannel.title}</p>
              <p className="text-[12px] text-gray-400 mt-0.5">{activeChannel.subtitle}</p>
            </div>
          </div>

          <div className="flex-1 bg-slate-50/60 p-4 overflow-y-auto space-y-3">
            {visibleMessages.length === 0 ? (
              <div className="h-full min-h-[360px] flex flex-col items-center justify-center text-gray-400 text-center">
                <IconChat size={42} />
                <p className="mt-3 text-[14px] font-medium">{t(language, 'noMessages')}</p>
                <p className="mt-1 text-[12px]">{t(language, 'firstMessage')}</p>
              </div>
            ) : (
              visibleMessages.map(message => {
                const mine = message.fromUserId === me?.id;
                const author = userById(message.fromUserId);
                return (
                  <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[78%] rounded-2xl px-4 py-3 shadow-sm ${mine ? 'bg-blue-600 text-white rounded-br-md' : 'bg-white text-gray-900 rounded-bl-md'}`}>
                      <div className={`text-[11px] mb-1 ${mine ? 'text-blue-100' : 'text-gray-400'}`}>
                        {author?.name || 'Пользователь'} · {fmtTime(message.createdAt)}
                      </div>
                      {(message.kind ?? 'text') === 'voice' ? (
                        <div className="flex items-center gap-3 min-w-[240px]">
                          <audio controls src={message.audioDataUrl} className="h-9 max-w-[220px]" />
                          <span className={`text-[12px] ${mine ? 'text-blue-100' : 'text-gray-400'}`}>
                            {message.durationSec || 1}с
                          </span>
                        </div>
                      ) : message.kind === 'file' ? (
                        <div className="space-y-2 min-w-[220px] max-w-[320px]">
                          {message.fileType?.startsWith('image/') && message.fileDataUrl ? (
                            <a href={message.fileDataUrl} download={message.fileName} target="_blank" rel="noreferrer">
                              <img src={message.fileDataUrl} alt={message.fileName} className="max-h-48 rounded-xl object-cover" />
                            </a>
                          ) : null}
                          <a
                            href={message.fileDataUrl}
                            download={message.fileName}
                            className={`flex items-center gap-2 rounded-xl px-3 py-2 ${mine ? 'bg-white/15 text-white' : 'bg-slate-50 text-gray-800'}`}
                          >
                            <IconPaperclip size={16} />
                            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{message.fileName}</span>
                            <span className={`text-[11px] shrink-0 ${mine ? 'text-blue-100' : 'text-gray-400'}`}>{formatFileSize(message.fileSize)}</span>
                          </a>
                        </div>
                      ) : editingId === message.id ? (
                        <div className="space-y-2 min-w-[260px]">
                          <textarea
                            className="input min-h-[86px] resize-none text-gray-900"
                            value={editingText}
                            onChange={e => setEditingText(e.target.value)}
                            autoFocus
                          />
                          <div className="flex justify-end gap-2">
                            <button type="button" className="btn btn-secondary btn-sm" onClick={cancelEdit}>Отмена</button>
                            <button type="button" className="btn btn-primary btn-sm" onClick={saveEdit} disabled={!editingText.trim()}>Сохранить</button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">{message.text}</p>
                          <div className={`mt-1 flex items-center gap-2 text-[11px] ${mine ? 'text-blue-100' : 'text-gray-400'}`}>
                            {message.editedAt && <span>{t(language, 'edited')}</span>}
                            {mine && (
                              <button type="button" className="underline underline-offset-2 opacity-80 hover:opacity-100" onClick={() => startEdit(message.id, message.text)}>
                                {t(language, 'edit')}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={submit} className="p-4 border-t border-slate-100 bg-white flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            />
            <input
              className="input flex-1"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={isRecording ? `${t(language, 'recording')} ${recordingSec}с` : t(language, 'messagePlaceholder')}
              disabled={isRecording}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-secondary btn-icon shrink-0"
              aria-label="Прикрепить файл"
              title="Прикрепить файл"
            >
              <IconPaperclip size={17} />
            </button>
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`btn btn-icon shrink-0 ${isRecording ? 'btn-danger' : 'btn-secondary'}`}
              aria-label={isRecording ? 'Остановить запись' : 'Записать голосовое'}
              title={isRecording ? 'Остановить и отправить' : 'Записать голосовое'}
            >
              {isRecording ? <IconStop size={17} /> : <IconMic size={17} />}
            </button>
            <button className="btn btn-primary btn-icon shrink-0" type="submit" disabled={!text.trim()} aria-label="Отправить сообщение" title="Отправить сообщение">
              <IconSend size={17} />
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}