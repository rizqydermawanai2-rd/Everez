import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, User as UserIcon } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, onSnapshot, query, orderBy, addDoc, serverTimestamp, setDoc, updateDoc, increment } from 'firebase/firestore';
import { User } from '../types';

interface ChatWidgetProps {
  user: User | null;
  onLoginClick?: () => void;
}

interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderRole: 'customer' | 'admin_sales';
  createdAt: any;
}

export default function ChatWidget({ user, onLoginClick }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || user.role !== 'customer') return;

    const chatRef = doc(db, 'chats', user.uid);
    
    // Listen to chat metadata for unread count
    const unsubscribeChat = onSnapshot(chatRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUnreadCount(data.unreadUser || 0);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `chats/${user.uid}`));

    // Listen to messages
    const messagesRef = collection(db, `chats/${user.uid}/messages`);
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    
    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      setMessages(msgs);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (error) => handleFirestoreError(error, OperationType.GET, `chats/${user.uid}/messages`));

    return () => {
      unsubscribeChat();
      unsubscribeMessages();
    };
  }, [user]);

  useEffect(() => {
    if (isOpen && unreadCount > 0 && user) {
      // Clear unread count when opening chat
      updateDoc(doc(db, 'chats', user.uid), {
        unreadUser: 0
      }).catch(console.error);
    }
  }, [isOpen, unreadCount, user]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const text = newMessage.trim();
    setNewMessage('');

    try {
      const chatRef = doc(db, 'chats', user.uid);
      
      // Ensure chat document exists
      await setDoc(chatRef, {
        userId: user.uid,
        userName: user.name,
        userPhoto: user.photoURL || '',
        lastMessage: text,
        lastMessageTime: serverTimestamp(),
        unreadAdmin: increment(1),
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Add message
      await addDoc(collection(db, `chats/${user.uid}/messages`), {
        text,
        senderId: user.uid,
        senderRole: 'customer',
        createdAt: serverTimestamp()
      });
      
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  if (user && user.role !== 'customer') return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-16 right-0 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-zinc-100 overflow-hidden flex flex-col"
            style={{ height: '500px', maxHeight: 'calc(100vh - 120px)' }}
          >
            {/* Header */}
            <div className="p-4 bg-zinc-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-zinc-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Admin Sales</h3>
                  <p className="text-xs text-zinc-400">Online</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50 custom-scrollbar">
              {!user ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-4 p-6 text-center">
                  <MessageCircle className="w-12 h-12 opacity-50" />
                  <div>
                    <h4 className="font-bold text-zinc-700 mb-1">Halo!</h4>
                    <p className="text-sm">Silakan login terlebih dahulu untuk memulai percakapan dengan admin kami.</p>
                  </div>
                  {onLoginClick && (
                    <button 
                      onClick={() => {
                        setIsOpen(false);
                        onLoginClick();
                      }}
                      className="mt-2 px-6 py-2 bg-zinc-900 text-white rounded-full text-sm font-bold hover:bg-zinc-800 transition-colors"
                    >
                      Login Sekarang
                    </button>
                  )}
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-2">
                  <MessageCircle className="w-8 h-8 opacity-50" />
                  <p className="text-sm">Mulai percakapan dengan admin</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === user.uid;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div 
                        className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                          isMe 
                            ? 'bg-zinc-900 text-white rounded-tr-sm' 
                            : 'bg-white border border-zinc-200 text-zinc-800 rounded-tl-sm shadow-sm'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-3 bg-white border-t border-zinc-100 flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={user ? "Ketik pesan..." : "Login untuk membalas..."}
                disabled={!user}
                className="flex-1 px-4 py-2 bg-zinc-100 border-transparent focus:bg-white focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/10 rounded-full text-sm transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || !user}
                className="p-2 bg-zinc-900 text-white rounded-full hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-zinc-900 text-white rounded-full shadow-xl flex items-center justify-center relative"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold flex items-center justify-center rounded-full border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </motion.button>
    </div>
  );
}
