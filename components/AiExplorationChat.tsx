import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Case, ChatMessage, InterventionMoment } from '../types';
import { createExplorationChat } from '../services/geminiService';
import { Chat } from '@google/genai';
import { IoSendOutline } from 'react-icons/io5';

interface AiExplorationChatProps {
    caseData: Case;
    moment: InterventionMoment;
}

const AiExplorationChat: React.FC<AiExplorationChatProps> = ({ caseData, moment }) => {
    const [chat, setChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Memoize chat initialization to avoid re-creating it on every render
    const memoizedChat = useMemo(() => {
        return createExplorationChat(caseData, moment);
    }, [caseData, moment]);

    useEffect(() => {
        // This effect runs when caseData or moment changes.
        // It sets the new chat instance and resets the state for the new conversation.
        setChat(memoizedChat);
        setMessages([]);
        setIsLoading(false);
    }, [memoizedChat]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading || !chat) return;

        const userMessage: ChatMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage, { role: 'model', content: '' }]);
        setInput('');
        setIsLoading(true);

        try {
            const stream = await chat.sendMessageStream({ message: input });
            let currentModelMessage = '';

            for await (const chunk of stream) {
                currentModelMessage += chunk.text;
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = { role: 'model', content: currentModelMessage };
                    return newMessages;
                });
            }
        } catch (error) {
            console.error("Failed to send message to AI:", error);
            setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = { role: 'model', content: 'Error al obtener respuesta.' };
                return newMessages;
            });
        } finally {
            setIsLoading(false);
        }
    };

    const renderMessage = (msg: ChatMessage, index: number) => {
        const isUser = msg.role === 'user';
        const isLastModelMessage = msg.role === 'model' && index === messages.length - 1 && isLoading;

        return (
            <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xl px-4 py-2 rounded-lg ${isUser ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-800'}`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {isLastModelMessage && <span className="inline-block w-2 h-4 bg-slate-600 animate-pulse ml-1" />}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-[400px]">
            <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                {messages.length === 0 && !isLoading && (
                    <div className="text-center text-slate-500 p-4 rounded-lg bg-slate-100 border border-slate-200">
                        <p className="font-semibold">Chat de Exploración listo.</p>
                        <p className="text-sm mt-1">Puedes iniciar la conversación preguntando sobre áreas a explorar en la fase de <span className="font-semibold">{moment}</span>.</p>
                    </div>
                )}
                {messages.map(renderMessage)}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Escribe tu pregunta aquí..."
                    className="flex-grow px-4 py-2 text-base border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    className="bg-teal-600 text-white w-10 h-10 rounded-lg hover:bg-teal-700 flex items-center justify-center transition-colors disabled:bg-slate-400"
                    disabled={isLoading || !input.trim()}
                    aria-label="Enviar mensaje"
                    title="Enviar mensaje"
                >
                    <IoSendOutline className="text-xl" />
                </button>
            </form>
        </div>
    );
};

export default AiExplorationChat;