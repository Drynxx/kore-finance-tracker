import React from 'react';
import { motion } from 'framer-motion';
import { KoreAIContainer } from './kore-ai/KoreAIContainer';

const AIAssistantModal = ({ onClose }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />

            {/* Container - Bottom Sheet on Mobile, Modal on Desktop */}
            <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative w-full md:w-[500px] h-[85vh] md:h-[800px] max-h-[90vh] overflow-hidden rounded-t-[2rem] md:rounded-[2rem] shadow-2xl ring-1 ring-white/10"
            >
                <KoreAIContainer onClose={onClose} />
            </motion.div>
        </div>
    );
};

export { AIAssistantModal };

