/**
 * GRAVITAS V1-F-01 — Push-to-Talk & Offline Speech-to-Text Subsystem
 *
 * Security & Privacy Invariants:
 * - Microphone capture must be explicitly user-initiated via Push-to-Talk.
 * - Zero silent background recording.
 * - Zero silent model downloads.
 * - Zero cloud audio egress.
 * - If no local STT model is installed, returns an honest setup message without
 *   falsely claiming transcription succeeded, keeping text commands operational.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { randomUUID } from 'node:crypto'

export type VoicePttState = 'IDLE' | 'LISTENING' | 'PROCESSING'

export type SttSetupStatus = 'READY' | 'MODEL_NOT_INSTALLED'

export interface VoiceSttStatusProjection {
  readonly pttState: VoicePttState
  readonly activeSessionId: string | null
  readonly sttStatus: SttSetupStatus
  readonly engineName: 'whisper.cpp-offline'
  readonly expectedModelPath: string
  readonly modelInstalled: boolean
  readonly setupMessage: string
  readonly cloudAudioSent: false
  readonly silentDownloadPerformed: false
}

export interface PttSessionStartResult {
  readonly started: boolean
  readonly pttSessionId: string
  readonly pttState: VoicePttState
  readonly visibleIndicatorText: string
  readonly sttStatus: SttSetupStatus
}

export interface PttTranscriptionResult {
  readonly success: boolean
  readonly transcribed: boolean
  readonly pttSessionId: string
  readonly status: 'TRANSCRIBED' | 'STT_MODEL_NOT_INSTALLED' | 'CANCELLED' | 'INVALID_SESSION'
  readonly transcript?: string | undefined
  readonly setupMessage: string
  readonly cloudAudioSent: false
  readonly silentDownloadPerformed: false
}

export type LocalOfflineTranscriberFn = (audioPayload?: string) => Promise<string> | string

export class OfflineVoiceController {
  private readonly dataRoot: string
  private readonly expectedModelPath: string
  private readonly customLocalTranscriber?: LocalOfflineTranscriberFn | undefined
  private pttState: VoicePttState = 'IDLE'
  private activeSessionId: string | null = null

  public constructor(opts: {
    readonly dataRoot: string
    readonly customLocalTranscriber?: LocalOfflineTranscriberFn | undefined
  }) {
    this.dataRoot = path.resolve(opts.dataRoot)
    this.expectedModelPath = path.join(this.dataRoot, 'stt-models', 'ggml-base.en.bin')
    this.customLocalTranscriber = opts.customLocalTranscriber
  }

  public isModelInstalled(): boolean {
    if (this.customLocalTranscriber) {
      return true
    }
    try {
      return fs.existsSync(this.expectedModelPath) && fs.statSync(this.expectedModelPath).size > 0
    } catch {
      return false
    }
  }

  public getStatus(): VoiceSttStatusProjection {
    const installed = this.isModelInstalled()
    return {
      pttState: this.pttState,
      activeSessionId: this.activeSessionId,
      sttStatus: installed ? 'READY' : 'MODEL_NOT_INSTALLED',
      engineName: 'whisper.cpp-offline',
      expectedModelPath: this.expectedModelPath,
      modelInstalled: installed,
      setupMessage: installed
        ? `Offline STT model ready at ${this.expectedModelPath}. Hold or click Push-to-Talk to speak.`
        : `Offline STT model is not installed. Optional setup: place a local Whisper ggml model at "${this.expectedModelPath}". No audio is ever sent to cloud providers, and no models are downloaded silently. Text commands work immediately.`,
      cloudAudioSent: false,
      silentDownloadPerformed: false,
    }
  }

  /**
   * Starts a Push-to-Talk listening session.
   * Rejects any non-user-initiated invocation to prevent silent microphone capture.
   */
  public startPushToTalk(userInitiated: boolean): PttSessionStartResult {
    if (userInitiated !== true) {
      throw new Error('Silent microphone capture is forbidden: Push-to-Talk requires explicit userInitiated=true')
    }

    const sessionId = `ptt_${randomUUID()}`
    this.activeSessionId = sessionId
    this.pttState = 'LISTENING'
    const installed = this.isModelInstalled()

    return {
      started: true,
      pttSessionId: sessionId,
      pttState: 'LISTENING',
      visibleIndicatorText: 'LISTENING — Microphone active (User-initiated Push-to-Talk)',
      sttStatus: installed ? 'READY' : 'MODEL_NOT_INSTALLED',
    }
  }

  /**
   * Stops Push-to-Talk and performs local offline transcription if an offline model is present.
   * Never falsely claims transcription succeeded when no model is installed.
   */
  public async stopPushToTalk(params: {
    readonly pttSessionId: string
    readonly audioSampleBase64?: string | undefined
  }): Promise<PttTranscriptionResult> {
    if (!this.activeSessionId || params.pttSessionId !== this.activeSessionId) {
      this.pttState = 'IDLE'
      this.activeSessionId = null
      return {
        success: false,
        transcribed: false,
        pttSessionId: params.pttSessionId || '',
        status: 'INVALID_SESSION',
        setupMessage: 'No matching active Push-to-Talk session.',
        cloudAudioSent: false,
        silentDownloadPerformed: false,
      }
    }

    this.pttState = 'PROCESSING'
    const sessionId = this.activeSessionId

    try {
      if (!this.isModelInstalled()) {
        return {
          success: false,
          transcribed: false,
          pttSessionId: sessionId,
          status: 'STT_MODEL_NOT_INSTALLED',
          setupMessage: this.getStatus().setupMessage,
          cloudAudioSent: false,
          silentDownloadPerformed: false,
        }
      }

      if (this.customLocalTranscriber) {
        const transcript = (await this.customLocalTranscriber(params.audioSampleBase64)).trim()
        return {
          success: true,
          transcribed: true,
          pttSessionId: sessionId,
          status: 'TRANSCRIBED',
          transcript,
          setupMessage: 'Transcribed locally via offline speech engine.',
          cloudAudioSent: false,
          silentDownloadPerformed: false,
        }
      }

      // If model file exists on disk without a bound native whisper binary, report honest setup step
      return {
        success: false,
        transcribed: false,
        pttSessionId: sessionId,
        status: 'STT_MODEL_NOT_INSTALLED',
        setupMessage: `Model file detected at "${this.expectedModelPath}", but local whisper.cpp runtime binary is not configured. Text commands remain fully operational.`,
        cloudAudioSent: false,
        silentDownloadPerformed: false,
      }
    } finally {
      this.pttState = 'IDLE'
      this.activeSessionId = null
    }
  }

  public cancelPushToTalk(): void {
    this.pttState = 'IDLE'
    this.activeSessionId = null
  }
}
