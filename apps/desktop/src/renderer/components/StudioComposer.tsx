import React, { useState } from 'react'
import { ArrowUp, Mic, MicOff, Sparkles, Send } from 'lucide-react'

export interface StudioComposerProps {
  onSendMessage: (text: string) => void
  onVoiceToggle?: () => void
  isListening?: boolean
  isExecuting?: boolean
  isReducedMotion?: boolean
}

export const StudioComposer: React.FC<StudioComposerProps> = ({
  onSendMessage,
  onVoiceToggle,
  isListening = false,
  isExecuting = false,
}) => {
  const [input, setInput] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isExecuting) return
    onSendMessage(input.trim())
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        width: '100%',
        maxWidth: '680px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: '#181B1E',
          border: '1px solid #2B3036',
          borderRadius: '12px',
          padding: '8px 14px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        }}
      >
        {/* Push-to-Talk Mic Toggle */}
        <button
          type="button"
          onClick={onVoiceToggle}
          title={isListening ? 'Stop listening' : 'Push-to-Talk (Windows System.Speech)'}
          style={{
            background: isListening ? '#E07A5F' : 'transparent',
            color: isListening ? '#FFF' : '#8E949B',
            border: 'none',
            borderRadius: '8px',
            padding: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
          }}
        >
          {isListening ? <Mic size={16} /> : <MicOff size={16} />}
        </button>

        {/* Text Input */}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything, run a command, or say 'What's due today?'..."
          disabled={isExecuting}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#EDEAE3',
            fontSize: '13.5px',
            fontFamily: 'inherit',
          }}
        />

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!input.trim() || isExecuting}
          aria-label="Submit command"
          style={{
            background: input.trim() && !isExecuting ? '#F4A261' : '#252A30',
            color: input.trim() && !isExecuting ? '#121518' : '#686E74',
            border: 'none',
            borderRadius: '8px',
            width: '30px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: input.trim() && !isExecuting ? 'pointer' : 'default',
            transition: 'all 0.15s ease',
          }}
        >
          <ArrowUp size={16} strokeWidth={2.5} />
        </button>
      </div>
    </form>
  )
}
