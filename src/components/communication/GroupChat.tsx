import React, { useEffect, useMemo, useState } from 'react';
import { MessageSquare, Plus, Send, UserPlus, Users, X } from 'lucide-react';
import { UserAccount } from '../../types';

type Friend = { friendId: string; friendUsername: string; friendDisplayName: string };

type Group = { id: string; name: string; ownerId?: string; role?: string };

type GroupMessage = {
  id: string;
  sender_id: string;
  text_content: string;
  created_at: string;
};

type GroupMember = {
  userId: string;
  username: string;
  displayName: string;
  role: string;
};

interface GroupChatProps {
  currentUser?: UserAccount | null;
  friends: Friend[];
}

export const GroupChat: React.FC<GroupChatProps> = ({ currentUser, friends }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  const loadGroups = async () => {
    try {
      const res = await fetch('/api/groups', { credentials: 'include', cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setGroups(data.groups || []);
      if (activeGroup) {
        const fresh = (data.groups || []).find((g: Group) => g.id === activeGroup.id);
        if (fresh) setActiveGroup(fresh);
      }
    } catch {}
  };

  const loadActiveGroup = async () => {
    if (!activeGroup) return;
    try {
      const [messageRes, memberRes] = await Promise.all([
        fetch('/api/groups/' + encodeURIComponent(activeGroup.id) + '/messages', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/groups/' + encodeURIComponent(activeGroup.id) + '/members', { credentials: 'include', cache: 'no-store' }),
      ]);
      if (messageRes.ok) {
        const data = await messageRes.json();
        setMessages(data.messages || []);
      }
      if (memberRes.ok) {
        const data = await memberRes.json();
        setMembers(data.members || []);
      }
    } catch {}
  };

  useEffect(() => {
    loadGroups();
    const timer = window.setInterval(loadGroups, 5000);
    return () => window.clearInterval(timer);
  }, [currentUser?.id]);

  useEffect(() => {
    if (!activeGroup) return;
    loadActiveGroup();
    const timer = window.setInterval(loadActiveGroup, 1000);
    return () => window.clearInterval(timer);
  }, [activeGroup?.id]);

  const createGroup = async () => {
    if (!name.trim() || selected.length === 0) {
      setNotice('Enter a group name and select at least one friend.');
      return;
    }
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), memberIds: selected }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not create group.');
      setName('');
      setSelected([]);
      setShowCreate(false);
      setNotice('Group created.');
      await loadGroups();
      if (data.group) setActiveGroup(data.group);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not create group.');
    }
  };

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = text.trim();
    if (!activeGroup || !value) return;
    setText('');
    try {
      const res = await fetch('/api/groups/' + encodeURIComponent(activeGroup.id) + '/messages', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Message could not be sent.');
      setMessages((prev) => [...prev.filter((m) => m.id !== data.message?.id), data.message].sort((a, b) => a.created_at.localeCompare(b.created_at)));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Message could not be sent.');
    }
  };

  const addMember = async (userId: string) => {
    if (!activeGroup) return;
    try {
      const res = await fetch('/api/groups/' + encodeURIComponent(activeGroup.id) + '/members', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not add member.');
      await loadActiveGroup();
      setNotice('Member added.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not add member.');
    }
  };

  const availableToAdd = useMemo(
    () => friends.filter((friend) => !members.some((member) => member.userId === friend.friendId)),
    [friends, members]
  );

  if (!currentUser) {
    return <div className="p-8 text-center text-xs font-mono-code text-slate-500">Login required for group chat.</div>;
  }

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl min-h-[70vh] flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-cyan-400" />
          <div>
            <div className="text-sm font-military font-bold text-slate-100">GROUP CHAT</div>
            <div className="text-[10px] text-slate-500 font-mono-code">Private groups for your accepted contacts</div>
          </div>
        </div>
        <button type="button" onClick={() => setShowCreate((v) => !v)} className="px-3 py-1.5 rounded-lg bg-blue-500 text-slate-950 text-xs font-bold flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> New group
        </button>
      </div>

      {notice && <div className="p-2.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 text-xs">{notice}</div>}

      {showCreate && (
        <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/70 space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name" className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {friends.map((friend) => (
              <label key={friend.friendId} className="flex items-center gap-2 p-2 rounded-lg border border-slate-800 text-xs text-slate-300">
                <input type="checkbox" checked={selected.includes(friend.friendId)} onChange={() => setSelected((prev) => prev.includes(friend.friendId) ? prev.filter((id) => id !== friend.friendId) : [...prev, friend.friendId])} />
                <span className="truncate">{friend.friendDisplayName} <span className="text-slate-500">@{friend.friendUsername}</span></span>
              </label>
            ))}
          </div>
          <button type="button" onClick={createGroup} className="px-3 py-2 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold">Create group</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-3 flex-1 min-h-0">
        <div className="border border-slate-800 rounded-xl p-2 space-y-1 overflow-y-auto">
          {groups.length === 0 ? <div className="p-4 text-center text-xs text-slate-500">No groups yet.</div> : groups.map((group) => (
            <button key={group.id} type="button" onClick={() => setActiveGroup(group)} className={'w-full text-left p-3 rounded-lg text-xs ' + (activeGroup?.id === group.id ? 'bg-blue-500/15 text-cyan-300 border border-blue-500/30' : 'text-slate-300 hover:bg-slate-900 border border-transparent')}>
              <div className="font-bold truncate">{group.name}</div>
              <div className="text-[9px] text-slate-500 mt-0.5">{group.role || 'MEMBER'}</div>
            </button>
          ))}
        </div>

        <div className="border border-slate-800 rounded-xl overflow-hidden flex flex-col min-h-0">
          {!activeGroup ? (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-500"><MessageSquare className="w-5 h-5 mr-2" /> Select a group.</div>
          ) : (
            <>
              <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                <div><div className="font-bold text-sm text-slate-100">{activeGroup.name}</div><div className="text-[10px] text-slate-500">{members.length} members</div></div>
                <button type="button" onClick={() => setShowMembers((v) => !v)} className="p-2 rounded-lg border border-slate-800 text-slate-400"><UserPlus className="w-4 h-4" /></button>
              </div>
              {showMembers && (
                <div className="p-3 border-b border-slate-800 bg-slate-900/70 space-y-2 max-h-48 overflow-y-auto">
                  {members.map((member) => <div key={member.userId} className="flex items-center justify-between text-xs text-slate-300"><span>{member.displayName} <span className="text-slate-500">@{member.username}</span></span><span className="text-[9px] text-slate-500">{member.role}</span></div>)}
                  {['OWNER','ADMIN'].includes(activeGroup.role || '') && availableToAdd.map((friend) => (
                    <button key={friend.friendId} type="button" onClick={() => addMember(friend.friendId)} className="w-full flex items-center gap-2 p-2 rounded-lg border border-dashed border-slate-700 text-xs text-cyan-300"><Plus className="w-3 h-3" /> Add @{friend.friendUsername}</button>
                  ))}
                </div>
              )}
              <div className="flex-1 p-3 overflow-y-auto space-y-2">
                {messages.map((message) => {
                  const mine = message.sender_id === currentUser.id;
                  const sender = members.find((member) => member.userId === message.sender_id);
                  return <div key={message.id} className={'max-w-[80%] p-2.5 rounded-xl border text-xs ' + (mine ? 'ml-auto bg-blue-500/10 border-blue-500/30' : 'mr-auto bg-slate-900 border-slate-800')}>
                    {!mine && <div className="text-[9px] text-cyan-400 mb-1">@{sender?.username || message.sender_id}</div>}
                    <div className="whitespace-pre-wrap break-words text-slate-200">{message.text_content}</div>
                  </div>;
                })}
              </div>
              <form onSubmit={sendMessage} className="p-2 border-t border-slate-800 flex gap-2">
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message group..." className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100" />
                <button type="submit" className="p-2 rounded-lg bg-blue-500 text-slate-950"><Send className="w-4 h-4" /></button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
