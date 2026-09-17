import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Search,
  MessageSquare,
  Video,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';
import { UserAccount } from '../../types';
import { getStoredToken } from '../../utils/authClient';

interface Friend {
  id: string;
  friendId: string;
  friendUsername: string;
  friendDisplayName: string;
  onlineStatus?: 'ONLINE' | 'AWAY' | 'OFFLINE';
  avatarUrl?: string;
  tradingStyle?: string;
  since: string;
}

interface FriendRequest {
  id: string;
  senderId: string;
  senderUsername: string;
  senderDisplayName: string;
  receiverId: string;
  receiverUsername: string;
  receiverDisplayName: string;
  createdAt: string;
}

interface UserSearchResult {
  id: string;
  username: string;
  name?: string;
  role?: string;
}

interface FriendSystemProps {
  currentUser?: UserAccount | null;
  onStartPrivateChat: (friend: { id: string; username: string; displayName: string }) => void;
  onStartCall?: (friend: { id: string; username: string; displayName: string }) => void;
}

export const FriendSystem: React.FC<FriendSystemProps> = ({
  currentUser,
  onStartPrivateChat,
  onStartCall,
}) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [friendsError, setFriendsError] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'FRIENDS' | 'REQUESTS' | 'FIND'>('FRIENDS');

  const showNotice = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(null), 3500);
  };

  const fetchFriends = async () => {
    if (!currentUser) {
      setIsLoadingFriends(false);
      return;
    }
    const token = getStoredToken();
    try {
      const res = await fetch('/api/friends/list', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends || []);
        setIncomingRequests(data.incomingRequests || []);
        setOutgoingRequests(data.outgoingRequests || []);
        setFriendsError(null);
      } else {
        const body = await res.json().catch(() => ({}));
        setFriendsError(body.error || `Failed to load friends (${res.status})`);
      }
    } catch (err) {
      console.error('Error fetching friends:', err);
      setFriendsError('Network error loading friends list.');
    } finally {
      setIsLoadingFriends(false);
    }
  };

  useEffect(() => {
    fetchFriends();
    const interval = setInterval(fetchFriends, 8000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleSearchUsers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    if (!currentUser) {
      showNotice('Please login to search traders.');
      return;
    }
    setIsSearching(true);
    const token = getStoredToken();
    try {
      const res = await fetch(`/api/friends/search?q=${encodeURIComponent(searchQuery.trim())}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.users || []);
        if (!(data.users || []).length) {
          showNotice(`No traders matched "${searchQuery.trim()}".`);
        }
      } else {
        const body = await res.json().catch(() => ({}));
        showNotice(body.error || 'Search failed.');
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Search error:', err);
      showNotice('Network error during search.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async (targetUser: UserSearchResult) => {
    if (!currentUser) {
      showNotice('Please login to send friend requests.');
      return;
    }
    if (targetUser.id === currentUser.id) {
      showNotice('Cannot send a friend request to yourself.');
      return;
    }
    const token = getStoredToken();
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          targetUserId: targetUser.id,
          targetUsername: targetUser.username,
          targetDisplayName: targetUser.name || targetUser.username,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        showNotice(`Friend request sent to @${targetUser.username}`);
        fetchFriends();
      } else {
        showNotice(data.error || 'Failed to send request');
      }
    } catch (err) {
      showNotice('Network error sending request');
    }
  };

  const handleRespondRequest = async (requestId: string, status: 'ACCEPTED' | 'REJECTED') => {
    const token = getStoredToken();
    try {
      const res = await fetch('/api/friends/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ requestId, status }),
      });
      if (res.ok) {
        showNotice(status === 'ACCEPTED' ? 'Friend request accepted!' : 'Request declined.');
        fetchFriends();
      } else {
        const body = await res.json().catch(() => ({}));
        showNotice(body.error || 'Error responding to request');
      }
    } catch (err) {
      showNotice('Error responding to request');
    }
  };

  const handleRemoveFriend = async (friendshipId: string, friendUsername: string) => {
    const token = getStoredToken();
    try {
      const res = await fetch('/api/friends/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ requestId: friendshipId, status: 'REMOVED' }),
      });
      if (res.ok) {
        showNotice(`Removed @${friendUsername} from friends.`);
        fetchFriends();
      }
    } catch (err) {
      showNotice('Error removing friend');
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <span className="text-[10px] font-military font-bold text-amber-400 uppercase tracking-widest">
            TRADER NETWORK & PEERS
          </span>
          <h3 className="text-base font-military font-bold text-slate-100 mt-0.5">
            Friends & Tactical Contacts
          </h3>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Connect with verified traders, share setups in private, and initiate video chart reviews.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono-code">
          <button
            onClick={() => setActiveTab('FRIENDS')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'FRIENDS'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Friends ({friends.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('REQUESTS')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 relative ${
              activeTab === 'REQUESTS'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Requests</span>
            {incomingRequests.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center -mr-1">
                {incomingRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('FIND')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'FIND'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Traders</span>
          </button>
        </div>
      </div>

      {statusNotice && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs font-mono-code text-amber-300">
          {statusNotice}
        </div>
      )}

      {activeTab === 'FRIENDS' && (
        <div className="space-y-3">
          {friendsError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-mono-code text-rose-300">
              {friendsError}
            </div>
          )}
          {isLoadingFriends ? (
            <div className="py-12 text-center text-slate-400 font-mono-code text-xs space-y-3">
              <RefreshCw className="w-8 h-8 mx-auto text-amber-400 animate-spin opacity-70" />
              <p>Loading friends…</p>
            </div>
          ) : friends.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-mono-code text-xs space-y-3">
              <Users className="w-10 h-10 mx-auto text-slate-600" />
              <p>No trading friends added yet.</p>
              <button
                onClick={() => setActiveTab('FIND')}
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-military font-bold text-xs"
              >
                FIND & ADD TRADERS
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {friends.map((f) => (
                <div
                  key={f.id}
                  className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      {f.avatarUrl ? (
                        <img
                          src={f.avatarUrl}
                          alt={f.friendDisplayName}
                          className="w-10 h-10 rounded-full object-cover border border-amber-500/40"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 font-bold font-military">
                          {f.friendDisplayName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
                          f.onlineStatus === 'AWAY'
                            ? 'bg-amber-400'
                            : f.onlineStatus === 'OFFLINE'
                            ? 'bg-slate-500'
                            : 'bg-emerald-400'
                        }`}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-bold font-mono-code text-slate-200 truncate">
                        {f.friendDisplayName}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono-code block truncate">
                        @{f.friendUsername}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() =>
                        onStartPrivateChat({
                          id: f.friendId,
                          username: f.friendUsername,
                          displayName: f.friendDisplayName,
                        })
                      }
                      title="Direct Private Message"
                      className="p-2 rounded-lg bg-slate-900 hover:bg-amber-500/10 text-slate-300 hover:text-amber-400 border border-slate-800 transition cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>

                    {onStartCall && (
                      <button
                        onClick={() =>
                          onStartCall({
                            id: f.friendId,
                            username: f.friendUsername,
                            displayName: f.friendDisplayName,
                          })
                        }
                        title="Start Video / Screen Share Call"
                        className="p-2 rounded-lg bg-slate-900 hover:bg-sky-500/10 text-slate-300 hover:text-sky-400 border border-slate-800 transition cursor-pointer"
                      >
                        <Video className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => handleRemoveFriend(f.id, f.friendUsername)}
                      title="Remove Friend"
                      className="p-2 rounded-lg bg-slate-900 hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 border border-slate-800 transition cursor-pointer"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'REQUESTS' && (
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-military font-bold text-slate-300 uppercase tracking-wider mb-2">
              Incoming Friend Requests ({incomingRequests.length})
            </h4>
            {incomingRequests.length === 0 ? (
              <p className="text-xs font-mono-code text-slate-500 py-3">No pending incoming requests.</p>
            ) : (
              <div className="space-y-2">
                {incomingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3 font-mono-code text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-200">{req.senderDisplayName}</span>
                      <span className="text-slate-500 text-[10px] block">@{req.senderUsername}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRespondRequest(req.id, 'ACCEPTED')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center gap-1 text-xs cursor-pointer transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>
                      <button
                        onClick={() => handleRespondRequest(req.id, 'REJECTED')}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-800 flex items-center gap-1 text-xs cursor-pointer transition"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Decline</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-800 pt-3">
            <h4 className="text-xs font-military font-bold text-slate-400 uppercase tracking-wider mb-2">
              Outgoing Sent Requests ({outgoingRequests.length})
            </h4>
            {outgoingRequests.length === 0 ? (
              <p className="text-xs font-mono-code text-slate-500 py-2">No pending outgoing requests.</p>
            ) : (
              <div className="space-y-2">
                {outgoingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between font-mono-code text-xs text-slate-400"
                  >
                    <span>Sent to: <strong className="text-slate-300">@{req.receiverUsername}</strong></span>
                    <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      Pending Approval
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'FIND' && (
        <div className="space-y-4">
          <form onSubmit={handleSearchUsers} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by username or trader name..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono-code text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-military font-bold text-xs cursor-pointer transition"
            >
              {isSearching ? 'SEARCHING...' : 'SEARCH'}
            </button>
          </form>

          {searchResults.length > 0 ? (
            <div className="space-y-2">
              {searchResults.map((u) => {
                const isAlreadyFriend = friends.some((f) => f.friendId === u.id);
                const hasSentRequest = outgoingRequests.some((r) => r.receiverId === u.id);

                return (
                  <div
                    key={u.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3 font-mono-code text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-200">{u.name || u.username}</span>
                      <span className="text-slate-500 text-[10px] block">@{u.username}</span>
                    </div>

                    <div>
                      {isAlreadyFriend ? (
                        <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                          Already Friends
                        </span>
                      ) : hasSentRequest ? (
                        <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                          Request Pending
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(u)}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer transition flex items-center gap-1"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : searchQuery && !isSearching ? (
            <p className="text-xs font-mono-code text-slate-500 py-4 text-center">
              No matching registered traders found for "{searchQuery}".
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
};
