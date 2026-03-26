import React, { useState, useEffect, useRef } from 'react';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, addDoc, serverTimestamp, getDocs, where, increment } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Search, MessageCircle, Send, User as UserIcon, Clock } from 'lucide-react';
import { User } from '../../types';

interface ChatSession {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  lastMessage: string;
  lastMessageTime: any;
  unreadAdmin: number;
  unreadUser: number;
  updatedAt: any;
}

interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderRole: 'customer' | 'admin_sales';
  createdAt: any;
}

export default function AdminChat({ user }: { user: User }) {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'chats'), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatSession[];
      setChats(chatData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'chats'));

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedChat) return;

    // Mark as read
    if (selectedChat.unreadAdmin > 0) {
      updateDoc(doc(db, 'chats', selectedChat.id), {
        unreadAdmin: 0
      }).catch(console.error);
    }

    const q = query(collection(db, `chats/${selectedChat.id}/messages`), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      setMessages(msgs);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `chats/${selectedChat.id}/messages`));

    return () => unsubscribe();
  }, [selectedChat?.id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    const text = newMessage.trim();
    setNewMessage('');

    try {
      // Add message
      await addDoc(collection(db, `chats/${selectedChat.id}/messages`), {
        text,
        senderId: user.uid,
        senderRole: 'admin_sales',
        createdAt: serverTimestamp()
      });

      // Update chat metadata
      await updateDoc(doc(db, 'chats', selectedChat.id), {
        lastMessage: text,
        lastMessageTime: serverTimestamp(),
        unreadUser: increment(1),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const filteredChats = chats.filter(chat => 
    chat.userName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(date);
  };

  return (
    <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden flex h-[600px]">
      {/* Sidebar */}
      <div className="w-1/3 border-r border-zinc-100 flex flex-col bg-zinc-50/50">
        <div className="p-4 border-b border-zinc-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Cari pelanggan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredChats.length === 0 ? (
            <div className="p-8 text-center text-zinc-400">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Belum ada percakapan</p>
            </div>
          ) : (
            filteredChats.map(chat => (
              <button
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={`w-full p-4 flex items-start gap-3 hover:bg-white transition-colors border-b border-zinc-100/50 text-left ${
                  selectedChat?.id === chat.id ? 'bg-white shadow-sm ring-1 ring-zinc-900/5' : ''
                }`}
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-zinc-200 overflow-hidden flex-shrink-0">
                    {chat.userPhoto ? (
                      <img src={chat.userPhoto} alt={chat.userName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-white">
                        <UserIcon className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  {chat.unreadAdmin > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                      {chat.unreadAdmin}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h4 className="font-bold text-sm text-zinc-900 truncate pr-2">{chat.userName}</h4>
                    <span className="text-[10px] text-zinc-400 flex-shrink-0">{formatTime(chat.lastMessageTime)}</span>
                  </div>
                  <p className={`text-xs truncate ${chat.unreadAdmin > 0 ? 'font-bold text-zinc-900' : 'text-zinc-500'}`}>
                    {chat.lastMessage}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedChat ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-zinc-100 flex items-center gap-3 bg-white">
              <div className="w-10 h-10 rounded-full bg-zinc-200 overflow-hidden">
                {selectedChat.userPhoto ? (
                  <img src={selectedChat.userPhoto} alt={selectedChat.userName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-white">
                    <UserIcon className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-bold text-zinc-900">{selectedChat.userName}</h3>
                <p className="text-xs text-zinc-500">Pelanggan</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-50/30 custom-scrollbar">
              {messages.map((msg) => {
                const isAdmin = msg.senderRole === 'admin_sales';
                return (
                  <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                    <div 
                      className={`max-w-[70%] p-3 rounded-2xl text-sm ${
                        isAdmin 
                          ? 'bg-zinc-900 text-white rounded-tr-sm' 
                          : 'bg-white border border-zinc-200 text-zinc-800 rounded-tl-sm shadow-sm'
                      }`}
                    >
                      {msg.text}
                      <div className={`text-[10px] mt-1 text-right ${isAdmin ? 'text-zinc-400' : 'text-zinc-400'}`}>
                        {formatTime(msg.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 bg-white border-t border-zinc-100 flex gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Ketik balasan..."
                className="flex-1 px-4 py-3 bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/10 rounded-xl text-sm transition-all"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="px-6 py-3 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium text-sm"
              >
                <span>Kirim</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-400">
            <MessageCircle className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm font-medium">Pilih percakapan untuk mulai membalas</p>
          </div>
        )}
      </div>
    </div>
  );
}
