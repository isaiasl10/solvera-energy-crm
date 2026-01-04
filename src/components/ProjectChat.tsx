import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Send, MessageCircle, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type Message = {
  id: string;
  customer_id: string;
  user_id: string;
  message: string;
  mentions?: string[];
  created_at: string;
  user_name?: string;
};

type User = {
  id: string;
  full_name: string;
};

type ProjectChatProps = {
  customerId: string;
};

export default function ProjectChat({ customerId }: ProjectChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [improving, setImproving] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionPosition, setMentionPosition] = useState(0);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadMessages();
    loadUsers();

    const subscription = supabase
      .channel(`project_messages:${customerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_messages',
          filter: `customer_id=eq.${customerId}`,
        },
        () => {
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [customerId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('id, full_name')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from('project_messages')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      const userIds = [...new Set(messagesData?.map(m => m.user_id) || [])];
      const { data: usersData } = await supabase
        .from('app_users')
        .select('id, full_name')
        .in('id', userIds);

      const usersMap = new Map(usersData?.map(u => [u.id, u.full_name]) || []);

      const messagesWithNames = messagesData?.map(msg => ({
        ...msg,
        user_name: usersMap.get(msg.user_id) || 'Unknown User',
      })) || [];

      setMessages(messagesWithNames);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    const cursorPosition = e.target.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    if (atIndex !== -1 && atIndex === textBeforeCursor.length - 1) {
      setShowMentionDropdown(true);
      setMentionSearch('');
      setMentionPosition(atIndex);
      setSelectedMentionIndex(0);
    } else if (atIndex !== -1) {
      const searchTerm = textBeforeCursor.slice(atIndex + 1);
      if (!/\s/.test(searchTerm)) {
        setShowMentionDropdown(true);
        setMentionSearch(searchTerm);
        setMentionPosition(atIndex);
        setSelectedMentionIndex(0);
      } else {
        setShowMentionDropdown(false);
      }
    } else {
      setShowMentionDropdown(false);
    }
  };

  const handleMentionSelect = (selectedUser: User) => {
    const beforeMention = newMessage.slice(0, mentionPosition);
    const afterMention = newMessage.slice(mentionPosition + mentionSearch.length + 1);
    const newValue = `${beforeMention}@${selectedUser.full_name} ${afterMention}`;
    setNewMessage(newValue);
    setShowMentionDropdown(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMentionDropdown) {
      const filteredUsers = getFilteredUsers();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev < filteredUsers.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'Enter' && filteredUsers.length > 0) {
        e.preventDefault();
        handleMentionSelect(filteredUsers[selectedMentionIndex]);
      } else if (e.key === 'Escape') {
        setShowMentionDropdown(false);
      }
    }
  };

  const getFilteredUsers = () => {
    if (!mentionSearch) return users;
    const search = mentionSearch.toLowerCase();
    return users.filter(u => u.full_name.toLowerCase().includes(search));
  };

  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@([^\s]+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionedName = match[1];
      const mentionedUser = users.find(u => u.full_name === mentionedName);
      if (mentionedUser) {
        mentions.push(mentionedUser.id);
      }
    }

    return mentions;
  };

  const handleImproveMessage = async () => {
    if (!newMessage.trim()) return;

    setImproving(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/improve-message`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: newMessage }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to improve message');
      }

      const data = await response.json();
      setNewMessage(data.improvedMessage);
    } catch (error) {
      console.error('Error improving message:', error);
      alert('Failed to improve message. Please try again.');
    } finally {
      setImproving(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    setSending(true);
    try {
      const mentions = extractMentions(newMessage);

      const { error } = await supabase
        .from('project_messages')
        .insert([
          {
            customer_id: customerId,
            user_id: user.id,
            message: newMessage.trim(),
            mentions: mentions.length > 0 ? mentions : null,
          },
        ]);

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const renderMessageWithMentions = (text: string) => {
    const parts = text.split(/(@[^\s]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const mentionedName = part.slice(1);
        const mentionedUser = users.find(u => u.full_name === mentionedName);
        if (mentionedUser) {
          return (
            <span key={index} className="font-semibold bg-blue-100 text-blue-800 px-1 rounded">
              {part}
            </span>
          );
        }
      }
      return <span key={index}>{part}</span>;
    });
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } else if (diffInHours < 168) {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-400">Loading messages...</div>
      </div>
    );
  }

  const filteredUsers = getFilteredUsers();

  return (
    <div className="flex flex-col h-[calc(100vh-300px)] bg-white rounded-lg shadow-sm">
      <div className="flex items-center gap-2 p-4 border-b border-gray-200">
        <MessageCircle className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Project Chat</h3>
        <span className="text-sm text-gray-500">({messages.length} messages)</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>No messages yet. Start the conversation!</p>
            <p className="text-xs mt-2">Tip: Use @ to mention team members</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isCurrentUser = user?.id === msg.user_id;
            return (
              <div
                key={msg.id}
                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    isCurrentUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className={`text-xs font-semibold ${
                      isCurrentUser ? 'text-blue-100' : 'text-gray-600'
                    }`}>
                      {isCurrentUser ? 'You' : msg.user_name}
                    </span>
                    <span className={`text-xs ${
                      isCurrentUser ? 'text-blue-200' : 'text-gray-500'
                    }`}>
                      {formatTimestamp(msg.created_at)}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {renderMessageWithMentions(msg.message)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
        <div className="relative">
          {showMentionDropdown && filteredUsers.length > 0 && (
            <div className="absolute bottom-full left-0 mb-2 w-64 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
              {filteredUsers.map((u, index) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleMentionSelect(u)}
                  className={`w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors ${
                    index === selectedMentionIndex ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="font-medium text-gray-900">{u.full_name}</div>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a message... (use @ to mention)"
                className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={sending || improving}
              />
              <button
                type="button"
                onClick={handleImproveMessage}
                disabled={!newMessage.trim() || improving || sending}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Improve with AI"
              >
                {improving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </button>
            </div>
            <button
              type="submit"
              disabled={!newMessage.trim() || sending || improving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
